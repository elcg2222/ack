import { useRef, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Camera, Box, Columns2, Focus, Grid2X2, Scan, Maximize2, MousePointer2, Move3D, Rotate3D, Scaling, Eye, EyeOff, ChevronDown, Aperture, LoaderCircle } from 'lucide-react';
import { useStudio, useActiveScene } from '../../core/store/useStudio';
import { RenderScene } from '../../core/render/RenderScene';
import { ErrorBoundary } from '../../ui/ErrorBoundary';
import { seek } from '../../core/timeline/engine';
import type { ViewMode } from '../../core/types';
function Perf(){const frames=useRef(0),last=useRef(performance.now());useFrame(()=>{frames.current++;const now=performance.now();if(now-last.current>1200){useStudio.setState({fps:Math.min(120,Math.round(frames.current*1000/(now-last.current)))});frames.current=0;last.current=now;}});return null;}
function WebGLFallback(){const scene=useActiveScene();const asset=useStudio(s=>s.project.assets.find(a=>a.id==='forest'));return <div className="webgl-fallback"><img src={asset?.url} alt="Rừng mưa đêm"/><div><Aperture size={30}/><h3>WebGL không khả dụng</h3><p>Bật tăng tốc phần cứng hoặc thử trình duyệt khác. Timeline, chỉnh sửa và lưu JSON vẫn hoạt động.</p><button className="btn" onClick={()=>location.reload()}>Khởi động lại</button></div></div>;}
function Pane({mode,small=false}:{mode:'camera'|'stage';small?:boolean}){
 const scene=useActiveScene();const quality=useStudio(s=>s.quality);const guides=useStudio(s=>s.guides);const time=useStudio(s=>s.time);const view=useStudio(s=>s.view);const wireframe=useStudio(s=>s.wireframe);
 const state=seek(scene,time);const [ready,setReady]=useState(false);
 const ratio=scene.aspect==='16:9'?'16 / 9':scene.aspect==='9:16'?'9 / 16':'4 / 3';
 return <div className={`render-pane ${small?'small':''} ${mode==='stage'?'stage-pane':''}`}>
  <div className="canvas-wrap" style={mode==='camera'?{aspectRatio:ratio}:undefined}>
   <ErrorBoundary fallback={<WebGLFallback/>}><Suspense fallback={<div className="canvas-loading"><LoaderCircle className="spin"/> Đang dựng không gian…</div>}>
    <Canvas dpr={quality==='high'?[1,2]:1} gl={{antialias:true,alpha:false,preserveDrawingBuffer:true,powerPreference:'high-performance'}} camera={{position:[0,.2,6],fov:42}} frameloop="always" onCreated={()=>setReady(true)} fallback={<WebGLFallback/>} onContextMenu={e=>e.preventDefault()}>
     <RenderScene scene={scene} mode={mode}/><Perf/>
    </Canvas>
   </Suspense></ErrorBoundary>
   {mode==='camera'&&guides&&<div className="safe-frame"><i/><i/><i/><i/><span className="frame-center"/></div>}
   {mode==='camera'&&<><div className="viewport-badge"><span className="live-dot"/>{state.camera.type==='orthographic'?'ORTHOGRAPHIC':'PERSPECTIVE'}<span className="badge-divider"/>{small?'CAMERA':'CAM 01'}</div><div className="viewport-resolution">{scene.aspect} <span>·</span> {quality==='high'?'HIGH QUALITY':'PREVIEW'}</div><div className="viewport-bottom-left"><span className="rec-dot"/> SCENE 0{useStudio.getState().project.scenes.findIndex(s=>s.id===scene.id)+1} <span className="dim">/</span> {scene.name.toUpperCase()}</div><div className="viewport-time">{time.toFixed(2)}s <span>/ {scene.duration.toFixed(2)}s</span></div></>}
   {mode==='stage'&&<><div className="viewport-badge stage-badge"><Box size={12}/>3D STAGE</div><div className="stage-hint"><MousePointer2 size={12}/> Kéo để xoay · Cuộn chuột để zoom · Chuột phải để pan</div><div className="axis-gizmo"><span className="axis-y">Y</span><span className="axis-z">Z</span><span className="axis-x">X</span><i/></div></>}
   {!ready&&<div className="canvas-loading"><LoaderCircle className="spin"/> Đang tải lớp manga…</div>}
  </div>
 </div>;
}
export function Viewport(){
 const view=useStudio(s=>s.view),set=useStudio(s=>s.set),guides=useStudio(s=>s.guides),wireframe=useStudio(s=>s.wireframe);const scene=useActiveScene();const ref=useRef<HTMLDivElement>(null);
 const views:{id:ViewMode;label:string;icon:typeof Camera}[]=[{id:'camera',label:'Camera',icon:Camera},{id:'stage',label:'3D Stage',icon:Box},{id:'split',label:'Split',icon:Columns2}];
 return <section className="viewport-section" ref={ref}>
  <div className="viewport-toolbar">
   <div className="view-switch">{views.map(v=><button key={v.id} className={view===v.id?'active':''} onClick={()=>set({view:v.id})} title={`${v.label} (${v.id==='camera'?'1':v.id==='stage'?'2':'3'})`}><v.icon size={14}/><span>{v.label}</span></button>)}</div>
   <div className="viewport-tools"><span className="toolbar-divider"/><button className={guides?'tool active':'tool'} title="Khung an toàn" onClick={()=>set({guides:!guides})}><Scan size={15}/></button><button className={wireframe?'tool active':'tool'} title="Hiện viền lớp trong 3D Stage" onClick={()=>set({wireframe:!wireframe})}><Grid2X2 size={15}/></button><button className="tool" title="Focus lớp đang chọn (F)" onClick={()=>{useStudio.setState({view:'stage',focusVersion:useStudio.getState().focusVersion+1});}}><Focus size={15}/></button><span className="toolbar-divider"/><button className="tool" title="Toàn màn hình" onClick={()=>{if(document.fullscreenElement)document.exitFullscreen();else ref.current?.requestFullscreen?.().catch(()=>useStudio.getState().notify('Trình duyệt không cho phép toàn màn hình.','error'));}}><Maximize2 size={14}/></button></div>
  </div>
  <div className={`viewport-content ${view==='split'?'split':''}`}>
   {view==='split'?<><Pane mode="stage" small/><div className="split-divider"/><Pane mode="camera" small/></>:<Pane mode={view==='stage'?'stage':'camera'}/>}
  </div>
  <div className="viewport-status"><span><span className="status-dot"/> Three.js <span className="dim">·</span> WebGL 2</span><span>{scene.layers.length} layers <span className="dim">·</span> {scene.environment.count} particles</span><span className="viewport-status-right"><span className="dim">Engine</span> Deterministic <span className="tiny-check">✓</span></span></div>
 </section>;
}
