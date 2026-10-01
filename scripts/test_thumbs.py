import importlib.util,json,subprocess,sys,tempfile,unittest
from pathlib import Path
from PIL import Image
spec=importlib.util.spec_from_file_location('thumbs',Path(__file__).with_name('gerar_thumbs.py'));g=importlib.util.module_from_spec(spec);spec.loader.exec_module(g)
class TestThumbs(unittest.TestCase):
 def test_metadata_and_identity(self):
  p=g.Metadata();p.feed('<meta property="og:image" content="https://example.com/photo.jpg?a=1&amp;b=2">');self.assertEqual(p.cover(),'https://example.com/photo.jpg?a=1&b=2')
  self.assertEqual(g.key('https://www.instagram.com/reel/abc/?igshid=a'),g.key('https://www.instagram.com/reel/abc/?utm_source=b'))
 def test_youtube_original_id_and_missing_cover(self):
  self.assertEqual(g.youtube_cover('https://youtu.be/bTqzlkFSWNg?si=abc'),'https://img.youtube.com/vi/bTqzlkFSWNg/hqdefault.jpg')
  self.assertEqual(g.youtube_cover('https://www.youtube.com/watch?v=bTqzlkFSWNg&ab_channel=Comofaz'),g.youtube_cover('https://www.youtube.com/shorts/bTqzlkFSWNg'))
  self.assertEqual(g.youtube_cover('https://example.com/watch?v=bTqzlkFSWNg'),'')
  from unittest.mock import patch
  import io
  data=io.BytesIO();Image.new('RGB',(120,90)).save(data,format='JPEG')
  with tempfile.TemporaryDirectory() as d,patch.object(g,'read',return_value=(data.getvalue(),'https://img.youtube.com/vi/bTqzlkFSWNg/hqdefault.jpg','image/jpeg')):
   with self.assertRaisesRegex(ValueError,'placeholder'):g.generate('https://youtu.be/bTqzlkFSWNg',Path(d),{},2,set())
 def test_verified_source_preserves_original_data(self):
  with tempfile.TemporaryDirectory() as d:
   root=Path(d);cover=root/'cover.png';Image.new('RGB',(900,500),(80,110,65)).save(cover)
   rows=[{'id':'missing','title':'Sem link','source_url':'','ingredients':['um ingrediente']}];inp=root/'input.json';inp.write_text(json.dumps(rows));sources=root/'sources.json';sources.write_text(json.dumps({'missing':'https://example.com/original'}));covers=root/'covers.json';covers.write_text(json.dumps({'https://example.com/original':str(cover)}))
   subprocess.run([sys.executable,str(Path(__file__).with_name('gerar_thumbs.py')),'--input',str(inp),'--output',str(root/'out.json'),'--sources',str(sources),'--covers',str(covers),'--root',str(root),'--review',str(root/'review.json')],check=True,capture_output=True)
   result=json.loads((root/'out.json').read_text())[0];self.assertEqual(result['source_url'],'');self.assertEqual(result['ingredients'],rows[0]['ingredients']);self.assertEqual(result['thumbnail_source_url'],'https://example.com/original');self.assertTrue((root/result['thumbnail']).is_file())
 def test_batch_individual_idempotence_and_fallback(self):
  with tempfile.TemporaryDirectory() as d:
   root=Path(d);cover=root/'cover.png';Image.new('RGB',(900,1300),(80,110,65)).save(cover)
   records=[{'id':'1','title':'Teste','source_url':'https://example.com/recipe','images':['obsolete']},{'id':'2','title':'Sem origem','source_url':''}]
   inp=root/'input.json';inp.write_text(json.dumps(records));mapping=root/'covers.json';mapping.write_text(json.dumps({'https://example.com/recipe':str(cover)}))
   base=[sys.executable,str(Path(__file__).with_name('gerar_thumbs.py')),'--root',str(root),'--review',str(root/'revisar.json')]
   subprocess.run(base+['--input',str(inp),'--output',str(root/'out.json'),'--covers',str(mapping)],check=True,capture_output=True)
   result=json.loads((root/'out.json').read_text());self.assertNotIn('images',result[0]);thumb=root/result[0]['thumbnail'];self.assertLess(thumb.stat().st_size,60000)
   with Image.open(thumb) as im:self.assertEqual(im.format,'WEBP');self.assertEqual(im.size,(640,360))
   self.assertEqual(json.loads((root/'revisar.json').read_text())[0]['reason'],'Sem link de origem')
   original=thumb.read_bytes();run=subprocess.run(base+['--url','https://example.com/recipe'],check=True,capture_output=True,text=True);self.assertIn('existing',run.stdout);self.assertEqual(thumb.read_bytes(),original)
   subprocess.run(base+['--input',str(root/'out.json'),'--output',str(root/'again.json')],check=True,capture_output=True)
   self.assertEqual(json.loads((root/'again.json').read_text())[0]['thumbnail'],result[0]['thumbnail'])
 def test_sheet_source_survives_second_run_without_mapping(self):
  with tempfile.TemporaryDirectory() as d:
   root=Path(d);cover=root/'cover.png';Image.new('RGB',(900,500),(80,110,65)).save(cover)
   source='https://example.com/verified';thumb='assets/thumbs/'+g.key(source)+'.webp';g.save_webp(cover.read_bytes(),root/thumb)
   row=['Receita','','','','','','','','',thumb,'recipe-id','','',json.dumps({'thumbnail':thumb,'thumbnail_source_url':source,'ingredients':['preservar']}),'']
   inp=root/'sheet.json';inp.write_text(json.dumps([['']*15,row]));out=root/'again.json'
   subprocess.run([sys.executable,str(Path(__file__).with_name('gerar_thumbs.py')),'--input',str(inp),'--output',str(out),'--root',str(root),'--review',str(root/'review.json')],check=True,capture_output=True)
   result=json.loads(out.read_text())[1];self.assertEqual(result[9],thumb);self.assertEqual(result[6],'');self.assertEqual(json.loads(result[13])['ingredients'],['preservar']);self.assertEqual(json.loads((root/'review.json').read_text()),[])
if __name__=='__main__':unittest.main()
