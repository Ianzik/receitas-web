const {chromium}=require('playwright'),{spawn}=require('node:child_process'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const server=spawn('python3',['-m','http.server','8766','--bind','127.0.0.1','--directory',path.resolve(__dirname,'..')]);let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const headers=['Título','Ingredientes','Preparo','Categorias','Rendimento','Tempo','Origem','Favorita','Revisada','Fotos no Drive','ID','Texto original','Avisos','Metadados','Excluída'];let rows=[headers];
  await page.route('**/config.js',r=>r.fulfill({contentType:'application/javascript',body:"window.RECIPE_CONFIG={clientId:'test-client',spreadsheetId:'test-sheet'}"}));
  await page.route('https://accounts.google.com/gsi/client',r=>r.fulfill({contentType:'application/javascript',body:"window.google={accounts:{oauth2:{initTokenClient:o=>({requestAccessToken:()=>o.callback({access_token:'fake-token',expires_in:3600})})}}}"}));
  await page.route('https://sheets.googleapis.com/**',async route=>{const req=route.request();if(req.method()==='OPTIONS'){await route.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'authorization,content-type','access-control-allow-methods':'GET,PUT,POST'}});return;}assert.equal(req.headers().authorization,'Bearer fake-token');if(req.method()==='POST')rows.push(req.postDataJSON().values[0]);if(req.method()==='PUT'){const row=Number(decodeURIComponent(req.url()).match(/A(\d+):O/)[1]);rows[row-1]=req.postDataJSON().values[0];}await route.fulfill({json:{values:rows},headers:{'access-control-allow-origin':'*'}})});
  await page.goto('http://127.0.0.1:8766/');await page.locator('#google-login').click();await page.locator('#main').waitFor({state:'visible'});
  await page.locator('#add').click();await page.locator('#source').fill('Salada teste\nIngredientes\n2 tomates\n1 cebola\nModo de preparo\nCorte os tomates.\nMisture tudo.');await page.locator('#extract-button').click();await page.locator('#edit-title').waitFor({state:'visible'});await page.locator('#edit-reviewed').check();await page.locator('#save-button').click();await page.locator('.card').waitFor();
  await page.locator('[data-favorite]').click();await page.waitForFunction(()=>document.querySelector('#count-favorites').textContent==='1');
  rows[1][0]='Atualizada pelo chat';await page.locator('#refresh').click();await page.getByRole('heading',{name:'Atualizada pelo chat'}).waitFor();
  await page.locator('[data-open]').click();await page.locator('#edit-current').click();rows[1][0]='Alteração externa';await page.locator('#edit-title').fill('Edição antiga');await page.locator('#save-button').click();await page.getByRole('status').filter({hasText:'alterada na planilha'}).waitFor();assert.equal(rows[1][0],'Alteração externa');
  await page.locator('[data-close="edit-dialog"]').click();await page.locator('#refresh').click();await page.getByRole('heading',{name:'Alteração externa'}).waitFor();
  await page.locator('[data-open]').click();page.once('dialog',d=>d.accept());await page.locator('#delete-current').click();await page.waitForFunction(()=>document.querySelector('#count-all').textContent==='0');assert.equal(rows[1][14],true);
  await page.locator('#logout').click();await page.locator('#login').waitFor({state:'visible'});assert.equal(await page.locator('.card').count(),0);assert.equal(await page.locator('#detail').textContent(),'');
  await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);console.log('PASS: Google UI create, favorite, chat refresh, edit conflict, delete, logout, mobile');
 }finally{if(browser)await browser.close();server.kill()}
})().catch(e=>{console.error(e);process.exitCode=1});
