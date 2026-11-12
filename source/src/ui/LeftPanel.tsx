import { useRef, useState } from 'react';
import { Layers3, Image, Search, Plus, Eye, EyeOff, Lock, Unlock, GripVertical, CloudRain, Trees, Type, Camera, ChevronRight, Upload, Sparkles, Box, Film, MoreHorizontal, Copy, Trash2, MoveUpRight, MoveHorizontal, RotateCw, Activity, X } from 'lucide-react';
import { useStudio, useActiveScene, activeCamera } from '../core/store/useStudio';
import { useT, IconBtn, Badge, Empty } from './primitives';
import { layerDefaults, defaultEnvironment } from '../core/presets/demo';
import { applyCameraPreset, cameraPresets } from '../core/camera/camera';
import { importAssetFile } from '../core/assets/import';
import { uid } from '../core/types';
const presetIcons=[MoveUpRight,MoveHorizontal,RotateCw,Activity];
export function LeftPanel(){
 const s=useStudio();const scene=useActiveScene();const t=useT();const [query,setQuery]=useState('');const [menu,setMenu]=useState<string|null>(null);const uploadRef=useRef<HTMLInputElement>(null);
 const addImage=()=>uploadRef.current?.click();
 const quickAdd=(kind:string)=>{
  if(kind==='image')return addImage();
  if(kind==='rain'){const id=uid();s.addLayer({id,name:t('Mưa 3D','3D Rain'),kind:'environment',assetId:undefined});s.setEnvironment({enabled:true,kind:'rain'});s.notify(t('Đã thêm lớp mưa 3D.','3D rain layer added.'),'success');}
  if(kind==='forest'){const id=uid();s.addLayer({id,name:t('Rừng cây Z-scatter','Forest Z-scatter'),kind:'scatter',assetId:'tree-card',scatter:{count:16,seed:71,zMin:-35,zMax:-2,width:8,assetIds:['tree-card']}});}
  if(kind==='sfx')s.addLayer({name:'ZAÀ… · SFX',assetId:'sfx',position:[1.5,1.5,-3],scale:[3,.98],rotation:[0,0,-.08],rim:true});
  if(kind==='panel')s.addLayer({name:t('Khung tranh manga','Manga panel'),assetId:'page-1',scale:[3,4.27],mask:'panel',shadow:true});
 };
 const layers=scene.layers.filter(l=>l.name.toLowerCase().includes(query.toLowerCase()));
 const assets=s.project.assets.filter(a=>a.name.toLowerCase().includes(query.toLowerCase()));
 return <aside className={`left-panel ${s.mobilePanel==='left'?'mobile-open':''}`}>
  <div className="panel-tabs"><button className={s.leftTab==='layers'?'active':''} onClick={()=>s.set({leftTab:'layers'})}><Layers3 size={14}/>{t('Lớp','Layers')}<span>{scene.layers.length}</span></button><button className={s.leftTab==='assets'?'active':''} onClick={()=>s.set({leftTab:'assets'})}><Image size={14}/>{t('Tài nguyên','Assets')}</button><button className="mobile-close icon-btn" onClick={()=>s.set({mobilePanel:null})}><X size={14}/></button></div>
  <div className="panel-search"><Search size={13}/><input placeholder={s.leftTab==='layers'?t('Tìm lớp…','Search layers…'):t('Tìm tài nguyên…','Search assets…')} value={query} onChange={e=>setQuery(e.target.value)}/><kbd>⌘F</kbd></div>
  <div className="left-scroll">
  {s.leftTab==='layers'?<>
   <div className="layer-tree-head"><span>{t('CẤU TRÚC SCENE','SCENE HIERARCHY')}</span><div><IconBtn icon={Plus} label={t('Thêm lớp','Add layer')} onClick={()=>setMenu(menu==='add'?null:'add')}/><IconBtn icon={MoreHorizontal} label={t('Tùy chọn lớp','Layer options')} onClick={()=>setMenu(menu==='more'?null:'more')}/></div></div>
   {menu&&<div className="inline-menu">{menu==='add'?<>{[['image',t('Ảnh / SVG','Image / SVG')],['panel',t('Khung tranh','Manga panel')],['sfx','SFX'],['rain',t('Mưa 3D','3D Rain')],['forest',t('Rừng Z-scatter','Forest scatter')]].map(([k,l])=><button key={k} onClick={()=>{quickAdd(k);setMenu(null);}}><Plus size={12}/>{l}</button>)}</>:<><button onClick={()=>{if(s.selection?.type==='layer')s.duplicateLayer();setMenu(null);}}><Copy size={12}/>{t('Nhân bản (D)','Duplicate (D)')}</button><button onClick={()=>{s.deleteSelected();setMenu(null);}}><Trash2 size={12}/>{t('Xóa (Del)','Delete (Del)')}</button><button onClick={()=>{s.set({modal:'assets'});setMenu(null);}}><Image size={12}/>{t('Thư viện tài nguyên','Asset library')}</button></>}</div>}
   <div className="scene-root"><ChevronRight size={12} className="open"/><Film size={13}/><span>{scene.name}</span><Badge>{scene.layers.length}</Badge></div>
   <div className="layer-list" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const assetId=e.dataTransfer.getData('assetId');if(assetId){const a=s.project.assets.find(a=>a.id===assetId);s.addLayer({name:a?.name??'Manga card',assetId,scale:a?.width&&a.height?[3,3*a.height/a.width]:[3,4.5]});}}}>
    {layers.map(l=>{const selected=s.selection?.type==='layer'&&s.selection.id===l.id;const Icon=l.kind==='environment'?CloudRain:l.kind==='scatter'?Trees:l.assetId==='sfx'?Type:l.assetId?.startsWith('page')?Image:Layers3;return <div key={l.id} className={`layer-row ${selected?'selected':''} ${!l.visible?'hidden-layer':''}`} onClick={()=>s.select({type:'layer',id:l.id})} draggable onDragStart={e=>e.dataTransfer.setData('layerId',l.id)} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.stopPropagation();const from=e.dataTransfer.getData('layerId');const assetId=e.dataTransfer.getData('assetId');if(assetId){s.updateLayer(l.id,x=>{x.assetId=assetId;});return;}if(from&&from!==l.id)s.updateScene(sc=>{const a=sc.layers.findIndex(x=>x.id===from),b=sc.layers.findIndex(x=>x.id===l.id);const [item]=sc.layers.splice(a,1);sc.layers.splice(b,0,item);});}}>
     <GripVertical size={11} className="grip"/><Icon size={14} className="layer-icon"/><span className="layer-name">{l.name}</span>{l.kind==='card'&&<span className="z-tag">{l.position[2]>0?'+':''}{l.position[2].toFixed(0)}</span>}<button className="row-action" title={l.visible?t('Ẩn lớp','Hide layer'):t('Hiện lớp','Show layer')} onClick={e=>{e.stopPropagation();s.updateScene(sc=>{const x=sc.layers.find(x=>x.id===l.id)!;x.visible=!x.visible;});}}>{l.visible?<Eye size={12}/>:<EyeOff size={12}/>}</button><button className={`row-action ${l.locked?'locked':''}`} title={l.locked?t('Mở khóa','Unlock'):t('Khóa lớp','Lock layer')} onClick={e=>{e.stopPropagation();s.updateScene(sc=>{const x=sc.layers.find(x=>x.id===l.id)!;x.locked=!x.locked;});}}>{l.locked?<Lock size={11}/>:<Unlock size={11}/>}</button>
    </div>;})}
    {layers.length===0&&<Empty icon={Search} title={t('Không tìm thấy lớp','No layers found')} desc={t('Thử từ khóa khác.','Try another keyword.')}/>}
   </div>
   <div className="layer-tree-head camera-head"><span>CAMERA</span><IconBtn icon={Plus} label={t('Thêm camera + cut','Add camera + cut')} onClick={s.addCamera}/></div>
   {scene.cameras.map(c=><div key={c.id} className={`layer-row camera-row ${s.selection?.type==='camera'&&s.selection.id===c.id?'selected':''}`} onClick={()=>s.select({type:'camera',id:c.id})}><GripVertical size={11} className="grip"/><Camera size={14} className="layer-icon"/><span className="layer-name">{c.name}</span><span className="z-tag">{c.type==='perspective'?'PERSP':'ORTHO'}</span></div>)}
   <div className="quick-add"><div className="layer-tree-head"><span>{t('THÊM NHANH','QUICK ADD')}</span></div><div className="quick-grid"><button onClick={()=>quickAdd('image')}><Image size={16}/><span>{t('Ảnh','Image')}</span></button><button onClick={()=>quickAdd('rain')}><CloudRain size={16}/><span>{t('Mưa 3D','Rain 3D')}</span></button><button onClick={()=>quickAdd('forest')}><Trees size={16}/><span>Z-scatter</span></button><button onClick={()=>quickAdd('sfx')}><Type size={16}/><span>SFX</span></button></div></div>
  </>:<>
   <div className="asset-lib-head"><span>{t('THƯ VIỆN DỰ ÁN','PROJECT LIBRARY')}</span><button className="text-button" onClick={addImage}><Upload size={12}/>{t('Tải lên','Upload')}</button></div>
   <div className="asset-grid">{assets.map(a=><button key={a.id} className="asset-card" draggable onDragStart={e=>e.dataTransfer.setData('assetId',a.id)} onClick={()=>{s.addLayer({name:a.name,assetId:a.id,scale:a.width&&a.height?[3,3*a.height/a.width]:[3,4.5]});s.notify(t('Đã thêm tài nguyên vào scene.','Asset added to scene.'),'success');}}><div className={`asset-thumb ${a.id==='ronin'||a.id==='tree-card'?'checker':''}`}><img src={a.thumbnail??a.url} alt={a.name} loading="lazy"/><span>{a.type.toUpperCase()}</span></div><span className="asset-name">{a.name}</span></button>)}</div>
   {assets.length===0&&<Empty icon={Image} title={t('Chưa có tài nguyên','No assets yet')} desc={t('Kéo thả ảnh hoặc bấm Tải lên.','Drop an image or click Upload.')} action={<button className="btn" onClick={addImage}>{t('Tải lên','Upload')}</button>}/>}
   <div className="dropzone" onClick={addImage} onDragOver={e=>e.preventDefault()} onDrop={async e=>{e.preventDefault();for(const f of Array.from(e.dataTransfer.files)){try{const a=await importAssetFile(f);s.addAsset(a);}catch(err){s.notify((err as Error).message,'error');}}}}><Upload size={18}/><span>{t('Kéo thả ảnh, SVG, audio, video','Drop images, SVG, audio, video')}</span><small>PNG · JPG · WEBP · SVG · MP3 · MP4 · GLB · VRM · JSON</small></div>
   <div className="layer-tree-head"><span>{t('PRESET CHUYỂN ĐỘNG','MOTION PRESETS')}</span><Sparkles size={12}/></div>
   <div className="preset-list">{cameraPresets.map((p,i)=>{const Icon=presetIcons[i];return <button key={p.id} onClick={()=>{const c=applyCameraPreset(activeCamera(scene,s.time),p.id,scene.duration);s.updateScene(sc=>{const idx=sc.cameras.findIndex(x=>x.id===c.id);sc.cameras[idx]=c;});s.select({type:'camera',id:c.id});s.notify(`${t('Đã áp dụng','Applied')} ${p.name}.`,'success');}}><Icon size={15}/><div><strong>{t(p.name,p.en)}</strong><small>{p.description}</small></div><ChevronRight size={12}/></button>;})}</div>
  </>}
  </div>
  <div className="left-footer"><button onClick={()=>s.set({modal:'workflow'})}><Sparkles size={14}/><span>{t('Quy trình 5 trang truyện','5-page comic workflow')}</span><ChevronRight size={13}/></button></div>
  <input ref={uploadRef} type="file" accept="image/*,.svg,.glb,.vrm,.json,.mp3,.wav,.mp4,.webm,audio/*,video/*" multiple hidden onChange={async e=>{for(const f of Array.from(e.target.files??[])){try{const a=await importAssetFile(f);s.addAsset(a);}catch(err){s.notify((err as Error).message,'error');}}e.target.value='';}}/>
 </aside>;
}
