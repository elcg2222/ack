import type { Asset, Project } from '../types';
const DB='mangamotion-studio', STORE='projects';
function openDB():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore(STORE);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(new Error('Không mở được bộ nhớ trình duyệt. Hãy xuất JSON để lưu dự án.'));});}
export async function saveProject(project:Project){validateProject(project);const db=await openDB();return new Promise<void>((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(project,'current');tx.oncomplete=()=>{db.close();resolve();};tx.onabort=()=>{db.close();reject(tx.error??new Error('Bộ nhớ đầy hoặc bị chặn. Xuất JSON để không mất thay đổi.'));};tx.onerror=()=>{db.close();reject(new Error('Bộ nhớ đầy hoặc bị chặn. Xuất JSON để không mất thay đổi.'));};});}
export async function loadProject():Promise<Project|undefined>{const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly');tx.onabort=()=>{db.close();reject(new Error('Không đọc được bộ nhớ tự động lưu.'));};const r=tx.objectStore(STORE).get('current');r.onsuccess=()=>{db.close();resolve(r.result);};r.onerror=()=>{db.close();reject(r.error);};});}
export function validateProject(data:unknown):Project {
 const p=data as Project;
 const fail=(msg:string):never=>{throw new Error(`Dự án không hợp lệ: ${msg}`);};
 if(!p||typeof p!=='object'||p.schemaVersion!==1)fail('cần schemaVersion = 1.');
 if(typeof p.name!=='string'||!Array.isArray(p.scenes)||!p.scenes.length||!Array.isArray(p.assets))fail('thiếu tên, scenes hoặc assets.');
 const finite=(v:unknown)=>typeof v==='number'&&Number.isFinite(v);
 const vec=(v:unknown)=>Array.isArray(v)&&v.length===3&&v.every(finite);
 const ids=new Set<string>();
 if(typeof p.revision!=='number'||!Number.isInteger(p.revision)||p.revision<0)fail('revision không hợp lệ.');
 if(typeof p.updatedAt!=='string'||Number.isNaN(Date.parse(p.updatedAt)))fail('updatedAt phải là ISO timestamp hợp lệ.');
 const MIME_BY_TYPE:Record<string,string>={image:'image/',svg:'image/svg+xml',audio:'audio/',video:'video/',glb:'model/',vrm:'model/',lottie:'application/json'};
 for(const a of p.assets){if(!a.id||!a.name||typeof a.url!=='string')fail('tài nguyên thiếu id/name/url.');const mime=MIME_BY_TYPE[a.type]??'';if(!(a.url.startsWith(`data:${mime}`)||mime==='image/svg+xml'&&a.url.startsWith('data:image/')))fail(`tài nguyên "${a.name}" phải được nhúng dưới dạng data URI đúng MIME (${a.type}).`);if(ids.has(a.id))fail('ID tài nguyên bị trùng.');ids.add(a.id);}
 const sceneIds=new Set<string>();
 for(const s of p.scenes){
  if(!s.id||sceneIds.has(s.id)||s.mode!=='multiplane25d'||!finite(s.duration)||s.duration<=0||s.duration>3600||!finite(s.fps)||s.fps<=0||!Array.isArray(s.layers)||!Array.isArray(s.cameras)||!s.cameras.length||!s.environment||!s.shader||!Array.isArray(s.shots)||!Array.isArray(s.markers)||s.shots.some(sh=>!sh.id||!finite(sh.start)||!finite(sh.duration)||sh.duration<0)||s.markers.some(m=>!m.id||!finite(m.time)))fail('scene hoặc camera không hợp lệ.');sceneIds.add(s.id);
  const layerIds=new Set<string>();
  for(const l of s.layers){if(!l.id||layerIds.has(l.id)||!vec(l.position)||!vec(l.rotation)||!Array.isArray(l.scale)||l.scale.length!==2||!l.scale.every(finite)||!finite(l.opacity)||!l.tracks)fail('transform của layer không hợp lệ.');layerIds.add(l.id);
   for(const tr of Object.values(l.tracks)){if(!Array.isArray(tr.keys))fail('track bị hỏng.');for(const k of tr.keys)if(!finite(k.time)||!finite(k.value)||!['linear','easeIn','easeOut','easeInOut','step','bezier'].includes(k.easing)||!Array.isArray(k.bezier)||k.bezier.length!==4||!k.bezier.every(finite))fail('keyframe bị hỏng.');}
  }
  for(const c of s.cameras){if(!c.id||!vec(c.position)||!vec(c.target)||!finite(c.fov)||!finite(c.zoom)||!finite(c.roll)||!c.shake||!finite(c.start)||!c.tracks)fail('camera bị hỏng.');for(const tr of Object.values(c.tracks)){if(!Array.isArray(tr.keys))fail('track camera bị hỏng.');for(const k of tr.keys)if(!finite(k.time)||!finite(k.value)||!['linear','easeIn','easeOut','easeInOut','step','bezier'].includes(k.easing))fail('keyframe camera bị hỏng.');}}
  if(!finite(s.environment.count)||s.environment.count<0||s.environment.count>10000||!finite(s.environment.seed))fail('thông số hạt không hợp lệ.');
 }
 if(!sceneIds.has(p.activeSceneId))fail('scene đang chọn không tồn tại.');
 return p;
}
export function downloadBlob(blob:Blob,name:string){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
export async function exportProjectFile(project:Project){downloadBlob(new Blob([JSON.stringify(project,null,2)],{type:'application/json'}),`${project.name.replace(/[^\p{L}\p{N}-]+/gu,'-')}.mangamotion.json`);}
export async function readProjectFile(file:File){if(file.size>80*1024*1024)throw new Error('Tệp vượt quá 80 MB. Hãy giảm dung lượng tài nguyên trước khi nhập.');let data;try{data=JSON.parse(await file.text());}catch{throw new Error('Không đọc được JSON. Tệp có thể bị hỏng hoặc chưa tải xong.');}return validateProject(data);}

export const RENDERABLE_ASSET_TYPES:Asset['type'][]=['image','svg'];
/** Asset types actually used in scenes that the 2.5D stage cannot render yet (warn, don't block open). */
export function unsupportedRenderTypes(project:Project):string[]{
 const used=new Set<string>();
 for(const s of project.scenes)for(const l of s.layers){if(l.assetId)used.add(l.assetId);if(l.scatter)for(const a of l.scatter.assetIds)used.add(a);}
 return [...new Set(project.assets.filter(a=>used.has(a.id)&&!RENDERABLE_ASSET_TYPES.includes(a.type)).map(a=>a.type))];
}
