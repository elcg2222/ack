// Kiểm validator nhận demo project THẬT + từ chối các case hỏng (transpile thật qua vite-node)
import { validateProject, unsupportedRenderTypes } from '/workspace/source/src/core/store/persistence';
import { createDemoProject } from '/workspace/source/src/core/presets/demo';
const p = createDemoProject();
validateProject(structuredClone(p)); // phải không throw
console.log('demo OK');
const badCases = [
  ['schemaVersion', q => q.schemaVersion = 2],
  ['revision', q => q.revision = -1],
  ['updatedAt', q => q.updatedAt = 'hom qua'],
  ['url http', q => q.assets[0] = {...q.assets[0], url:'https://x/y.png'}],
  ['mime sai', q => { const a=q.assets.find(a=>a.type==='image'); a.url='data:text/html,x'; }],
  ['id trung', q => q.assets.push({...q.assets[0]})],
  ['env count', q => q.scenes[0].environment.count = 99999],
  ['activeSceneId', q => q.activeSceneId='nope'],
];
for (const [name, mut] of badCases) {
  const q = structuredClone(p); mut(q);
  try { validateProject(q); console.log('FAIL: should reject', name); process.exit(1); }
  catch(e){ console.log('reject OK:', name, '-', e.message.slice(0,60)); }
}
console.log('unsupportedRenderTypes demo:', JSON.stringify(unsupportedRenderTypes(p)));
