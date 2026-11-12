from pathlib import Path
import hashlib, json, sys
w=Path(__file__).resolve().parent
root=Path(sys.argv[1]).resolve()
assert root in [(w/'source').resolve(),(w/'rollback_fixture').resolve()]
p=root/'src/core/shaders/MangaEffect.tsx'
s=json.loads((w/'PATCH_HASHES.json').read_text(encoding='utf-8'))
assert hashlib.sha256(p.read_bytes()).hexdigest()==s['after'], 'CAS: file changed'
original=(w/'MangaEffect.before.tsx').read_bytes()
assert hashlib.sha256(original).hexdigest()==s['before']
p.write_bytes(original)
assert hashlib.sha256(p.read_bytes()).hexdigest()==s['before']
print('ROLLBACK PASS: original_shader_hash_restored; diagnostic_copy_retained')
