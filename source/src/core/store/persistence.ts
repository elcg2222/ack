import type { Project } from '../types';
const DB='mangamotion-studio', STORE='projects';
function idbError(e:unknown,msg:string):Error{const name=(e as {name?:string})?.name??'';const extra=name==='QuotaExceededError'?' Bộ nhớ đầy.':name==='InvalidStateError'?' Giao dịch không hợp lệ hoặc đóng_store đã bị xóa.':name==='AbortError'?' Giao dịch bị hủy (có thể do quota).':'';return new Error(`${msg}${extra} Vui lòng xuất JSON để không mất thay đổi.`);}
function openDB():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{if(typeof indexedDB==='undefined'){reject(new Error('Trình duyệt không hỗ trợ IndexedDB. Hãy xuất JSON để lưu dự án.'));return;}const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE);};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(idbError(r.error,'Không mở được bộ nhớ trình duyệt.'));r.onblocked=()=>reject(new Error('Bộ nhớ trình duyệt đang bị khóa bởi tab khác. Hãy xuất JSON để lưu dự án.'));});}
export async function saveProject(project:Project){validateProject(project);const db=await openDB();return new Promise<void>((resolve,reject)=>{let tx:IDBTransaction;try{tx=db.transaction(STORE,'readwrite');}catch(e){db.close();reject(idbError(e,'Không bắt đầu được giao dịch lưu.'));return;}const req=tx.objectStore(STORE).put(project,'current');req.onerror=()=>{db.close();reject(idbError(req.error,'Không lưu được dự án.'));};tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>{db.close();reject(idbError(tx.error??req.error,'Bộ nhớ đầy hoặc bị chặn.'));};tx.onabort=()=>{db.close();reject(idbError(tx.error??req.error,'Giao dịch lưu bị hủy — dự án CHƯA được lưu.'));};});}
export async function loadProject():Promise<Project|undefined>{const db=await openDB();return new Promise((resolve,reject)=>{let tx:IDBTransaction;try{tx=db.transaction(STORE,'readonly');}catch(e){db.close();reject(idbError(e,'Không đọc được bộ nhớ trình duyệt.'));return;}const r=tx.objectStore(STORE).get('current');r.onsuccess=()=>{db.close();resolve(r.result);};r.onerror=()=>{db.close();reject(idbError(r.error,'Không đọc được bản tự động lưu.'));};tx.onerror=()=>{db.close();reject(idbError(tx.error,'Không đọc được bản tự động lưu.'));};tx.onabort=()=>{db.close();reject(idbError(tx.error,'Giao dịch đọc bị hủy.'));};});}
export function validateProject(data:unknown):Project {
 const p=data as Project;
 const fail=(msg:string):never=>{throw new Error(`Dự án không hợp lệ: ${msg}`);};
 if(!p||typeof p!=='object')fail('dữ liệu trống hoặc sai kiểu JSON.');
 if(p.schemaVersion!==1)fail('cần schemaVersion = 1.');
 if(typeof p.name!=='string'||!Array.isArray(p.scenes)||!p.scenes.length||!Array.isArray(p.assets))fail('thiếu tên, scenes hoặc assets.');
 if(!Number.isSafeInteger(p.revision)||p.revision<0)fail('revision phải là số nguyên an toàn, không âm.');
 if(typeof p.updatedAt!=='string'||Number.isNaN(Date.parse(p.updatedAt)))fail('updatedAt phải là mốc thời gian hợp lệ (ISO string).');
 const finite=(v:unknown)=>typeof v==='number'&&Number.isFinite(v);
 const int=(v:unknown)=>finite(v)&&Number.isInteger(v);
 const vec=(v:unknown)=>Array.isArray(v)&&v.length===3&&v.every(finite);
 const str=(v:unknown)=>typeof v==='string'&&v.length>0;
 const bool=(v:unknown)=>typeof v==='boolean';
 const colorHex=(v:unknown)=>typeof v==='string'&&/^#[0-9a-fA-F]{6}$/.test(v);
 const KINDS=['card','scatter','environment'];
 const BLEND=['normal','multiply','screen','add'];
 const MASK=['none','panel','diagonal'];
 const EASINGS=['linear','easeIn','easeOut','easeInOut','step','bezier'];
 const ASSET_TYPES=['image','svg','audio','video','glb','vrm','lottie'];
 const RENDERABLE_ASSET_MIME:Record<string,RegExp>={image:/^data:image\/(png|jpeg|webp|gif);/i,svg:/^data:image\/svg\+xml/i,lottie:/^data:application\/json/i};
 const ENV_KINDS=['rain','snow','sakura','dust'];
 // Các property thật sự được engine/store/UI tạo track (xem timeline/engine.ts, useStudio.keyframe, Inspector.keyFx).
 const LAYER_TRACK_KEYS=/^(position\.[xyz]|rotation\.[xyz]|scale\.[xy]|opacity)$/;
 const CAMERA_TRACK_KEYS=/^(position\.[xyz]|target\.[xyz]|roll|fov|zoom|shake\.amplitude)$/;
 const SHADER_TRACK_KEYS=/^(dotSize|angle|threshold|ink|vignette|blur|focus|flash)$/;
 const ids=new Set<string>();
 for(const a of p.assets){
  if(!str(a?.id)||!str(a?.name))fail('mỗi tài nguyên cần id và name là chuỗi không rỗng.');
  if(!ASSET_TYPES.includes(a.type))fail(`tài nguyên “${a.name}” có type không hợp lệ.`);
  if(typeof a.url!=='string')fail('url tài nguyên phải là chuỗi.');
  if(!/^data:/.test(a.url)){if(/^(https?:|blob:|\/\/|file:)/i.test(a.url))fail(`tài nguyên “${a.name}” dùng URL ngoài (“${a.url.slice(0,40)}…”). Tài nguyên phải được nhúng dưới dạng data URI.`);else fail('tài nguyên phải được nhúng dưới dạng data URI.');}
  else if(RENDERABLE_ASSET_MIME[a.type]&&!RENDERABLE_ASSET_MIME[a.type].test(a.url))fail(`tài nguyên “${a.name}” (type ${a.type}) có MIME data URI không hợp lệ.`);
  if(a.thumbnail!==undefined&&(typeof a.thumbnail!=='string'||!/^data:image\//i.test(a.thumbnail)))fail(`thumbnail của tài nguyên “${a.name}” không hợp lệ.`);
  if(a.width!==undefined&&(!int(a.width)||a.width<=0||a.width>16384))fail(`width của tài nguyên “${a.name}” ngoài khoảng cho phép (1..16384).`);
  if(a.height!==undefined&&(!int(a.height)||a.height<=0||a.height>16384))fail(`height của tài nguyên “${a.name}” ngoài khoảng cho phép (1..16384).`);
  if(ids.has(a.id))fail('ID tài nguyên bị trùng.');
  ids.add(a.id);
 }
 const sceneIds=new Set<string>();
 for(const s of p.scenes){
  if(!str(s?.id)||sceneIds.has(s.id)||s.mode!=='multiplane25d'||!str(s.name)||!['16:9','9:16','4:3'].includes(s.aspect)||!finite(s.duration)||s.duration<=0||s.duration>3600||!int(s.fps)||s.fps<=0||s.fps>240||!Array.isArray(s.layers)||!Array.isArray(s.cameras)||!s.cameras.length||!s.environment||!s.shader||!Array.isArray(s.shots)||!Array.isArray(s.markers))fail('scene hoặc camera không hợp lệ.');
  sceneIds.add(s.id);
  const layerIds=new Set<string>();
  for(const l of s.layers){
   if(!str(l?.id)||layerIds.has(l.id)||!str(l.name)||!KINDS.includes(l.kind)||(l.assetId!==undefined&&!str(l.assetId))||!vec(l.position)||!vec(l.rotation)||!Array.isArray(l.scale)||l.scale.length!==2||!l.scale.every(finite)||!finite(l.opacity)||!bool(l.visible)||!bool(l.locked)||!bool(l.billboard)||!bool(l.compensate)||!BLEND.includes(l.blend)||!MASK.includes(l.mask)||!bool(l.shadow)||!bool(l.rim)||!finite(l.posterize)||!colorHex(l.color)||typeof l.tracks!=='object'||l.tracks===null)fail('transform của layer không hợp lệ.');
   if(Object.values(l.tracks).some(t=>!Array.isArray((t as {keys?:unknown}).keys)))fail('track của layer bị hỏng (thiếu keys).');
   if(l.assetId&&!ids.has(l.assetId))fail(`layer “${l.name}” tham chiếu tài nguyên không tồn tại (“${l.assetId}”).`);
   if(l.kind==='scatter'){const sc=l.scatter;if(!sc||!int(sc.count)||sc.count<0||sc.count>10000||!finite(sc.seed)||!finite(sc.zMin)||!finite(sc.zMax)||sc.zMin>sc.zMax||!finite(sc.width)||sc.width<=0||!Array.isArray(sc.assetIds)||sc.assetIds.some(id=>!ids.has(id)))fail('thông số scatter không hợp lệ hoặc tham chiếu tài nguyên missing.');}
   layerIds.add(l.id);
   for(const [prop,tr] of Object.entries(l.tracks)){
    if(!LAYER_TRACK_KEYS.test(prop))fail(`track layer không rõ thuộc tính: “${prop}”.`);
    if(!Array.isArray(tr?.keys))fail('track bị hỏng.');
    for(const k of tr.keys)if(!finite(k.time)||k.time<0||!finite(k.value)||!EASINGS.includes(k.easing)||!Array.isArray(k.bezier)||k.bezier.length!==4||!k.bezier.every(finite))fail('keyframe bị hỏng.');
   }
  }
  const cameraIds=new Set<string>();
  for(const c of s.cameras){
   if(!str(c?.id)||cameraIds.has(c.id)||!['perspective','orthographic'].includes(c.type)||!vec(c.position)||!vec(c.target)||!finite(c.fov)||c.fov<=0||c.fov>=180||!finite(c.zoom)||c.zoom<=0||!finite(c.roll)||!c.shake||!finite(c.shake.amplitude)||!finite(c.shake.frequency)||!finite(c.shake.seed)||!finite(c.start)||typeof c.tracks!=='object'||c.tracks===null)fail('camera bị hỏng.');
   cameraIds.add(c.id);
   for(const [prop,tr] of Object.entries(c.tracks)){
    if(!CAMERA_TRACK_KEYS.test(prop))fail(`track camera không rõ thuộc tính: “${prop}”.`);
    if(!Array.isArray(tr?.keys))fail('track camera bị hỏng.');
    for(const k of tr.keys)if(!finite(k.time)||!finite(k.value))fail('keyframe camera bị hỏng.');
   }
  }
  const e=s.environment;
  if(!ENV_KINDS.includes(e.kind)||!bool(e.enabled)||!int(e.count)||e.count<0||e.count>10000||!finite(e.seed)||!finite(e.width)||e.width<=0||!finite(e.height)||e.height<=0||!finite(e.depth)||e.depth<=0||!finite(e.centerZ)||!finite(e.fallSpeed)||!finite(e.windSpeed)||!finite(e.swayAmp)||!finite(e.frequency)||!finite(e.opacity)||e.opacity<0||e.opacity>1||!colorHex(e.color)||!finite(e.fog)||e.fog<0||!colorHex(e.fogColor)||!finite(e.speedlines)||!finite(e.speedlineRadius))fail('thông số hạt không hợp lệ.');
  const sh=s.shader;
  if(!bool(sh.enabled)||!bool(sh.halftone)||!finite(sh.dotSize)||!finite(sh.angle)||!finite(sh.threshold)||!finite(sh.ink)||!bool(sh.bw)||!finite(sh.vignette)||!finite(sh.blur)||!finite(sh.focus)||!finite(sh.flash)||(sh.tracks!==undefined&&typeof sh.tracks!=='object'))fail('thông số shader không hợp lệ.');
  if(sh.tracks)for(const [prop,tr] of Object.entries(sh.tracks)){
   if(!SHADER_TRACK_KEYS.test(prop))fail(`track shader không rõ thuộc tính: “${prop}”.`);
   if(!Array.isArray((tr as {keys?:unknown})?.keys))fail('track shader bị hỏng.');
   for(const k of (tr as {keys:{time:number;value:number}[]}).keys)if(!finite(k.time)||!finite(k.value))fail('keyframe shader bị hỏng.');
  }
  for(const shot of s.shots){if(!str(shot?.id)||!str(shot.name)||!finite(shot.start)||shot.start<0||shot.start>s.duration||!finite(shot.duration)||shot.duration<=0||!colorHex(shot.color)||(shot.page!==undefined&&(!int(shot.page)||shot.page<=0)))fail('shot không hợp lệ.');}
  for(const m of s.markers){if(!str(m?.id)||!finite(m.time)||m.time<0||typeof m.label!=='string')fail('marker không hợp lệ.');}
 }
 if(!str(p.activeSceneId)||!sceneIds.has(p.activeSceneId))fail('scene đang chọn không tồn tại.');
 return p;
}
export function downloadBlob(blob:Blob,name:string){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
export async function exportProjectFile(project:Project){downloadBlob(new Blob([JSON.stringify(project,null,2)],{type:'application/json'}),`${project.name.replace(/[^\p{L}\p{N}-]+/gu,'-')}.mangamotion.json`);}
export async function readProjectFile(file:File){if(file.size>80*1024*1024)throw new Error('Tệp vượt quá 80 MB. Hãy giảm dung lượng tài nguyên trước khi nhập.');let data;try{data=JSON.parse(await file.text());}catch{throw new Error('Không đọc được JSON. Tệp có thể bị hỏng hoặc chưa tải xong.');}return validateProject(data);}
