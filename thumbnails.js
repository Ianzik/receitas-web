/* Only project-owned WebP paths are rendered; signed CDN links are never saved. */
const RecipeThumbnails=(()=>{
 const path=value=>typeof value==='string'&&/^assets\/thumbs\/[a-f0-9]{64}\.webp$/.test(value)?value:'';
 const clean=record=>{const {images,...r}=record;return {...r,thumbnail:path(r.thumbnail)};}; // Migration removes obsolete fields from device copies.
 const ready=fetch('./assets/thumbs/manifest.json',{cache:'no-cache'}).then(r=>r.ok?r.json():{}).catch(()=>({}));
 function canonical(value){const u=new URL(value.replace(/[\u200b-\u200d\uFEFF]/g,''));u.hash='';if(/(^|\.)instagram\.com$/.test(u.hostname))u.search='';else{for(const k of [...u.searchParams.keys()])if(k.toLowerCase().startsWith('utm_')||['igshid','fbclid'].includes(k))u.searchParams.delete(k);u.search=u.searchParams.toString();}return u.toString();}
 async function attach(records){const manifest=await ready;return Promise.all(records.map(async record=>{const r=clean(record);if(r.source_url){try{const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical(r.source_url)));const id=[...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('');const current=path(manifest[id]);if(current)r.thumbnail=current;else if(r.thumbnail!==`assets/thumbs/${id}.webp`)r.thumbnail='';}catch{}}return r;}));}
 return {path,clean,attach};
})();
