/* Device copy only. Google credentials are never persisted. */
const CatalogCache=(()=>{
 const name='receitas-device:'+location.pathname.replace(/[^/]*$/,'')+':'+window.RECIPE_CONFIG.spreadsheetId;
 const ready=new Promise((resolve,reject)=>{
  if(typeof indexedDB==='undefined'){reject(Error('Armazenamento indisponível.'));return;}
  const r=indexedDB.open(name,2);
  r.onupgradeneeded=()=>{const db=r.result;if(!db.objectStoreNames.contains('cache'))db.createObjectStore('cache');else{const request=r.transaction.objectStore('cache').openCursor();request.onsuccess=()=>{const c=request.result;if(!c)return;if(String(c.key).startsWith('photo:'))c.delete();else if(c.key==='catalog'&&Array.isArray(c.value?.recipes))c.update({...c.value,recipes:c.value.recipes.map(RecipeThumbnails.clean)});c.continue();};}};
  r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
 });
 ready.catch(()=>{});
 async function run(mode,action){const db=await ready;return new Promise((resolve,reject)=>{const tx=db.transaction('cache',mode);let r;tx.oncomplete=()=>resolve(r?.result);tx.onerror=tx.onabort=()=>reject(tx.error||Error('Falha no armazenamento.'));r=action(tx.objectStore('cache'));});}
 return {get:key=>run('readonly',s=>s.get(key)),put:(key,value)=>run('readwrite',s=>s.put(value,key)),clear:()=>run('readwrite',s=>s.clear())};
})();
