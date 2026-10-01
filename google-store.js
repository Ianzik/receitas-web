/* Private Google catalog with a device copy. Tokens remain in memory only. */
const GoogleStore = (() => {
  const HEADERS=['Título','Ingredientes','Preparo','Categorias','Rendimento','Tempo','Origem','Favorita','Revisada','Thumb local','ID','Texto original','Avisos','Metadados','Excluída'];
  let token='',expires=0,records=[],tokenClient,busy=false,epoch=0;
  let hasCache=false,savedAt=0,persistent=true;
  const cache=typeof CatalogCache!=='undefined'?CatalogCache:{get:async()=>null,put:async()=>{},clear:async()=>{}};
  const cacheReady=cache.get('catalog').then(async value=>{if(value?.version===1&&Array.isArray(value.recipes)){records=await RecipeThumbnails.attach(value.recipes);hasCache=true;savedAt=value.savedAt||0;}}).catch(()=>{persistent=false;});
  async function remember(){hasCache=true;savedAt=Date.now();try{await cache.put('catalog',{version:1,recipes:records,savedAt});persistent=true;}catch{persistent=false;}}
  const config=()=>window.RECIPE_CONFIG||{};
  const lines=s=>String(s||'').split('\n').map(s=>s.trim()).filter(Boolean);
  const bool=v=>v===true||/^(true|verdadeiro|sim|1)$/i.test(String(v));
  const canonical=row=>JSON.stringify(Array.from({length:15},(_,i)=>row[i]??''));
  const authenticated=()=>!!token&&Date.now()<expires;
  function clear(){token='';expires=0;records=[];epoch++;}
  function expire(){token='';expires=0;window.dispatchEvent(new Event('recipe-connection-changed'));}
  function configured(){if(!config().clientId||!config().spreadsheetId)throw Error('A conexão Google ainda precisa ser configurada.');}
  async function login(){
    configured();
    if(!window.google?.accounts?.oauth2)throw Error('O login Google ainda está carregando. Tente novamente.');
    return new Promise((resolve,reject)=>{
      tokenClient=google.accounts.oauth2.initTokenClient({client_id:config().clientId,scope:'https://www.googleapis.com/auth/spreadsheets',include_granted_scopes:false,
        callback:r=>{if(r.error){reject(Error('O Google não autorizou o acesso.'));return;}token=r.access_token;expires=Date.now()+(Number(r.expires_in)-60)*1000;resolve({ok:true});},
        error_callback:()=>reject(Error('Não foi possível concluir o login Google. Abra o login novamente.'))});
      tokenClient.requestAccessToken({prompt:''});
    });
  }
  async function request(url,options={}){
    if(!authenticated()){expire();throw Error('Entre com o Google para acessar suas receitas.');}
    const response=await fetch(url,{...options,headers:{Authorization:'Bearer '+token,...(options.body?{'Content-Type':'application/json'}:{}),...options.headers}});
    if(response.status===401){expire();throw Error('Sua sessão expirou. Entre novamente com o Google.');}
    if(!response.ok){const message=response.status===403?'Sua conta não tem acesso à base ou a API Google ainda não foi ativada.':response.status===429?'O Google recebeu muitas solicitações. Aguarde um pouco e tente novamente.':'Não foi possível acessar o Google. Nenhuma confirmação de salvamento foi recebida.';throw Error(message);}
    return response;
  }
  const sheetUrl=()=>`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(config().spreadsheetId)}/values/`;
  async function readRows(){const response=await request(sheetUrl()+encodeURIComponent('Receitas!A1:O')+'?valueRenderOption=UNFORMATTED_VALUE');const {values=[]}=await response.json();if(values[0]?.length!==HEADERS.length||values[0].some((name,i)=>i!==9&&name!==HEADERS[i]))throw Error('As colunas da planilha mudaram. Restaure os nomes do cabeçalho antes de continuar.');return values;}
  function decode(row,index){
    let meta={};try{meta=JSON.parse(row[13]||'{}')}catch{throw Error('Metadados inválidos na linha '+(index+1)+'. Corrija a célula antes de editar a receita.');}
    const ingredientText=String(row[1]||'');
    const ingredients=ingredientText===(meta.ingredients||[]).map(i=>i.text).join('\n')||ingredientText===RecipeCore.formatIngredients(meta.ingredients||[])?meta.ingredients:RecipeCore.parseIngredients(ingredientText);
    const r={...meta,title:String(row[0]||''),ingredients:ingredients||[],steps:lines(row[2]),tags:String(row[3]||'').split(',').map(s=>s.trim()).filter(Boolean),servings:String(row[4]||''),time:String(row[5]||''),source_url:String(row[6]||''),favorite:bool(row[7]),reviewed:bool(row[8]),thumbnail:RecipeThumbnails.path(row[9]),id:String(row[10]||'row:'+index),original:String(row[11]||''),warnings:lines(row[12]),_snapshot:canonical(row)};
    if(String(row[2]||'')===(meta.steps||[]).join('\n'))r.steps=meta.steps||[];
    return r;
  }
  function encode(value,deleted=false){const {_snapshot,...data}=value;const r=RecipeCore.validate(RecipeThumbnails.clean(data));if(r.id.startsWith('row:'))r.id=crypto.randomUUID();return [r.title,RecipeCore.formatIngredients(r.ingredients),r.steps.join('\n'),r.tags.join(', '),r.servings||'',r.time||'',r.source_url||'',!!r.favorite,!!r.reviewed,r.thumbnail||'',r.id,r.original||'',r.warnings.join('\n'),JSON.stringify(r),deleted];}
  async function refresh(){await RecipeCore.ready;const current=epoch,rows=await readRows();const ids=new Set();const list=[];rows.slice(1).forEach((row,i)=>{if(!row[0]||bool(row[14]))return;const r=decode(row,i+1);if(ids.has(r.id))throw Error('Há identificadores de receita duplicados na planilha. Corrija antes de editar.');ids.add(r.id);list.push(r);});if(epoch!==current)throw Error('A sessão foi encerrada.');records=await RecipeThumbnails.attach(list);await remember();return {recipes:structuredClone(records),ingredients:RecipeCore.ingredients};}
  async function save(value,deleted=false){
    if(busy)throw Error('Aguarde o salvamento em andamento.');busy=true;const current=epoch;
    try{
      const rows=await readRows();let index=-1;
      if(value.id){index=value.id.startsWith('row:')?Number(value.id.slice(4)):rows.findIndex((row,i)=>i>0&&String(row[10])===value.id);if(index<1||!rows[index])throw Error('A receita mudou ou foi excluída. Atualize o caderno.');if(!value._snapshot||canonical(rows[index])!==value._snapshot)throw Error('Esta receita foi alterada na planilha. Atualize o caderno e abra a versão mais recente antes de salvar.');}
      const row=encode(value,deleted);
      const path=index>0?encodeURIComponent(`Receitas!A${index+1}:O${index+1}`)+'?valueInputOption=RAW':encodeURIComponent('Receitas!A:O')+':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS';
      await request(sheetUrl()+path,{method:index>0?'PUT':'POST',body:JSON.stringify({values:[row]})});
      if(epoch!==current)throw Error('A sessão foi encerrada. Atualize o caderno após entrar novamente.');const result=decode(row,index>0?index:rows.length);records=records.filter(r=>r.id!==value.id);if(!deleted)records.push(result);await remember();return structuredClone(result);
    }finally{busy=false;}
  }
  async function api(path,data){
    await Promise.all([RecipeCore.ready,cacheReady]);
    if(path==='/api/status')return {authenticated:authenticated(),cached:hasCache,savedAt,persistent,password_required:true};
    if(path==='/api/login')return login();
    if(path==='/api/logout'){clear();hasCache=false;savedAt=0;await cache.clear();return {ok:true};}
    if(!authenticated()&&!hasCache){throw Error('Entre com o Google para acessar suas receitas.');}
    switch(path){
      case '/api/recipes':return hasCache?{recipes:structuredClone(records),ingredients:RecipeCore.ingredients}:refresh();
      case '/api/refresh':return refresh();
      case '/api/search':{let list=records.filter(r=>RecipeCore.norm(r.title+' '+r.tags.join(' ')).includes(RecipeCore.norm(data.query||''))).map(r=>({...r,...RecipeCore.match(r,data.ingredients,data.basics)}));if(data.ingredients.length)list=list.filter(r=>r.matched.some(n=>data.ingredients.some(i=>RecipeCore.norm(i)===RecipeCore.norm(n))));list.sort((a,b)=>(data.ingredients.length?(b.score-a.score||a.missing.length-b.missing.length):0)||a.title.localeCompare(b.title,'pt-BR'));return {recipes:structuredClone(list)};}
      case '/api/save':return save(data);
      case '/api/delete':{const r=records.find(r=>r.id===data.id);if(!r)throw Error('Receita não encontrada.');await save(r,true);return {ok:true};}
      case '/api/normalize':return {ingredients:RecipeCore.parseIngredients(data.text)};
      case '/api/extract':if(data.url)throw Error('Cole o texto da receita. Guarde o link no campo de origem.');return RecipeCore.parse(data.text||'',data.title);
      default:throw Error('Esta função não está disponível na base Google.');
    }
  }
  return {api,HEADERS,decode,encode,connect:()=>authenticated()?Promise.resolve():login()};
})();
