const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
let rows,writes=0,fail=0;const events=[];
const context=vm.createContext({console,structuredClone,crypto,URL,Blob,Event,setTimeout,window:{RECIPE_CONFIG:{clientId:'test-client',spreadsheetId:'test-sheet'},dispatchEvent:e=>events.push(e.type)},google:{accounts:{oauth2:{initTokenClient:opts=>({requestAccessToken:()=>opts.callback({access_token:'test-token',expires_in:3600})})}}},fetch:async(url,options={})=>{
 if(url==='./groups.json')return {ok:true,json:async()=>JSON.parse(fs.readFileSync(__dirname+'/../groups.json'))};
 assert.equal(options.headers.Authorization,'Bearer test-token');assert(!url.includes('test-token'));
 if(fail)return {ok:false,status:fail};
 if(options.method){writes++;assert(url.includes('valueInputOption=RAW'));const row=JSON.parse(options.body).values[0];if(options.method==='POST')rows.push(row);else{const match=decodeURIComponent(url).match(/A(\d+):O/);rows[Number(match[1])-1]=row;}return {ok:true,json:async()=>({})};}
 return {ok:true,json:async()=>({values:structuredClone(rows)})};
}});
context.window.google=context.google;
vm.runInContext(fs.readFileSync(__dirname+'/../recipe-core.js','utf8')+'\n'+fs.readFileSync(__dirname+'/../google-store.js','utf8')+'\nthis.store=GoogleStore;this.core=RecipeCore;',context);
const api=(...args)=>context.store.api(...args);
(async()=>{
 await context.core.ready;
 const base={id:'test-recipe',title:'Receita teste',ingredients:[{text:'2 ovos',names:['ovo'],optional:false,alternatives:[],recognized:true,section:''}],steps:['Bata.\nAsse.'],images:[],tags:[],warnings:[],original:'Texto original',import_notes:['Nota preservada'],reviewed:false};
 rows=[context.store.HEADERS,context.store.encode(base)];
 await assert.rejects(api('/api/refresh'),/Entre com/);assert.equal(writes,0);
 await api('/api/login');let all=(await api('/api/refresh')).recipes;
 assert.equal(all.length,1);assert.equal(all[0].steps[0],base.steps[0]);
 rows[1][0]='Editada pelo chat';await assert.rejects(api('/api/save',{...all[0],favorite:true}),/alterada na planilha/);assert.equal(writes,0);
 all=(await api('/api/refresh')).recipes;await api('/api/save',{...all[0],favorite:true});assert.equal(rows[1][0],'Editada pelo chat');assert.equal(rows[1][7],true);
 assert.equal(JSON.parse(rows[1][13]).import_notes[0],'Nota preservada');
 rows[1][1]='1 batata';all=(await api('/api/refresh')).recipes;assert.equal(all[0].ingredients[0].names[0],'batata');
 await api('/api/delete',{id:base.id});assert.equal(rows[1][14],true);assert.equal((await api('/api/refresh')).recipes.length,0);
 await api('/api/save',{...base,id:undefined,title:'=literal'});assert.equal(rows[2][0],'=literal');assert(rows[2][10]);
 const before=writes;fail=403;await assert.rejects(api('/api/refresh'),/acesso/);assert.equal(writes,before);
 fail=401;await assert.rejects(api('/api/refresh'),/expirou/);assert.equal((await api('/api/status')).authenticated,false);
 fail=0;await api('/api/login');await api('/api/logout');await assert.rejects(api('/api/search',{}),/Entre com/);
 console.log('PASS: private session, RAW writes, external edits, conflict checks, metadata, recoverable delete, create, API failures, logout');
})().catch(e=>{console.error(e);process.exitCode=1});
