#!/usr/bin/env python3
"""Importer 57 icônes 2x du client DOFUS 3. Signaler les associations non exactes."""
import re,json,sqlite3,zipfile,io,collections,unicodedata,difflib
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]; TMP=Path('/tmp/dofus-spells');OUT=ROOT/'assets'/'spells'
def norm(s):
 s=''.join(c for c in unicodedata.normalize('NFD',str(s)).lower() if not unicodedata.combining(c))
 return re.sub('[^a-z0-9]+',' ',s).strip()
def game_spells():
 js=(ROOT/'game-full.js').read_text()
 block=js.split('const CLASS_SPELLS={',1)[1].split('const SPELL_BY_ID=',1)[0]
 cls=None;out=[]
 for l in block.splitlines():
  c=re.match(r'^\s+([a-z]+):\[\s*$',l)
  if c:cls=c.group(1);continue
  if cls:
   x=re.search(r'\["([^"]+)","([^"]+)"',l)
   if x:out.append((cls,x.group(1),x.group(2)))
 assert len(out)==57,(len(out),out)
 return out
FALLBACK={
 'iop':'pression','cra':'fleche magique','sacrieur':'assaut','eniripsa':'mot interdit',
 'feca':'attaque naturelle','osamodas':'griffe spectrale','enutrof':'lancer de pieces',
 'sram':'attaque sournoise','xelor':'aiguille','ecaflip':'bluff','sadida':'ronce',
 'pandawa':'poing enflamme','roublard':'explobombe','zobal':'martelo',
 'steamer':'embuscade','eliotrope':'affront','huppermage':'orage',
 'ouginak':'machoire','forgelance':'javelot'}
def main():
 doc=json.loads((TMP/'spellsdata.json').read_text())
 conn=sqlite3.connect('file:'+str(TMP/'dofus.sqlite')+'?mode=ro',uri=True)
 names={int(k):v for k,v in conn.execute("SELECT id,value FROM translations WHERE lang='fr'")}
 spells=[r['data'] for r in doc['references']['RefIds'] if r.get('type',{}).get('class')=='SpellData']
 catalog={};kinds=collections.Counter()
 with zipfile.ZipFile(TMP/'images-spell.zip') as z:
  files=set(z.namelist());choices={}
  for s in spells:
   icon=int(s.get('iconId') or 0); name=names.get(int(s.get('nameId') or 0))
   if name and icon and '2x/sort_'+str(icon)+'.png' in files:
    choices.setdefault(norm(name),[]).append((name,int(s['id']),icon))
  assert len(choices)>300,len(choices)
  for cls,slug,name in game_spells():
   key=norm(name);kind='exact'
   found=choices.get(key)
   if not found:
    close=difflib.get_close_matches(key,list(choices),n=1,cutoff=.83)
    if close:found=choices[close[0]];kind='proche'
   if not found:
    close=difflib.get_close_matches(FALLBACK.get(cls,key),list(choices),n=1,cutoff=.52)
    if close:found=choices[close[0]];kind='illustration'
   kinds[kind if found else 'absent']+=1
   if not found:
    catalog[cls+':'+slug]={'src':None,'mapping':'absent','name':name};continue
   sourceName,spellId,icon=found[0]
   file=OUT/cls/(slug+'.webp');file.parent.mkdir(parents=True,exist_ok=True)
   with Image.open(io.BytesIO(z.read('2x/sort_'+str(icon)+'.png'))) as im:
    img=im.convert('RGBA');img.thumbnail((128,128),Image.Resampling.LANCZOS)
    img.save(file,'WEBP',quality=94,method=5)
   catalog[cls+':'+slug]={'src':'assets/spells/'+cls+'/'+slug+'.webp',
    'mapping':kind,'name':name,'officialName':sourceName,'spellId':spellId,'iconId':icon}
 OUT.mkdir(exist_ok=True,parents=True)
 (OUT/'catalog.json').write_text(json.dumps(catalog,ensure_ascii=False,separators=(',',':'))+'\n')
 (OUT/'README.md').write_text('Icônes du client DOFUS 3, version v6.0_3.7.14.18. '
  'mapping=exact indique le même nom; proche et illustration signalent des '
  'images thématiques quand les capacités idle ne correspondent pas au catalogue officiel.\n')
 assert len(catalog)==57
 assert sum(bool(x.get('src')) for x in catalog.values())>=52,kinds
 print('SPELL ICONS VERIFIED',len(catalog),'MAPPINGS',dict(kinds),
  'IMAGE_BYTES',sum(x.stat().st_size for x in OUT.glob('*/*.webp')),flush=True)
 for k,v in catalog.items():
  if v['mapping']!='exact':print('NON_EXACT',k,v.get('name'),'->',v.get('officialName'),v['mapping'])
if __name__=='__main__':main()
