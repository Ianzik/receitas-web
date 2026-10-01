#!/usr/bin/env python3
"""Download original covers once, save small local WebP, and migrate private records."""
import argparse, concurrent.futures, hashlib, io, json, re, threading, time
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode, urljoin, quote
from urllib.request import Request, urlopen
from PIL import Image, ImageOps
ROOT=Path(__file__).resolve().parents[1]
LIMIT=60000
lock=threading.Lock(); next_request=0.
def canonical(url):
 p=urlsplit(re.sub('[\u200b-\u200d\ufeff]','',str(url).strip()))
 if p.scheme not in ('http','https') or not p.hostname:raise ValueError('Sem link de origem válido')
 q=[] if p.hostname.lower().endswith('instagram.com') else [(k,v) for k,v in parse_qsl(p.query) if not k.lower().startswith('utm_') and k not in ('igshid','fbclid')]
 return urlunsplit((p.scheme.lower(),p.netloc.lower(),p.path or '/',urlencode(q),''))
def youtube_cover(url):
 p=urlsplit(url);host=(p.hostname or '').lower()
 video=dict(parse_qsl(p.query)).get('v','') if host in ('youtube.com','www.youtube.com','m.youtube.com') else p.path.strip('/') if host=='youtu.be' else ''
 if not video and host in ('youtube.com','www.youtube.com','m.youtube.com') and p.path.startswith(('/shorts/','/embed/')):video=p.path.split('/')[2]
 return 'https://img.youtube.com/vi/'+video+'/hqdefault.jpg' if re.fullmatch(r'[A-Za-z0-9_-]{11}',video) else ''
def key(url):return hashlib.sha256(canonical(url).encode()).hexdigest()
def read(url,delay):
 global next_request
 url=quote(re.sub('[\u200b-\u200d\ufeff]','',url),safe=":/?#[]@!$&'()*+,;=%")
 if urlsplit(url).scheme not in ('http','https'):raise ValueError('Imagem não usa HTTP/HTTPS')
 with lock:
  time.sleep(max(0,next_request-time.monotonic()));next_request=time.monotonic()+delay
 with urlopen(Request(url,headers={'User-Agent':'Mozilla/5.0','Accept':'text/html,image/*;q=0.9,*/*;q=0.8'}),timeout=20) as r:
  data=r.read(12_000_001)
  if len(data)>12_000_000:raise ValueError('Download excede 12 MB')
  return data,r.geturl(),r.headers.get_content_type()
class Metadata(HTMLParser):
 def __init__(self):super().__init__();self.meta={};self.poster=''
 def handle_starttag(self,tag,attrs):
  d=dict(attrs)
  if tag=='meta':self.meta[d.get('property',d.get('name','')).lower()]=d.get('content','')
  if tag=='video':self.poster=d.get('poster',self.poster)
 def cover(self):return next((self.meta.get(k) for k in ('og:image:secure_url','og:image','twitter:image','twitter:image:src') if self.meta.get(k)),self.poster)
def save_webp(data,target):
 with Image.open(io.BytesIO(data)) as raw:
  image=ImageOps.fit(ImageOps.exif_transpose(raw).convert('RGB'),(640,360),Image.Resampling.LANCZOS,centering=(.5,.35))
  for dimensions in ((640,360),(512,288),(384,216)):
   for quality in (82,72,62,52,42):
    out=io.BytesIO();image.resize(dimensions,Image.Resampling.LANCZOS).save(out,format='WEBP',quality=quality,method=6)
    if len(out.getvalue())<LIMIT:
     target.parent.mkdir(parents=True,exist_ok=True);tmp=target.with_suffix('.tmp');tmp.write_bytes(out.getvalue());tmp.replace(target);return len(out.getvalue())
 raise ValueError('Thumb não ficou abaixo de 60 KB')
def generate(url,root,covers,delay,skips):
 relative='assets/thumbs/'+key(url)+'.webp';target=root/relative
 if target.exists():
  try:
   with Image.open(target) as im:
    if im.format=='WEBP' and im.width*9==im.height*16 and target.stat().st_size<LIMIT:return {'thumbnail':relative,'status':'existing','bytes':target.stat().st_size}
  except Exception:pass
 cover=covers.get(url) or covers.get(canonical(url)) or youtube_cover(url)
 if not cover and urlsplit(url).hostname in skips:raise ValueError('Origem com restrição de acesso constatada na execução anterior; não contornada')
 if cover and not cover.startswith(('https://','http://')):data=Path(cover).read_bytes()
 else:
  if not cover:
   source=url;p=urlsplit(url)
   if p.hostname in ('smry.ai','www.smry.ai') and p.path.startswith('/panelinha.com.br/receita/'):source='https://'+p.path.lstrip('/')
   data,final,_=read(source,delay);html=data.decode('utf8','replace');parser=Metadata();parser.feed(html);cover=parser.cover()
   if not cover:
    if re.search('captcha|verify you are human|automated traffic|unusual traffic',html,re.I):raise ValueError('Página apresentou verificação de acesso; não contornada')
    raise ValueError('Página sem og:image, twitter:image ou capa de vídeo')
   cover=urljoin(final,cover)
  data,_,mime=read(cover,delay)
  if not mime.startswith('image/'):
   raise ValueError('Capa retornou '+mime+' em vez de imagem'+(' (Site Unavailable neste ambiente)' if b'Site Unavailable' in data else ''))
 if youtube_cover(url):
  with Image.open(io.BytesIO(data)) as im:
   if im.width<320 or im.height<180:raise ValueError('YouTube retornou placeholder de vídeo indisponível')
 return {'thumbnail':relative,'status':'generated','bytes':save_webp(data,target)}
