import type { Project } from '../types';
const DB='mangamotion-studio', STORE='projects';
function openDB():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore(STORE);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(new Error('Không mở được bộ nhớ trình duyệt. Hãy xuất JSON để lưu dự án.'));});}
export async function saveProject(project:Project){const db=await openDB();return new Promise<void>((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(project,'current');tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>{db.close();reject(new Error('Bộ nhớ đầy hoặc bị chặn. Xuất JSON để không mất thay đổi.'));};});}
export async function loadProject():Promise<Project|undefined>{const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly');const r=tx.objectStore(STORE).get('current');r.onsuccess=()=>{db.close();resolve(r.result);};r.onerror=()=>{db.close();reject(r.error);};});}
export function validateProject(data:unknown):Project {
 const p=data as Project;
 const fail=(msg:string):never=>{throw new Error(`Dự án không hợp lệ: ${msg}`);};
 if(!p||typeof p!=='object'||p.schemaVersion!==1)fail('cần schemaVersion = 1.');
 if(typeof p.name!=='string'||!Array.isArray(p.scenes)||!p.scenes.length||!Array.isArray(p.assets))fail('thiếu tên, scenes hoặc assets.');
 const finite=(v:unknown)=>typeof v==='number'&&Number.isFinite(v);
 const vec=(v:unknown)=>Array.isArray(v)&&v.length===3&&v.every(finite);
 const ids=new Set<string>();
 for(const a of p.assets){if(!a.id||!a.name||!/^data:(image\/(png|jpeg|webp|gif|svg\+xml)|audio\/|video\/|model\/|application\/json)/.test(a.url))fail('tài nguyên phải được nhúng dưới dạng data URI.');if(ids.has(a.id))fail('ID tài nguyên bị trùng.');ids.add(a.id);}
 const sceneIds=new Set<string>();
 for(const s of p.scenes){
  if(!s.id||sceneIds.has(s.id)||s.mode!=='multiplane25d'||!finite(s.duration)||s.duration<=0||s.duration>3600||!finite(s.fps)||s.fps<=0||!Array.isArray(s.layers)||!Array.isArray(s.cameras)||!s.cameras.length||!s.environment||!s.shader||!Array.isArray(s.shots)||!Array.isArray(s.markers))fail('scene hoặc camera không hợp lệ.');sceneIds.add(s.id);
  const layerIds=new Set<string>();
  for(const l of s.layers){if(!l.id||layerIds.has(l.id)||!vec(l.position)||!vec(l.rotation)||!Array.isArray(l.scale)||l.scale.length!==2||!l.scale.every(finite)||!finite(l.opacity)||!l.tracks)fail('transform của layer không hợp lệ.');layerIds.add(l.id);
   for(const tr of Object.values(l.tracks)){if(!Array.isArray(tr.keys))fail('track bị hỏng.');for(const k of tr.keys)if(!finite(k.time)||!finite(k.value)||!['linear','easeIn','easeOut','easeInOut','step','bezier'].includes(k.easing)||!Array.isArray(k.bezier)||k.bezier.length!==4||!k.bezier.every(finite))fail('keyframe bị hỏng.');}
  }
  for(const c of s.cameras){if(!vec(c.position)||!vec(c.target)||!finite(c.fov)||!finite(c.zoom)||!finite(c.roll)||!c.shake||!finite(c.start)||!c.tracks)fail('camera bị hỏng.');for(const tr of Object.values(c.tracks))for(const k of tr.keys)if(!finite(k.time)||!finite(k.value))fail('keyframe camera bị hỏng.');}
  if(!finite(s.environment.count)||s.environment.count<0||s.environment.count>10000||!finite(s.environment.seed))fail('thông số hạt không hợp lệ.');
 }
 if(!sceneIds.has(p.activeSceneId))fail('scene đang chọn không tồn tại.');
 return p;
}
export function downloadBlob(blob:Blob,name:string){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
export async function exportProjectFile(project:Project){downloadBlob(new Blob([JSON.stringify(project,null,2)],{type:'application/json'}),`${project.name.replace(/[^\p{L}\p{N}-]+/gu,'-')}.mangamotion.json`);}
export async function readProjectFile(file:File){if(file.size>80*1024*1024)throw new Error('Tệp vượt quá 80 MB. Hãy giảm dung lượng tài nguyên trước khi nhập.');let data;try{data=JSON.parse(await file.text());}catch{throw new Error('Không đọc được JSON. Tệp có thể bị hỏng hoặc chưa tải xong.');}return validateProject(data);}
