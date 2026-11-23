#!/usr/bin/env python3
import json,zipfile,collections
from pathlib import Path
p=Path('/tmp/dofus-spells')
with zipfile.ZipFile(p/'images-spell.zip') as z:
 names=z.namelist(); print('ZIP_TOTAL',len(names));print('ZIP_NAMES',names[:220]);print('ZIP_TAIL',names[-50:]);print('ZIP_FILES',collections.Counter(x.split('/')[0] for x in names).most_common(20))
d=json.loads((p/'spellsdata.json').read_text())
print('KEYS',list(d.keys()),'OBJECTS_COUNT',len(d.get('objectsById',{})))
print('OBJECT_KEY_ARR',d['objectsById']['m_keys']['Array'][:25])
print('OBJECT_VAL_ARR',d['objectsById']['m_values']['Array'][:3])
ref=d['references']['RefIds']
print('REFCOUNT',len(ref),'FIRST',json.dumps(ref[:3],ensure_ascii=False)[:5200])
for entry in ref[:10]:
 if isinstance(entry.get('data'),dict) and 'nameId' in entry['data']:
  print('SPELL_SAMPLE',json.dumps(entry,ensure_ascii=False)[:5500]);break
