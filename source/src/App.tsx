import { useEffect } from 'react';
import { Layers3, SlidersHorizontal, Keyboard, ShieldCheck, CircleHelp } from 'lucide-react';
import { useStudio } from './core/store/useStudio';
import { Topbar } from './ui/Topbar';
import { LeftPanel } from './ui/LeftPanel';
import { Inspector } from './ui/Inspector';
import { Timeline } from './ui/Timeline';
import { Dialogs } from './ui/Dialogs';
import { Toasts } from './ui/Toasts';
import { Viewport } from './modes/multiplane25d';
import { PlaybackDriver } from './core/render/PlaybackDriver';
import { useShortcuts } from './ui/useShortcuts';
import { installAgentAPI } from './core/agent/api';
import { useT } from './ui/primitives';
export default function App(){
 const hydrate=useStudio(s=>s.hydrate);const mobilePanel=useStudio(s=>s.mobilePanel);const set=useStudio(s=>s.set);const t=useT();
 useShortcuts();
 useEffect(()=>{hydrate();const clean=installAgentAPI();const ctxLost=(e:Event)=>{e.preventDefault();useStudio.getState().notify(t('Ngữ cảnh WebGL bị mất. Đang thử khôi phục…','WebGL context lost. Attempting to restore…'),'error');};const ctxRestored=()=>useStudio.getState().notify(t('Đã khôi phục WebGL.','WebGL restored.'),'success');const canvasEvents=(e:Event)=>{const c=e.target as HTMLCanvasElement;if(c.tagName==='CANVAS'){c.addEventListener('webglcontextlost',ctxLost);c.addEventListener('webglcontextrestored',ctxRestored);}};document.addEventListener('DOMNodeInserted',canvasEvents);return()=>{clean();document.removeEventListener('DOMNodeInserted',canvasEvents);};},[]);
 return <div className="app-shell">
  <Topbar/>
  <div className="studio-main">
   {mobilePanel&&<div className="mobile-scrim" onClick={()=>set({mobilePanel:null})}/>}
   <LeftPanel/>
   <main className="center-panel"><Viewport/><Timeline/></main>
   <Inspector/>
  </div>
  <footer className="app-statusbar"><div className="mobile-toggles"><button onClick={()=>set({mobilePanel:mobilePanel==='left'?null:'left'})}><Layers3 size={14}/>{t('Lớp','Layers')}</button><button onClick={()=>set({mobilePanel:mobilePanel==='right'?null:'right'})}><SlidersHorizontal size={14}/>{t('Thuộc tính','Properties')}</button></div><span className="statusbar-left"><span className="status-dot"/>{t('Sẵn sàng','Ready')}<span className="dim">·</span>MangaMotion Core v1.0</span><span className="statusbar-center"><ShieldCheck size={12}/>{t('Tất định · seek(t) chính xác','Deterministic · exact seek(t)')}</span><div className="statusbar-right"><button onClick={()=>set({modal:'shortcuts'})}><Keyboard size={13}/>{t('Phím tắt','Shortcuts')}</button><button onClick={()=>set({modal:'workflow'})}><CircleHelp size={13}/>{t('Hướng dẫn','Guide')}</button><span className="dim">Phase 1</span></div></footer>
  <PlaybackDriver/><Dialogs/><Toasts/>
 </div>;
}
