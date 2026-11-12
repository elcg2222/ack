import { useStudio, activeScene, activeCamera } from '../store/useStudio';
import { seek, sceneSnapshot } from '../timeline/engine';
import { validateProject, exportProjectFile } from '../store/persistence';
import { applyCameraPreset } from '../camera/camera';
import { runSelfTest } from '../render/selftest';
import { uid, clamp, type Layer, type Project } from '../types';
import { getCaptureEngine } from '../render/registry';
export const AGENT_COMMANDS=['getState','getSceneState','listScenes','switchScene','seek','play','pause','setView','setQuality','setLocale','selectLayer','addLayer','updateLayer','duplicateLayer','deleteLayer','keyframe','setCamera','applyCameraPreset','setEnvironment','setShader','loadProject','exportProject','runSelfTest','captureFrame'] as const;
export type AgentCommand=typeof AGENT_COMMANDS[number];
const num=(v:unknown,name:string)=>{if(typeof v!=='number'||!Number.isFinite(v))throw new Error(`${name} phải là số hữu hạn.`);return v;};
const str=(v:unknown,name:string)=>{if(typeof v!=='string')throw new Error(`${name} phải là chuỗi.`);return v;};
export async function executeAgentCommand(command:string,args:Record<string,unknown>={}):Promise<unknown>{
 const s=useStudio.getState();const scene=activeScene(s.project);
 switch(command as AgentCommand){
  case 'getState':return {project:s.project,time:s.time,playing:s.playing,view:s.view,quality:s.quality,selection:s.selection,locale:s.locale};
  case 'getSceneState':return seek(scene,args.time===undefined?s.time:num(args.time,'time'));
  case 'listScenes':return s.project.scenes.map(sc=>({id:sc.id,name:sc.name,duration:sc.duration,layers:sc.layers.length}));
  case 'switchScene':{const id=str(args.id,'id');if(!s.project.scenes.some(sc=>sc.id===id))throw new Error('Scene không tồn tại.');s.updateProject(p=>{p.activeSceneId=id;});s.seek(0);s.select(null);return {activeSceneId:id};}
  case 'seek':{const t=num(args.time,'time');s.seek(t);return {time:useStudio.getState().time};}
  case 'play':s.togglePlay();if(!useStudio.getState().playing)s.togglePlay();return {playing:true};
  case 'pause':useStudio.setState({playing:false});return {playing:false};
  case 'setView':{const v=str(args.view,'view');if(!['camera','stage','split'].includes(v))throw new Error('view phải là camera | stage | split.');s.set({view:v as any});return {view:v};}
  case 'setQuality':{const q=str(args.quality,'quality');if(!['preview','high'].includes(q))throw new Error('quality phải là preview | high.');s.set({quality:q as any});return {quality:q};}
  case 'setLocale':{const l=str(args.locale,'locale');if(!['vi','en'].includes(l))throw new Error('locale phải là vi | en.');s.set({locale:l as any});return {locale:l};}
  case 'selectLayer':{const id=str(args.id,'id');if(!scene.layers.some(l=>l.id===id))throw new Error('Layer không tồn tại.');s.select({type:'layer',id});return {selected:id};}
  case 'addLayer':{const partial=(args.layer??args) as Partial<Layer>;const id=s.addLayer({...partial,id:partial.id??uid()});return {id};}
  case 'updateLayer':{const id=str(args.id,'id');const patch=(args.patch??{}) as Record<string,unknown>;const allowed=['name','position','rotation','scale','opacity','visible','billboard','compensate','blend','mask','shadow','rim','posterize','color','assetId'];s.updateLayer(id,l=>{for(const [k,v] of Object.entries(patch)){if(!allowed.includes(k))throw new Error(`Không cho phép sửa trường ${k}.`);if(['position','rotation'].includes(k)&&(!Array.isArray(v)||v.length!==3||!v.every(x=>typeof x==='number'&&Number.isFinite(x))))throw new Error(`${k} cần [x,y,z] hữu hạn.`);if(k==='scale'&&(!Array.isArray(v)||v.length!==2||!v.every(x=>typeof x==='number'&&Number.isFinite(x))))throw new Error('scale cần [x,y] hữu hạn.');if(k==='opacity')num(v,'opacity');(l as any)[k]=v;}});return {id,patch};}
  case 'duplicateLayer':s.duplicateLayer(str(args.id,'id'));return {selected:useStudio.getState().selection};
  case 'deleteLayer':{const id=str(args.id,'id');s.select({type:'layer',id});s.deleteSelected();return {deleted:id};}
  case 'keyframe':{if(args.id)s.select({type:'layer',id:str(args.id,'id')});s.keyframe(typeof args.property==='string'?args.property:'all');return {time:useStudio.getState().time};}
  case 'setCamera':{const patch=(args.patch??args) as Record<string,unknown>;s.updateCamera(c=>{for(const [k,v] of Object.entries(patch)){if(!['position','target','roll','fov','zoom','type','shake','name'].includes(k))throw new Error(`Trường camera ${k} không được hỗ trợ.`);if(['position','target'].includes(k)&&(!Array.isArray(v)||v.length!==3||!v.every(x=>typeof x==='number'&&Number.isFinite(x))))throw new Error(`${k} cần [x,y,z].`);(c as any)[k]=v;}});return {camera:activeCamera(activeScene(useStudio.getState().project),useStudio.getState().time)};}
  case 'applyCameraPreset':{const preset=str(args.preset,'preset');s.updateScene(sc=>{const i=sc.cameras.findIndex(c=>c.id===activeCamera(sc,s.time).id);sc.cameras[i]=applyCameraPreset(sc.cameras[i],preset,sc.duration);});return {preset};}
  case 'setEnvironment':s.setEnvironment(args as any);return {environment:activeScene(useStudio.getState().project).environment};
  case 'setShader':s.setShader(args as any);return {shader:activeScene(useStudio.getState().project).shader};
  case 'loadProject':{const p=validateProject(args.project);s.load(p);return {id:p.id,scenes:p.scenes.length};}
  case 'exportProject':await exportProjectFile(s.project);return {downloaded:true};
  case 'runSelfTest':return runSelfTest(scene);
  case 'captureFrame':{const e=getCaptureEngine();if(!e)throw new Error('Renderer chưa sẵn sàng. Chuyển sang Camera View trước.');const blob=await e.capture(args.time===undefined?s.time:num(args.time,'time'),args.width?num(args.width,'width'):undefined,args.height?num(args.height,'height'):undefined);return {blob,size:blob.size,type:blob.type};}
  default:throw new Error(`Lệnh “${command}” không tồn tại. Xem danh sách AGENT_COMMANDS.`);
 }
}
export const agentSchema={name:'MangaMotion',version:1,commands:AGENT_COMMANDS,examples:[{command:'seek',args:{time:2.5}},{command:'updateLayer',args:{id:'ronin',patch:{position:[0,-.7,-8],scale:[3.3,4.95]}}},{command:'setEnvironment',args:{count:1200,fallSpeed:8}},{command:'setShader',args:{bw:true,dotSize:4}},{command:'runSelfTest',args:{}}]};
export function installAgentAPI(){
 const api={version:1,schema:agentSchema,execute:executeAgentCommand,getState:()=>executeAgentCommand('getState'),seek:(time:number)=>executeAgentCommand('seek',{time}),play:()=>executeAgentCommand('play'),pause:()=>executeAgentCommand('pause'),setView:(view:string)=>executeAgentCommand('setView',{view}),addLayer:(layer:Partial<Layer>)=>executeAgentCommand('addLayer',{layer}),updateLayer:(id:string,patch:Partial<Layer>)=>executeAgentCommand('updateLayer',{id,patch}),setEnvironment:(patch:Record<string,unknown>)=>executeAgentCommand('setEnvironment',patch),setShader:(patch:Record<string,unknown>)=>executeAgentCommand('setShader',patch),loadProject:(project:Project)=>executeAgentCommand('loadProject',{project}),runSelfTest:()=>executeAgentCommand('runSelfTest'),exportProject:()=>executeAgentCommand('exportProject')};
 (window as any).MangaMotion=api;
 window.dispatchEvent(new CustomEvent('mangamotion:ready',{detail:{version:1}}));
 return ()=>{delete (window as any).MangaMotion;};
}