def write(path,value):
 path=Path(path);path.parent.mkdir(parents=True,exist_ok=True);tmp=path.with_suffix(path.suffix+'.tmp');tmp.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n');tmp.replace(path)
def main():
 ap=argparse.ArgumentParser(description=__doc__)
 ap.add_argument('--input',type=Path);ap.add_argument('--output',type=Path);ap.add_argument('--url');ap.add_argument('--cover-file');ap.add_argument('--covers',type=Path)
 ap.add_argument('--sources',type=Path,help='Mapa privado ID → página original conferida, para origens ausentes ou incorretas')
 ap.add_argument('--review',type=Path,default=Path('revisar.json'));ap.add_argument('--root',type=Path,default=ROOT);ap.add_argument('--workers',type=int,choices=(1,2,3),default=3);ap.add_argument('--delay',type=float,default=2)
 ap.add_argument('--skip-domains',default='',help='Domínios já verificados como bloqueados nesta execução; gera fallback sem insistir')
 a=ap.parse_args()
 if not a.input and not a.url:ap.error('Informe --input ou --url')
 if a.input and not a.output:ap.error('--input exige --output')
 if a.cover_file and not a.url:ap.error('--cover-file exige --url')
 if a.delay<1:ap.error('Pausa mínima: um segundo')
 data=json.loads(a.input.read_text()) if a.input else [];sheet=bool(data and isinstance(data[0],list))
 sources=json.loads(a.sources.read_text()) if a.sources else {}
 records=[{'id':r[10],'title':r[0],'source_url':r[6],'thumbnail_source_url':json.loads(r[13] or '{}').get('thumbnail_source_url','')} for r in data[1:] if r[0] and not r[14]] if sheet else data
 def effective(r):return r.get('source_url','') or sources.get(r.get('id',''),'') or r.get('thumbnail_source_url','')
 def matches(url):
  if not a.url:return True
  try:return canonical(url)==canonical(a.url)
  except ValueError:return url==a.url
 urls=list(dict.fromkeys([a.url] if a.url else [effective(r) for r in records if effective(r)]))
 groups={};aliases={}
 for url in urls:
  try:identity=canonical(url)
  except ValueError:identity=url
  aliases[url]=identity;groups.setdefault(identity,url)
 covers=json.loads(a.covers.read_text()) if a.covers else {}
 if a.cover_file:covers[a.url]=a.cover_file
 results={};skips=set(filter(None,a.skip_domains.split(',')))
 def process(pair):
  identity,url=pair
  try:return identity,generate(url,a.root,covers,a.delay,skips)
  except Exception as e:return identity,{'thumbnail':'','status':'failed','reason':str(e)}
 with concurrent.futures.ThreadPoolExecutor(max_workers=a.workers) as pool:
  for i,(identity,result) in enumerate(pool.map(process,groups.items()),1):
   results[identity]=result;print(f'{i}/{len(groups)}: {result["status"]}',flush=True)
 def outcome(url):
  try:identity=canonical(url)
  except ValueError:identity=url
  return results.get(identity,{'thumbnail':'','status':'failed','reason':'Sem link de origem'})
 review=[]
 for r in records:
  if not matches(effective(r)):continue
  result=outcome(effective(r));r.pop('images',None);r['thumbnail']=result['thumbnail']
  if r.get('id') in sources:r['thumbnail_source_url']=sources[r['id']]
  if not r['thumbnail']:review.append({'id':r.get('id',''),'title':r.get('title',''),'url':r.get('source_url',''),'reason':result['reason']})
 if sheet:
  data[0][9]='Thumb local'
  for r in data[1:]:
   if not r[0]:continue
   meta=json.loads(r[13] or '{}');url=r[6] or sources.get(r[10],'') or meta.get('thumbnail_source_url','')
   if not matches(url):continue
   result=outcome(url);
   if r[10] in sources:meta['thumbnail_source_url']=sources[r[10]]
   meta.pop('images',None);meta['thumbnail']=result['thumbnail'];r[9]=result['thumbnail'];r[13]=json.dumps(meta,ensure_ascii=False,separators=(',',':'))
 if a.output:write(a.output,data)
 if a.url and not records and not outcome(a.url)['thumbnail']:review.append({'url':a.url,'reason':outcome(a.url)['reason']})
 write(a.review,review)
 manifest_path=a.root/'assets/thumbs/manifest.json';manifest=json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
 for identity,result in results.items():
  if result['thumbnail']:manifest[hashlib.sha256(identity.encode()).hexdigest()]=result['thumbnail']
 write(manifest_path,manifest)
 summary={'recipes':len(records),'links':len(groups),'generated':sum(r['status']=='generated' for r in results.values()),'existing':sum(r['status']=='existing' for r in results.values()),'fallbacks':len(review),'bytes':sum(p.stat().st_size for p in (a.root/'assets/thumbs').glob('*.webp'))}
 write(a.review.with_name('thumb-summary.json'),summary);print(json.dumps(summary),flush=True)
if __name__=='__main__':main()
