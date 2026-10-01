import importlib.util,json,subprocess,sys,tempfile,unittest
from pathlib import Path
from PIL import Image
spec=importlib.util.spec_from_file_location('thumbs',Path(__file__).with_name('gerar_thumbs.py'));g=importlib.util.module_from_spec(spec);spec.loader.exec_module(g)
class TestThumbs(unittest.TestCase):
 def test_metadata_and_identity(self):
  p=g.Metadata();p.feed('<meta property="og:image" content="https://example.com/photo.jpg?a=1&amp;b=2">');self.assertEqual(p.cover(),'https://example.com/photo.jpg?a=1&b=2')
  self.assertEqual(g.key('https://www.instagram.com/reel/abc/?igshid=a'),g.key('https://www.instagram.com/reel/abc/?utm_source=b'))
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
if __name__=='__main__':unittest.main()
