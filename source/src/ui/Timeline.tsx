import { useRef, useState, useMemo } from 'react';
import { Play, Pause, SkipBack, SkipForward, ChevronFirst, ChevronLast, Repeat2, Magnet, Diamond, Plus, Trash2, Copy, ClipboardPaste, ZoomIn, ZoomOut, Flag, Camera, Layers3, CloudRain, Type, Image, ChevronDown, Scissors } from 'lucide-react';
import { useStudio, useActiveScene, activeCamera } from '../core/store/useStudio';
import { useT, IconBtn, Badge } from './primitives';
import { snapTime } from '../core/timeline/engine';
import { uid, clamp, type Layer } from '../core/types';
const TRACK_COLORS=['#80b7ad','#88aee0','#cfad7c','#ee9474','#a5a1c8','#8fc6a5','#d3a1b8'];
export function Timeline(){
 const s=useStudio();const scene=useActiveScene();const t=useT();const [zoom,setZoom]=useState(1);const [drag,setDrag]=useState<{layerId:string;property:string;keyId:string}|null>(null);
 const rulerRef=useRef<HTMLDivElement>(null);const scrollRef=useRef<HTMLDivElement>(null);const labelsRef=useRef<HTMLDivElement>(null);const [collapsed,setCollapsed]=useState(false);
 const width=Math.max(640,scene.duration*72*zoom);const pps=width/scene.duration;
 const ticks=useMemo(()=>{const step=zoom>=2?.25:zoom>=1.5?.5:1;const arr=[];for(let x=0;x<=scene.duration+.001;x+=step)arr.push(Number(x.toFixed(2)));return arr;},[scene.duration,zoom]);
 const timeFromEvent=(e:{clientX:number})=>{const r=rulerRef.current!.getBoundingClientRect();return clamp((e.clientX-r.left)/pps,0,scene.duration);};
 const scrub=(e:React.PointerEvent)=>{const raw=timeFromEvent(e);s.seek(snapTime(raw,scene.fps,scene.markers.map(m=>m.time),s.snap));};
 const iconFor=(l:Layer)=>l.kind==='environment'?CloudRain:l.assetId==='sfx'?Type:l.assetId?.startsWith('page')?Image:Layers3;
 const addMarker=()=>{s.updateScene(sc=>sc.markers.push({id:uid(),time:s.time,label:`Marker ${sc.markers.length+1}`}));s.notify(t('Đã thêm marker.','Marker added.'),'success');};
 const rows=scene.layers;
 return <section className={`timeline ${collapsed?'collapsed':''}`}>
  <div className="timeline-header">
   <div className="timeline-title"><button onClick={()=>setCollapsed(!collapsed)}><ChevronDown size={13} className={collapsed?'collapsed':''}/></button><strong>TIMELINE</strong><span className="scene-chip">{scene.name}</span><Badge>{scene.duration}s</Badge></div>
   <div className="transport"><IconBtn icon={ChevronFirst} label={t('Về đầu','Start')} onClick={()=>s.seek(0)}/><IconBtn icon={SkipBack} label={t('Frame trước','Previous frame')} onClick={()=>s.seek(s.time-1/scene.fps)}/><button className={`play-button ${s.playing?'playing':''}`} onClick={s.togglePlay} title="Space">{s.playing?<Pause size={15} fill="currentColor"/>:<Play size={15} fill="currentColor"/>}</button><IconBtn icon={SkipForward} label={t('Frame sau','Next frame')} onClick={()=>s.seek(s.time+1/scene.fps)}/><IconBtn icon={ChevronLast} label={t('Về cuối','End')} onClick={()=>s.seek(scene.duration)}/><IconBtn icon={Repeat2} label="Loop" active={s.loop} onClick={()=>s.set({loop:!s.loop})}/><div className="timecode"><strong>{s.time.toFixed(2).padStart(5,'0')}</strong><span>/ {scene.duration.toFixed(2)}s</span></div></div>
   <div className="timeline-actions"><select value={scene.fps} onChange={e=>s.updateScene(sc=>{sc.fps=Number(e.target.value);})} title="Timeline FPS"><option value={24}>24 fps</option><option value={30}>30 fps</option><option value={60}>60 fps</option></select><IconBtn icon={Magnet} label="Snap" active={s.snap} onClick={()=>s.set({snap:!s.snap})}/><IconBtn icon={Flag} label={t('Thêm marker','Add marker')} onClick={addMarker}/><span className="toolbar-divider"/><IconBtn icon={Copy} label="Copy keyframe (Ctrl+C)" onClick={s.copyKey}/><IconBtn icon={ClipboardPaste} label="Paste keyframe (Ctrl+V)" onClick={s.pasteKey}/><IconBtn icon={Trash2} label={t('Xóa keyframe đã chọn','Delete selected keyframe')} onClick={s.deleteKey}/><span className="toolbar-divider"/><IconBtn icon={ZoomOut} label="Zoom out" onClick={()=>setZoom(z=>Math.max(.5,z-.5))}/><IconBtn icon={ZoomIn} label="Zoom in" onClick={()=>setZoom(z=>Math.min(4,z+.5))}/></div>
  </div>
  {!collapsed&&<div className="timeline-body">
   <div className="track-labels" ref={labelsRef}>
    <div className="track-label ruler-label"><span>{t('LỚP / TRACK','LAYER / TRACK')}</span><button className="icon-btn" title={t('Thêm keyframe (K)','Add keyframe (K)')} onClick={()=>s.keyframe()}><Plus size={13}/></button></div>
    <div className="track-label shot-label"><Scissors size={12}/><span>SHOTS</span><span className="track-count">{scene.shots.length}</span></div>
    <div className={`track-label ${s.selection?.type==='camera'?'selected':''}`} onClick={()=>s.select({type:'camera',id:activeCamera(scene,s.time).id})}><Camera size={13}/><span>{activeCamera(scene,s.time).name}</span><button className="mini-diamond" onClick={e=>{e.stopPropagation();s.keyframe();}}><Diamond size={9}/></button></div>
    {rows.map((l,i)=>{const Icon=iconFor(l);return <div key={l.id} className={`track-label ${s.selection?.type==='layer'&&s.selection.id===l.id?'selected':''}`} onClick={()=>s.select({type:'layer',id:l.id})}><Icon size={13} style={{color:TRACK_COLORS[i%TRACK_COLORS.length]}}/><span>{l.name}</span><button className="mini-diamond" title={`Keyframe ${l.name}`} onClick={e=>{e.stopPropagation();s.select({type:'layer',id:l.id});setTimeout(()=>useStudio.getState().keyframe(),0);}}><Diamond size={9}/></button></div>;})}
   </div>
   <div className="track-scroll" ref={scrollRef} onScroll={e=>{if(labelsRef.current)labelsRef.current.scrollTop=e.currentTarget.scrollTop;}}>
    <div className="track-content" style={{width}}>
     <div className="ruler" ref={rulerRef} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);scrub(e);}} onPointerMove={e=>{if(e.buttons===1)scrub(e);}}>
      {ticks.map(x=><div key={x} className={`tick ${x%1===0?'major':''}`} style={{left:x*pps}}><span>{x%1===0||zoom>=2?`${x.toFixed(x%1===0?0:1)}s`:''}</span></div>)}
      {scene.markers.map(m=><button key={m.id} className="marker" style={{left:m.time*pps}} title={`${m.label} · ${m.time}s`} onClick={e=>{e.stopPropagation();s.seek(m.time);}}><Flag size={10} fill="currentColor"/></button>)}
     </div>
     <div className="shot-track">{scene.shots.map(sh=><button key={sh.id} className="shot-block" style={{left:sh.start*pps,width:sh.duration*pps,background:sh.color+'26',borderColor:sh.color+'66',color:sh.color}} onClick={()=>s.seek(sh.start)}><span style={{background:sh.color}}/>{sh.name}</button>)}</div>
     <div className="key-track camera-track" onPointerDown={e=>{if(e.target===e.currentTarget){s.select({type:'camera',id:activeCamera(scene,s.time).id});scrub(e);}}}>
      <div className="track-bar" style={{left:activeCamera(scene,s.time).start*pps,width:(scene.duration-activeCamera(scene,s.time).start)*pps}}/>
      {Object.entries(activeCamera(scene,s.time).tracks).flatMap(([p,tr])=>tr.keys.map(k=><button key={p+k.id} className="keyframe camera-key" style={{left:k.time*pps}} title={`${p} · ${k.time.toFixed(2)}s`} onClick={e=>{e.stopPropagation();s.select({type:'camera',id:activeCamera(scene,s.time).id});s.seek(k.time);}}><Diamond size={9} fill="currentColor"/></button>))}
     </div>
     {rows.map((l,i)=><div key={l.id} className={`key-track ${s.selection?.type==='layer'&&s.selection.id===l.id?'selected':''}`} onPointerDown={e=>{if(e.target===e.currentTarget){s.select({type:'layer',id:l.id});scrub(e);}}} onDoubleClick={e=>{s.select({type:'layer',id:l.id});s.seek(timeFromEvent(e));setTimeout(()=>useStudio.getState().keyframe(),0);}}>
      <div className="track-bar" style={{left:0,width:'100%',background:TRACK_COLORS[i%TRACK_COLORS.length]+'14',borderColor:TRACK_COLORS[i%TRACK_COLORS.length]+'30'}}/>
      {Object.entries(l.tracks).flatMap(([p,tr])=>tr.keys.map(k=>{const selected=s.selectedKey?.keyId===k.id;return <button key={p+k.id} className={`keyframe ${selected?'selected':''} ${k.easing==='step'?'step-key':''}`} style={{left:k.time*pps,color:TRACK_COLORS[i%TRACK_COLORS.length]}} title={`${l.name} · ${p} · ${k.time.toFixed(2)}s · ${k.easing}`} onClick={e=>{e.stopPropagation();s.select({type:'layer',id:l.id});s.set({selectedKey:{layerId:l.id,property:p,keyId:k.id}});s.seek(k.time);}} onPointerDown={e=>{e.stopPropagation();e.currentTarget.setPointerCapture(e.pointerId);setDrag({layerId:l.id,property:p,keyId:k.id});s.select({type:'layer',id:l.id});s.set({selectedKey:{layerId:l.id,property:p,keyId:k.id}});}} onPointerMove={e=>{if(drag?.keyId===k.id&&e.buttons===1){const nt=snapTime(timeFromEvent(e),scene.fps,scene.markers.map(m=>m.time),s.snap);s.updateLayer(l.id,x=>{const kk=x.tracks[p].keys.find(y=>y.id===k.id);if(kk)kk.time=nt;});s.seek(nt);}}} onPointerUp={()=>setDrag(null)}><Diamond size={9} fill="currentColor"/></button>;}))}
     </div>)}
     <div className="playhead" style={{left:s.time*pps}}><div className="playhead-cap"/><div className="playhead-line"/></div>
    </div>
   </div>
  </div>}
  <div className="timeline-footer"><span><kbd>Space</kbd> {t('Phát / dừng','Play / pause')}</span><span><kbd>K</kbd> Keyframe</span><span><kbd>D</kbd> {t('Nhân bản','Duplicate')}</span><span><kbd>Tab</kbd> {t('Đổi góc nhìn','Switch view')}</span><div className="timeline-footer-right"><span className="status-dot"/>{t('Tua chính xác tới mọi thời điểm t','Deterministic scrubbing to any time t')}<span className="footer-sep">·</span><button onClick={()=>s.set({modal:'shortcuts'})}>{t('Tất cả phím tắt','All shortcuts')}</button></div></div>
 </section>;
}
