/* Parsing and matching shared by the private Google Sheets catalog. */
const RecipeCore = (() => {
  const norm = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/-/g,' ').replace(/\s+/g,' ').trim();
  let groups = {}, patterns = [];
  const ready = (async () => {
    const response = await fetch('./groups.json');
    if (!response.ok) throw Error('Não foi possível carregar os ingredientes. Atualize a página.');
    groups = await response.json();
    patterns = Object.entries(groups).flatMap(([name, aliases]) => aliases.map(alias => [norm(alias), name])).sort((a,b)=>b[0].length-a[0].length);
  })();
  function names(line) {
    let text = norm(line); const found = new Set();
    for (const [alias,name] of patterns) {
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
      const re = new RegExp('(?<![a-z0-9_])'+escaped+'(?![a-z0-9_])','g');
      if (re.test(text)) {found.add(name);text=text.replace(re,' ');}
    }
    return [...found];
  }
  function ingredient(text) {
    text=text.replace(/^[\s•∙●–-]+/,'').trim();
    const found=names(text), options=norm(text).split(/\b(?:ou|or)\b/).map(names);
    return {text,names:found.length?found:[text.replace(/^[\d\s.,/¼½¾⅓⅔⅛]+/,'')||text],optional:/\b(opcional|optional)\b/.test(norm(text)),alternatives:options.length>1&&options.every(x=>x.length)?options:[],recognized:!!found.length,section:''};
  }
  const sectionLabels={molho:'Para o molho',carne:'Para a carne',frango:'Para o frango',massa:'Para a massa',recheio:'Para o recheio',base:'Para a base',montagem:'Para a montagem',caldo:'Para o caldo',pesto:'Para o pesto',salmao:'Para o salmão',legumes:'Para os legumes',bifum:'Para o bifum',almondegas:'Para as almôndegas',coleslaw:'Para o coleslaw',finalizacao:'Para finalizar'};
  const sectionName=s=>String(s||'').trim().replace(/^[^\p{L}\p{N}]+/u,'').replace(/\s*:\s*$/,'');
  const sectionKey=s=>{const key=norm(sectionName(s)).replace(/^para (?:o|a|os|as)\s+/,'');return key==='para finalizar'?'finalizacao':key;};
  function ingredientParts(i){
    let text=String(i.text||'').trim(),section=sectionName(i.section);
    for(let depth=0;depth<5;depth++){const prefix=text.match(/^(.+?)(?::|\s+[–—-]\s+)\s*(.+)$/);if(!prefix)break;
      if(!(section&&sectionKey(prefix[1])===sectionKey(section))&&!sectionLabels[sectionKey(prefix[1])]&&!/^para (?:o|a|os|as)\s+/i.test(prefix[1]))break;
      section=sectionName(prefix[1]);text=prefix[2].replace(/^[\s•*–-]+/,'').trim();
    }
    return {text,section};
  }
  const ingredientSection=i=>ingredientParts(i).section;
  const ingredientText=i=>ingredientParts(i).text;
  function ingredientGroups(ingredients){
    const grouped=new Map();
    for(const i of ingredients){const raw=ingredientSection(i),key=sectionKey(raw);if(!grouped.has(key))grouped.set(key,{section:raw?(sectionLabels[key]||raw):'',items:[]});grouped.get(key).items.push(i);}
    return [...grouped.values()];
  }
  function formatIngredients(ingredients){
    const grouped=ingredientGroups(ingredients),hasSections=grouped.some(g=>g.section);
    return grouped.map(g=>[...(hasSections?[(g.section||'Ingredientes gerais')+':']:[]),...g.items.map(ingredientText)].join('\n')).join('\n\n');
  }
  function parseIngredients(text){
    let section='';const result=[];
    for(const raw of String(text||'').split('\n')){const line=raw.trim();if(!line)continue;
      const heading=sectionName(line),key=sectionKey(heading),inline=line.match(/^(.+?):\s*(.+)$/);
      if(inline&&(sectionLabels[sectionKey(inline[1])]||/^para (?:o|a|os|as)\s+/i.test(inline[1]))){section=sectionName(inline[1]);result.push({...ingredient(inline[2]),section});continue;}
      if(norm(heading)==='ingredientes gerais'){section='';continue;}
      if((/:\s*$/.test(line)&&heading.length<100&&!/^[\d¼½¾⅓⅔⅛]/.test(heading)&&!heading.includes(':'))||(/^para (?:o|a|os|as)\s+/i.test(heading)&&!/[\d:]/.test(heading))||norm(heading)==='para finalizar'){section=heading;continue;}
      result.push({...ingredient(line),section});
    }
    return result;
  }
  function validate(value) {
    if (!value || typeof value!=='object' || typeof value.title!=='string' || !value.title.trim()) throw Error('Receita sem nome.');
    if (!Array.isArray(value.ingredients)||value.ingredients.length>250) throw Error('Lista de ingredientes inválida.');
    const r=structuredClone(value);
    for (const i of r.ingredients) {
      if (!i||typeof i.text!=='string'||!Array.isArray(i.names)||!i.names.length||i.names.some(n=>typeof n!=='string')) throw Error('Ingrediente inválido.');
      if(i.alternatives!==undefined&&(!Array.isArray(i.alternatives)||i.alternatives.some(a=>!Array.isArray(a)||!a.length||a.some(n=>typeof n!=='string')))) throw Error('Alternativas inválidas.');
    }
    for(const k of ['steps','tags','warnings','import_notes']) {r[k]??=[];if(!Array.isArray(r[k])||r[k].some(s=>typeof s!=='string'))throw Error('Campo inválido: '+k);}
    r.source_url=String(r.source_url||'');
    if(r.source_url&&!/^https?:\/\//i.test(r.source_url))throw Error('Use um link http ou https.');
    r.thumbnail=String(r.thumbnail||'');
    if(r.thumbnail&&!/^assets\/thumbs\/[a-f0-9]{64}\.webp$/.test(r.thumbnail))throw Error('Caminho de miniatura inválido.');
    r.id=String(r.id||crypto.randomUUID());
    if(r.reviewed)r.warnings=[...(!r.ingredients.length?['Ingredientes não informados.']:[]),...(!r.steps.length?['Modo de preparo não informado.']:[])];
    if(JSON.stringify(r).length>20000000)throw Error('Receita grande demais.');
    return r;
  }
  function match(r, selected, basics) {
    const canonical = new Map(Object.keys(groups).map(n=>[norm(n),n]));
    const pantry=new Set(selected.map(n=>canonical.get(norm(n))||n));
    if(basics)['sal','pimenta do reino','azeite','óleo','água'].forEach(n=>pantry.add(n));
    const needed=new Set(),found=new Set(),missing=new Set(),choices=new Set();
    for(const i of r.ingredients) {
      if(i.optional)continue;
      const options=i.alternatives?.length?i.alternatives:[i.names];
      const sorted=options.map(a=>[...new Set(a)]).sort((a,b)=>a.filter(n=>!pantry.has(n)).length-b.filter(n=>!pantry.has(n)).length||b.filter(n=>pantry.has(n)).length-a.filter(n=>pantry.has(n)).length);
      const chosen=sorted[0], absent=chosen.filter(n=>!pantry.has(n));
      chosen.forEach(n=>{needed.add(n);if(pantry.has(n))found.add(n)});
      if(options.length>1&&absent.length)choices.add(options.map(a=>a.join(' + ')).join(' ou '));else absent.forEach(n=>missing.add(n));
    }
    const missingList=[...missing,...choices];
    return {matched:[...found],missing:missingList,score:needed.size?Math.round(100*found.size/needed.size):0,complete:!!needed.size&&!missingList.length&&!r.warnings?.length};
  }
  function parse(text,title='') {
    if(!text.trim())throw Error('Cole o texto da receita para organizar.');
    let lines=text.replace(/\r/g,'').split('\n').map(s=>s.trim()).filter(Boolean);
    const ih=s=>/^(ingredientes|ingredients)\b/.test(norm(s).replace(/^[^a-z]+/,''));
    const sh=s=>/^(modo de preparo|modo de fazer|preparo|preparacao|instrucoes|instructions|method|directions)\s*:?$/.test(norm(s));
    if(!title&&!ih(lines[0])&&!sh(lines[0])&&!/^[\d•*-]/.test(lines[0]))title=lines.shift();
    const r={title:title||'Receita sem título',ingredients:[],steps:[],original:text,tags:[],thumbnail:'',warnings:[],reviewed:false,favorite:false,source_url:''};
    let mode='', section='';
    for(const raw of lines) {
      const line=raw.replace(/^[•*–-]\s*/,'');
      if(ih(line)){mode='i';const rest=line.replace(/^.*?(ingredientes|ingredients)\s*:?/i,'').trim();if(/^\d/.test(rest))rest.split(';').forEach(x=>r.ingredients.push(ingredient(x)));continue;}
      if(sh(line)){mode='s';continue;}
      if(norm(line)===norm(title))continue;
      if(/^(rendimento|porcoes|serve|tempo de preparo)\s*:/.test(norm(line))){const [key,...v]=line.split(':');r[norm(key)==='tempo de preparo'?'time':'servings']=v.join(':').trim();continue;}
      if(/^(https?:|#|@)/.test(line))continue;
      if((/^para (o|a|os|as)\b/.test(norm(line))&&!/[\d.,;]/.test(line)&&line.length<100)||norm(sectionName(line))==='para finalizar'){section=sectionName(line);mode='i';continue;}
      const action=/^(?:\d+[.)]?\s*)?(adicione|aqueca|asse|bata|coloque|cozinhe|corte|doure|escorra|ferva|frite|junte|leve|misture|pique|refogue|retire|reserve|sirva|tempere|deixe|derreta|mexa|add|bake|cook|mix|heat|serve)\b/.test(norm(line));
      if(action||mode==='s'){r.steps.push(line.replace(/^\d+[.)]\s*/,''));mode='s';}
      else if(mode==='i'||(/^[\d¼½¾•*-]/.test(raw)&&names(line).length)){r.ingredients.push({...ingredient(line),section});}
    }
    if(!r.ingredients.length)r.warnings.push('Ingredientes não identificados. Consulte o original.');
    if(!r.steps.length)r.warnings.push('Modo de preparo não identificado. Consulte o original.');
    r.warnings.push('Organização simples no navegador. Confira o texto original antes de salvar.');
    return r;
  }
  return {ready,norm,ingredient,ingredientText,ingredientGroups,formatIngredients,parseIngredients,validate,match,parse,get ingredients(){return Object.keys(groups)}};
})();
