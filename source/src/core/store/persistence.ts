import type { Project } from '../types';
const DB='mangamotion-studio', STORE='projects';
const MAX_JSON_BYTES=80*1024*1024;
const EASINGS=['linear','easeIn','easeOut','easeInOut','step','bezier'];
const ASSET_TYPES=['image','svg','audio','video','glb','vrm','lottie'];
const LAYER_KINDS=['card','scatter','environment'];
const BLENDS=['normal','multiply','screen','add'];
const MASKS=['none','panel','diagonal'];
const ENV_KINDS=['rain','snow','sakura','dust'];
const CAMERA_TYPES=['perspective','orthographic'];
const ASPECTS=['16:9','9:16','4:3'];
const HEX_COLOR=/^#[0-9a-fA-F]{3,8}$/;
const RENDERABLE_IMAGE_TYPES=['image','svg'];
// Data URI nhúng an toàn: đúng nhóm MIME app hỗ trợ, payload base64 hợp lệ (hoặc SVG URL-encode tối giản).
const DATA_URI=/^data:(image\/(png|jpeg|jpg|webp|gif|svg\+xml)|audio\/[a-z0-9.+-]+|video\/[a-z0-9.+-]+|model\/[a-z0-9.+-]+|application\/json);base64,[A-Za-z0-9+/]*={0,2}$/;
const SVG_URLDATA=/^data:image\/svg\+xml,[^"\\<>]*$/;
function openDB():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{let req:IDBOpenDBRequest;try{req=indexedDB.open(DB,1);}catch{reject(new Error('Không mở được bộ nhớ trình duyệt. Hãy xuất JSON để lưu dự án.'));return;}req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE);};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(new Error('Không mở được bộ nhớ trình duyệt. Hãy xuất JSON để lưu dự án.'));req.onblocked=()=>reject(new Error('Bộ nhớ trình duyệt đang bị khoá bởi tab khác. Hãy đóng tab cũ rồi thử lại.'));});}
export async function saveProject(project:Project){const db=await openDB();return new Promise<void>((resolve,reject)=>{let tx:IDBTransaction;try{tx=db.transaction(STORE,'readwrite');}catch{db.close();reject(new Error('Bộ nhớ đầy hoặc bị chặn. Xuất JSON để không mất thay đổi.'));return;}const store=tx.objectStore(STORE);let putFailed=false;const req=store.put(project,'current');req.onerror=(e)=>{putFailed=true;e?.preventDefault?.();};(req as unknown as {onabort?:()=>void}).onabort=()=>{putFailed=true;};tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>{db.close();reject(new Error('Bộ nhớ đầy hoặc bị chặn. Xuất JSON để không mất thay đổi.'));};tx.onabort=()=>{db.close();reject(putFailed?new Error('Bộ nhớ đầy hoặc bị chặn. Không thể ghi dự án vào IndexedDB. Hãy xuất JSON để không mất thay đổi.'):tx.error??new Error('Không thể lưu dự án vào bộ nhớ trình duyệt. Hãy xuất JSON để không mất thay đổi.'));};});}
export async function loadProject():Promise<Project|undefined>{const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly');const r=tx.objectStore(STORE).get('current');r.onsuccess=()=>{db.close();resolve(r.result as Project|undefined);};r.onerror=()=>{db.close();reject(new Error('Không đọc được bản tự động lưu. Hãy nhập tệp JSON nếu cần.'));};tx.onabort=()=>{db.close();reject(new Error('Không đọc được bản tự động lưu. Hãy nhập tệp JSON nếu cần.'));};});}
export function validateProject(data:unknown):Project{
 const fail=(msg:string):never=>{throw new Error(`Dự án không hợp lệ: ${msg}`);};
 if(typeof data==='string'){try{data=JSON.parse(data);}catch{fail('không phải JSON hợp lệ (tệp có thể bị hỏng hoặc chưa tải xong).');}}
 if(!data||typeof data!=='object'||Array.isArray(data))fail('không phải một đối tượng dự án.');
 const p=data as Record<string,any>;
 if(p.schemaVersion!==1)fail('cần schemaVersion = 1.');
 if(typeof p.id!=='string'||!p.id)fail('thiếu ID dự án.');
 if(typeof p.name!=='string'||!p.name.trim())fail('thiếu tên dự án.');
 if(!Number.isInteger(p.revision)||p.revision<0)fail('số revision phải là số nguyên ≥ 0.');
 if(typeof p.updatedAt!=='string'||Number.isNaN(Date.parse(p.updatedAt)))fail('updatedAt không phải mốc thời gian hợp lệ.');
 if(!Array.isArray(p.assets))fail('assets phải là một mảng.');
 if(!Array.isArray(p.scenes)||!p.scenes.length)fail('cần ít nhất một scene.');
 const finite=(v:unknown)=>typeof v==='number'&&Number.isFinite(v);
 
 const vec=(v:unknown,label:string)=>{if(!Array.isArray(v)||v.length!==3||!v.every(finite))fail(`${label} phải là [x, y, z] hữu hạn.`);return v as number[];};
 const str=(v:unknown,label:string,max=500)=>{if(typeof v!=='string'||!v||v.length>max)fail(`${label} phải là chuỗi 1..${max} ký tự.`);};
 const num=(v:unknown,lo:number,hi:number,label:string)=>{if(!finite(v)||(v as number)<lo||(v as number)>hi)fail(`${label} phải nằm trong [${lo}, ${hi}].`);};
 const bool=(v:unknown,label:string)=>{if(typeof v!=='boolean')fail(`${label} phải là true/false.`);};
 const oneOf=(v:unknown,allowed:readonly string[],label:string)=>{if(typeof v!=='string'||!allowed.includes(v))fail(`${label} phải là một trong: ${allowed.join(', ')}.`);};
 // --- assets ---
 const ids=new Set<string>();
 for(let i=0;i<p.assets.length;i++){const a=p.assets[i];
  const at=`asset #${i+1}`;
  if(!a||typeof a!=='object')fail(`${at} không phải đối tượng.`);
  str(a.id,`${at}.id`,200);str(a.name,`${at}.name`,300);oneOf(a.type,ASSET_TYPES,`${at}.type`);
  if(ids.has(a.id))fail('ID tài nguyên bị trùng.');ids.add(a.id);
  if(typeof a.url!=='string'||!a.url)fail(`${at}.url thiếu.`);
  if(!DATA_URI.test(a.url)&&!SVG_URLDATA.test(a.url))fail(`${at}: tài nguyên phải là data URI nhúng hợp lệ (image/audio/video/model/json); URL ngoài bị chặn.`);
  if(a.url.length>100*1024*1024)fail(`${at}: dữ liệu nhúng vượt quá 100 MB.`);
  if(a.thumbnail!==undefined&&!(typeof a.thumbnail==='string'&&(DATA_URI.test(a.thumbnail)||SVG_URLDATA.test(a.thumbnail))))fail(`${at}.thumbnail phải là data URI ảnh.`);
  if(a.width!==undefined)num(a.width,1,32768,`${at}.width`);
  if(a.height!==undefined)num(a.height,1,32768,`${at}.height`);
  if(a.builtIn!==undefined)bool(a.builtIn,`${at}.builtIn`);
 }
 // --- scenes ---
 const sceneIds=new Set<string>();
 for(let si=0;si<p.scenes.length;si++){const s=p.scenes[si];
  const st=`scene #${si+1}`;
  if(!s||typeof s!=='object')fail(`${st} không phải đối tượng.`);
  str(s.id,`${st}.id`,200);if(sceneIds.has(s.id))fail('ID scene bị trùng.');sceneIds.add(s.id);
  str(s.name,`${st}.name`,300);oneOf(s.mode,['multiplane25d'],`${st}.mode`);oneOf(s.aspect,ASPECTS,`${st}.aspect`);
  num(s.duration,0.04,3600,`${st}.duration`);num(s.fps,1,240,`${st}.fps`);
  if(!Array.isArray(s.layers))fail(`${st}.layers phải là mảng.`);
  if(!Array.isArray(s.cameras)||!s.cameras.length)fail(`${st} cần ít nhất một camera.`);
  if(!Array.isArray(s.shots))fail(`${st}.shots phải là mảng.`);
  if(!Array.isArray(s.markers))fail(`${st}.markers phải là mảng.`);
  if(!s.environment||typeof s.environment!=='object')fail(`${st}.environment thiếu.`);
  if(!s.shader||typeof s.shader!=='object')fail(`${st}.shader thiếu.`);
  const tracksOf=(owner:Record<string,any>,label:string)=>{
   if(!owner.tracks||typeof owner.tracks!=='object'||Array.isArray(owner.tracks))fail(`${label}.tracks phải là một object.`);
   for(const[key,tr]of Object.entries<any>(owner.tracks)){
    if(!tr||typeof tr!=='object'||!Array.isArray(tr.keys))fail(`${label}.tracks.${key} bị hỏng.`);
    for(const[k,ki]of tr.keys.entries())if(!k||typeof k!=='object')fail(`${label}.tracks.${key} keyframe #${ki+1} không phải đối tượng.`);
    for(const k of tr.keys){
     num(k.time,-1e6,1e6,`${label}.tracks.${key}.time`);num(k.value,-1e6,1e6,`${label}.tracks.${key}.value`);
     oneOf(k.easing,EASINGS,`${label}.tracks.${key}.easing`);
     if(!Array.isArray(k.bezier)||k.bezier.length!==4||!k.bezier.every(finite))fail(`${label}.tracks.${key}.bezier phải là 4 số hữu hạn.`);
     if(k.id!==undefined)str(k.id,`${label}.tracks.${key}.id`,200);
    }
    const times=tr.keys.map((k:{time:number})=>k.time);
    for(let i=1;i<times.length;i++)if(times[i]<times[i-1])fail(`${label}.tracks.${key}: keyframe không theo thứ tự thời gian.`);
   }
  };
  const layerIds=new Set<string>();
  for(let li=0;li<s.layers.length;li++){const l=s.layers[li];
   const lt=`${st} layer #${li+1}`;
   if(!l||typeof l!=='object')fail(`${lt} không phải đối tượng.`);
   str(l.id,`${lt}.id`,200);if(layerIds.has(l.id))fail('ID layer bị trùng trong scene.');layerIds.add(l.id);
   str(l.name,`${lt}.name`,300);oneOf(l.kind,LAYER_KINDS,`${lt}.kind`);
   vec(l.position,`${lt}.position`);vec(l.rotation,`${lt}.rotation`);
   if(!Array.isArray(l.scale)||l.scale.length!==2||!l.scale.every(finite))fail(`${lt}.scale phải là [w, h].`);
   for(const v of l.scale as number[])num(v,0.001,1e5,`${lt}.scale`);
   num(l.opacity,0,1,`${lt}.opacity`);
   bool(l.visible,`${lt}.visible`);bool(l.locked,`${lt}.locked`);bool(l.billboard,`${lt}.billboard`);bool(l.compensate,`${lt}.compensate`);
   oneOf(l.blend,BLENDS,`${lt}.blend`);oneOf(l.mask,MASKS,`${lt}.mask`);
   bool(l.shadow,`${lt}.shadow`);bool(l.rim,`${lt}.rim`);
   num(l.posterize,0,64,`${lt}.posterize`);
   if(typeof l.color!=='string'||!HEX_COLOR.test(l.color))fail(`${lt}.color phải là mã hex (#rgb..#rrggbbaa).`);
   tracksOf(l,lt);
   if(l.assetId!==undefined){if(typeof l.assetId!=='string')fail(`${lt}.assetId phải là chuỗi.`);else if(!ids.has(l.assetId))fail(`${lt} tham chiếu asset "${l.assetId}" không tồn tại.`);}
   if(l.kind==='scatter'){
    const sc=l.scatter;if(!sc||typeof sc!=='object')fail(`${lt} kind=scatter nhưng thiếu scatter.`);
    num(sc.count,0,5000,`${lt}.scatter.count`);
    if(!finite(sc.seed))fail(`${lt}.scatter.seed phải là số hữu hạn.`);
    num(sc.zMin,-1000,1000,`${lt}.scatter.zMin`);num(sc.zMax,-1000,1000,`${lt}.scatter.zMax`);
    if(sc.zMax<=sc.zMin)fail(`${lt}.scatter: zMax phải lớn hơn zMin.`);
    num(sc.width,0,1000,`${lt}.scatter.width`);
    if(!Array.isArray(sc.assetIds)||!sc.assetIds.length)fail(`${lt}.scatter.assetIds cần ít nhất một asset.`);
    else for(const aid of sc.assetIds){if(typeof aid!=='string'||!ids.has(aid))fail(`${lt}.scatter tham chiếu asset "${aid}" không tồn tại.`);}
   }
  }
  const cameraIds=new Set<string>();
  for(let ci=0;ci<s.cameras.length;ci++){const c=s.cameras[ci];
   const ct=`${st} camera #${ci+1}`;
   if(!c||typeof c!=='object')fail(`${ct} không phải đối tượng.`);
   str(c.id,`${ct}.id`,200);if(cameraIds.has(c.id))fail('ID camera bị trùng trong scene.');cameraIds.add(c.id);
   str(c.name,`${ct}.name`,300);oneOf(c.type,CAMERA_TYPES,`${ct}.type`);
   num(c.start,0,s.duration,`${ct}.start`);
   vec(c.position,`${ct}.position`);vec(c.target,`${ct}.target`);
   num(c.roll,-Math.PI,Math.PI,`${ct}.roll`);num(c.fov,1,179,`${ct}.fov`);num(c.zoom,0.01,1000,`${ct}.zoom`);
   if(!c.shake||typeof c.shake!=='object')fail(`${ct}.shake thiếu.`);
   num(c.shake.amplitude,0,10,`${ct}.shake.amplitude`);num(c.shake.frequency,0,1000,`${ct}.shake.frequency`);
   if(!finite(c.shake.seed))fail(`${ct}.shake.seed phải là số hữu hạn.`);
   tracksOf(c,ct);
  }
  const e=s.environment;
  oneOf(e.kind,ENV_KINDS,`${st}.environment.kind`);bool(e.enabled,`${st}.environment.enabled`);
  num(e.count,0,10000,`${st}.environment.count`);
  if(!finite(e.seed))fail(`${st}.environment.seed phải là số hữu hạn.`);
  num(e.width,0,10000,`${st}.environment.width`);num(e.height,0,10000,`${st}.environment.height`);num(e.depth,0,10000,`${st}.environment.depth`);
  num(e.centerZ,-10000,10000,`${st}.environment.centerZ`);
  num(e.fallSpeed,-1000,1000,`${st}.environment.fallSpeed`);num(e.windSpeed,-1000,1000,`${st}.environment.windSpeed`);
  num(e.swayAmp,0,1000,`${st}.environment.swayAmp`);num(e.frequency,0,1000,`${st}.environment.frequency`);
  num(e.opacity,0,1,`${st}.environment.opacity`);
  if(typeof e.color!=='string'||!HEX_COLOR.test(e.color))fail(`${st}.environment.color phải là mã hex.`);
  num(e.fog,0,1,`${st}.environment.fog`);
  if(typeof e.fogColor!=='string'||!HEX_COLOR.test(e.fogColor))fail(`${st}.environment.fogColor phải là mã hex.`);
  num(e.speedlines,0,10,`${st}.environment.speedlines`);num(e.speedlineRadius,0,10,`${st}.environment.speedlineRadius`);
  const sh=s.shader;
  bool(sh.enabled,`${st}.shader.enabled`);bool(sh.halftone,`${st}.shader.halftone`);
  num(sh.dotSize,0.1,100,`${st}.shader.dotSize`);num(sh.angle,0,360,`${st}.shader.angle`);
  num(sh.threshold,0,1,`${st}.shader.threshold`);num(sh.ink,0,10,`${st}.shader.ink`);
  bool(sh.bw,`${st}.shader.bw`);num(sh.vignette,0,1,`${st}.shader.vignette`);
  num(sh.blur,0,10,`${st}.shader.blur`);num(sh.focus,0,1,`${st}.shader.focus`);num(sh.flash,0,10,`${st}.shader.flash`);
  if(sh.tracks!==undefined)tracksOf(sh,`${st}.shader`);
  const shotIds=new Set<string>();
  for(let hi=0;hi<s.shots.length;hi++){const sh2=s.shots[hi];
   const ht=`${st} shot #${hi+1}`;
   if(!sh2||typeof sh2!=='object')fail(`${ht} không phải đối tượng.`);
   str(sh2.id,`${ht}.id`,200);if(shotIds.has(sh2.id))fail('ID shot bị trùng trong scene.');shotIds.add(sh2.id);
   str(sh2.name,`${ht}.name`,300);num(sh2.start,0,s.duration,`${ht}.start`);num(sh2.duration,0.04,s.duration,`${ht}.duration`);
   if(typeof sh2.color!=='string'||!HEX_COLOR.test(sh2.color))fail(`${ht}.color phải là mã hex.`);
   if(sh2.page!==undefined)num(sh2.page,1,10000,`${ht}.page`);
  }
  for(let mi=0;mi<s.markers.length;mi++){const m=s.markers[mi];
   const mt=`${st} marker #${mi+1}`;
   if(!m||typeof m!=='object')fail(`${mt} không phải đối tượng.`);
   str(m.id,`${mt}.id`,200);num(m.time,0,s.duration,`${mt}.time`);str(m.label,`${mt}.label`,300);
  }
 }
 if(typeof p.activeSceneId!=='string'||!sceneIds.has(p.activeSceneId))fail('scene đang chọn (activeSceneId) không tồn tại.');
 return p as unknown as Project;
}
export function downloadBlob(blob:Blob,name:string){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
export async function exportProjectFile(project:Project){downloadBlob(new Blob([JSON.stringify(project,null,2)],{type:'application/json'}),`${project.name.replace(/[^\p{L}\p{N}-]+/gu,'-')}.mangamotion.json`);}
export async function readProjectFile(file:File){if(file.size>MAX_JSON_BYTES)throw new Error('Tệp vượt quá 80 MB. Hãy giảm dung lượng tài nguyên trước khi nhập.');let data;try{data=JSON.parse(await file.text());}catch{throw new Error('Không đọc được JSON. Tệp có thể bị hỏng hoặc chưa tải xong.');}return validateProject(data);}
// Cảnh báo (không chặn khi mở): asset chưa render được trong 2.5D stage.
export function unsupportedRenderTypes(project:Project):string[]{
 const used=new Set<string>();
 for(const s of project.scenes)for(const l of s.layers){if(l.assetId)used.add(l.assetId);if(l.scatter)for(const a of l.scatter.assetIds)used.add(a);}
 const t=new Set(project.assets.filter(a=>used.has(a.id)&&!RENDERABLE_IMAGE_TYPES.includes(a.type)).map(a=>a.type));
 return [...t];
}
