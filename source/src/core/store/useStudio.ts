import { create } from 'zustand';
import { temporal } from 'zundo';
import type { Project, Scene, Layer, Camera, Workspace, ViewMode, Selection, Asset, Environment, ShaderSettings, Keyframe, Easing } from '../types';
import { uid, clamp } from '../types';
import { createDemoProject, layerDefaults, defaultCamera, defaultEnvironment, defaultShader } from '../presets/demo';
import { setPath, getPath, sampleTrack, snapTime } from '../timeline/engine';
import { saveProject, loadProject, validateProject } from './persistence';
export type Modal = 'assets'|'workflow'|'codelab'|'export'|'roadmap'|'settings'|'shortcuts'|null;
interface Toast {id:string;message:string;type:'success'|'error'|'info'}
interface Studio {
 project:Project; time:number; playing:boolean; loop:boolean; view:ViewMode; workspace:Workspace; quality:'preview'|'high'; locale:'vi'|'en'; selection:Selection|null; selectedKey:{layerId:string;property:string;keyId:string}|null;
 modal:Modal; roadmap:Workspace; leftTab:'layers'|'assets'; inspectorTab:'layer'|'camera'|'fx'; snap:boolean; guides:boolean; wireframe:boolean; muted:boolean; hydrated:boolean; fps:number; saveStatus:'saved'|'saving'|'error'; toasts:Toast[]; clipboard:{property:string;keys:Keyframe[]}|null; mobilePanel:'left'|'right'|null; focusVersion:number;
 set:(p:Partial<Studio>)=>void; notify:(message:string,type?:Toast['type'])=>void; dismiss:(id:string)=>void;
 updateProject:(fn:(p:Project)=>void)=>void; updateScene:(fn:(s:Scene)=>void)=>void; updateLayer:(id:string,fn:(l:Layer)=>void)=>void;
 seek:(t:number)=>void; togglePlay:()=>void; select:(selection:Selection|null)=>void; addLayer:(partial?:Partial<Layer>)=>string; deleteSelected:()=>void; duplicateLayer:(id?:string)=>void;
 keyframe:(property?:string)=>void; deleteKey:()=>void; undo:()=>void; redo:()=>void; copyKey:()=>void; pasteKey:()=>void; setKeyEasing:(easing:Easing)=>void;
 setEnvironment:(p:Partial<Environment>)=>void; setShader:(p:Partial<ShaderSettings>)=>void; updateCamera:(fn:(c:Camera)=>void)=>void; addCamera:()=>void;
 load:(p:Project)=>void; hydrate:()=>Promise<void>; addAsset:(a:Asset)=>void; applyScatter:(id:string)=>void;
}
export const activeScene=(p:Project)=>p.scenes.find(s=>s.id===p.activeSceneId)??p.scenes[0];
export const activeCamera=(s:Scene,t=0)=>[...s.cameras].sort((a,b)=>a.start-b.start).filter(c=>c.start<=t).at(-1)??s.cameras[0];
let saveTimer:ReturnType<typeof setTimeout>;
export const useStudio=create<Studio>()(temporal((set,get)=>({
 project:createDemoProject(),time:1.25,playing:false,loop:true,view:'camera',workspace:'multiplane25d',quality:'preview',locale:'vi',selection:{type:'layer',id:'ronin'},selectedKey:null,
 modal:null,roadmap:'blockout3d',leftTab:'layers',inspectorTab:'layer',snap:true,guides:true,wireframe:false,muted:true,hydrated:false,fps:60,saveStatus:'saved',toasts:[],clipboard:null,mobilePanel:null,focusVersion:0,
 set:p=>set(p),
 notify:(message,type='info')=>{const id=uid();set(s=>({toasts:[...s.toasts.slice(-3),{id,message,type}]}));setTimeout(()=>get().dismiss(id),4500);},
 dismiss:id=>set(s=>({toasts:s.toasts.filter(t=>t.id!==id)})),
 updateProject:fn=>{const p=structuredClone(get().project);fn(p);p.revision++;p.updatedAt=new Date().toISOString();set({project:p});},
 updateScene:fn=>get().updateProject(p=>fn(activeScene(p))),
 updateLayer:(id,fn)=>get().updateScene(s=>{const l=s.layers.find(l=>l.id===id);if(l&&!l.locked)fn(l);}),
 seek:t=>set({time:clamp(Number.isFinite(t)?t:0,0,activeScene(get().project).duration),playing:false}),
 togglePlay:()=>{const s=get();if(!s.playing&&s.time>=activeScene(s.project).duration)set({time:0,playing:true});else set({playing:!s.playing});},
 select:selection=>set({selection,selectedKey:null,inspectorTab:selection?.type==='camera'?'camera':'layer'}),
 addLayer:partial=>{const id=partial?.id??uid();const l:Layer={...structuredClone(layerDefaults),id,name:'Manga card mới',...partial};get().updateScene(s=>s.layers.push(l));get().select({type:'layer',id});return id;},
 deleteSelected:()=>{const s=get();if(s.selectedKey){s.deleteKey();return;}if(!s.selection)return;if(s.selection.type==='camera'){if(activeScene(s.project).cameras.length<2){s.notify('Cần giữ ít nhất một camera.','error');return;}s.updateScene(sc=>{sc.cameras=sc.cameras.filter(c=>c.id!==s.selection!.id);});s.select(null);s.notify('Đã xóa camera. Ctrl+Z để hoàn tác.');return;}
 const l=activeScene(s.project).layers.find(l=>l.id===s.selection!.id);if(l?.locked){s.notify('Lớp đang khóa. Mở khóa trước khi xóa.','error');return;}s.updateScene(sc=>{sc.layers=sc.layers.filter(l=>l.id!==s.selection!.id);});s.select(null);s.notify('Đã xóa lớp. Ctrl+Z để hoàn tác.');},
 duplicateLayer:id=>{const s=get();const target=id??(s.selection?.type==='layer'?s.selection.id:null);const l=activeScene(s.project).layers.find(l=>l.id===target);if(!l)return;const copy=structuredClone(l);copy.id=uid();copy.name+=' · copy';copy.locked=false;copy.position[0]+=.4;copy.position[2]+=.2;s.updateScene(sc=>sc.layers.push(copy));s.select({type:'layer',id:copy.id});s.notify('Đã nhân bản lớp.','success');},
 keyframe:(property='all')=>{const s=get();if(!s.selection)return;const scene=activeScene(s.project);const t=snapTime(s.time,scene.fps,scene.markers.map(m=>m.time),s.snap);const isCam=s.selection.type==='camera';const obj=isCam?activeCamera(scene,s.time):scene.layers.find(l=>l.id===s.selection!.id);if(!obj||(!isCam&&(obj as Layer).locked)){s.notify('Mở khóa lớp trước khi đặt keyframe.','error');return;}const base=isCam?defaultCamera:layerDefaults;const props=property==='all'?(isCam?['position.x','position.y','position.z','target.x','target.y','target.z','roll','fov','zoom','shake.amplitude']:['position.x','position.y','position.z','rotation.x','rotation.y','rotation.z','scale.x','scale.y','opacity']):[property];
 s.updateScene(sc=>{const target=isCam?activeCamera(sc,s.time):sc.layers.find(l=>l.id===s.selection!.id)!;for(const p of props){const value=sampleTrack(target.tracks[p],s.time,getPath(target,p)??getPath(base,p)??0);const tr=target.tracks[p]??{property:p,keys:[]};const existing=tr.keys.find(k=>Math.abs(k.time-t)<.001);if(existing)existing.value=value;else tr.keys.push({id:uid(),time:t,value,easing:'easeInOut',bezier:[.42,0,.58,1]});tr.keys.sort((a,b)=>a.time-b.time);target.tracks[p]=tr;}});s.notify(`Đã đặt keyframe tại ${t.toFixed(2)}s.`,'success');},
 deleteKey:()=>{const s=get();const k=s.selectedKey;if(!k){s.notify('Chọn một keyframe trên timeline trước khi xóa.');return;}s.updateScene(sc=>{const l=sc.layers.find(l=>l.id===k.layerId);if(l&&!l.locked)l.tracks[k.property].keys=l.tracks[k.property].keys.filter(x=>x.id!==k.keyId);});set({selectedKey:null});s.notify('Đã xóa keyframe.');},
 undo:()=>{useStudio.temporal.getState().undo();set({selectedKey:null});},redo:()=>{useStudio.temporal.getState().redo();set({selectedKey:null});},
 copyKey:()=>{const s=get(),k=s.selectedKey;if(!k){s.notify('Chọn keyframe để sao chép.');return;}const key=activeScene(s.project).layers.find(l=>l.id===k.layerId)?.tracks[k.property]?.keys.find(x=>x.id===k.keyId);if(key){set({clipboard:{property:k.property,keys:[structuredClone(key)]}});s.notify('Đã sao chép keyframe.');}},
 pasteKey:()=>{const s=get(),c=s.clipboard;if(!c||s.selection?.type!=='layer'){s.notify('Sao chép keyframe và chọn lớp đích trước.');return;}s.updateScene(sc=>{const l=sc.layers.find(l=>l.id===s.selection!.id);if(l&&!l.locked){const tr=l.tracks[c.property]??{property:c.property,keys:[]};for(const key of c.keys)tr.keys.push({...key,id:uid(),time:s.time});tr.keys.sort((a,b)=>a.time-b.time);l.tracks[c.property]=tr;}});s.notify('Đã dán keyframe.','success');},
 setKeyEasing:easing=>{const s=get(),k=s.selectedKey;if(!k){s.notify('Chọn một keyframe trên timeline.');return;}s.updateLayer(k.layerId,l=>{const key=l.tracks[k.property].keys.find(x=>x.id===k.keyId);if(key)key.easing=easing;});},
 setEnvironment:p=>get().updateScene(s=>{Object.assign(s.environment,p);}),
 setShader:p=>get().updateScene(s=>{Object.assign(s.shader,p);}),
 updateCamera:fn=>{const st=get();get().updateScene(sc=>fn(activeCamera(sc,st.time)));},
 addCamera:()=>{const s=get(),c={...structuredClone(defaultCamera),id:uid(),name:`Camera ${activeScene(s.project).cameras.length+1}`,start:s.time,position:[0,.2,5] as [number,number,number]};s.updateScene(sc=>sc.cameras.push(c));s.select({type:'camera',id:c.id});s.notify('Đã thêm camera và điểm cắt tại thời điểm hiện tại.','success');},
 load:p=>{const valid=validateProject(p);useStudio.temporal.getState().clear();set({project:valid,time:0,playing:false,selection:null,selectedKey:null,workspace:'multiplane25d'});},
 hydrate:async()=>{try{const saved=await loadProject();if(saved){const p=validateProject(saved);set({project:p,time:Math.min(1.25,activeScene(p).duration),selection:{type:'layer',id:activeScene(p).layers.find(l=>l.id==='ronin')?.id??activeScene(p).layers[0]?.id??''}});}set({hydrated:true});}catch{set({hydrated:true,saveStatus:'error'});get().notify('Không thể khôi phục tự động lưu. Dự án mẫu vẫn sẵn sàng; hãy nhập JSON nếu cần.','error');}},
 addAsset:a=>{get().updateProject(p=>p.assets.push(a));get().notify(`Đã thêm “${a.name}” vào thư viện.`,'success');},
 applyScatter:id=>{const s=get(),l=activeScene(s.project).layers.find(l=>l.id===id);if(!l||l.kind!=='scatter')return;s.updateScene(sc=>{const group=sc.layers.find(x=>x.id===id)!;sc.layers=sc.layers.filter(x=>!x.id.startsWith(`${id}-child-`));});const {mulberry32}=requireParticles();const r=mulberry32(l.scatter!.seed);for(let i=0;i<l.scatter!.count;i++){const side=i%2?1:-1;const z=l.scatter!.zMin+(l.scatter!.zMax-l.scatter!.zMin)*i/Math.max(1,l.scatter!.count-1);get().addLayer({id:`${id}-child-${i}`,name:`Cây ${String(i+1).padStart(2,'0')}`,kind:'card',assetId:l.scatter!.assetIds[i%l.scatter!.assetIds.length],position:[side*(l.scatter!.width/2+r()*3),1,z],scale:[5+r()*2,12],color:'#a5c1c0'});}s.select({type:'layer',id});s.notify(`Đã rải ${l.scatter!.count} lớp cây theo seed ${l.scatter!.seed}.`,'success');},
}),{partialize:s=>({project:s.project}),limit:80,equality:(a,b)=>a.project===b.project}));
// Static import is kept in a tiny closure to keep the store independent of the renderer.
import { mulberry32 } from '../environment3d/particles';
function requireParticles(){return {mulberry32};}
useStudio.subscribe((s,prev)=>{if(s.project!==prev.project&&s.hydrated){setSaveStatus('saving');clearTimeout(saveTimer);saveTimer=setTimeout(async()=>{try{await saveProject(useStudio.getState().project);setSaveStatus('saved');}catch(e){setSaveStatus('error');useStudio.getState().notify((e as Error).message,'error');}},650);}});
function setSaveStatus(saveStatus:Studio['saveStatus']){useStudio.setState({saveStatus});}
export function useActiveScene(){return useStudio(s=>activeScene(s.project));}
export function useSelectedLayer(){const scene=useActiveScene();const selection=useStudio(s=>s.selection);return selection?.type==='layer'?scene.layers.find(l=>l.id===selection.id):undefined;}
