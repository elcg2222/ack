import { useRef, useState } from 'react';
import { Layers3, Box, PersonStanding, Clapperboard, Download, Undo2, Redo2, Code2, ChevronDown, Check, CloudUpload, CloudAlert, Globe, Sparkles, FolderOpen, Upload, Plus, Film } from 'lucide-react';
import { useStudio, activeScene } from '../core/store/useStudio';
import { useT, IconBtn, Badge } from './primitives';
import { exportProjectFile, readProjectFile } from '../core/store/persistence';
import { createDemoProject } from '../core/presets/demo';
import type { Workspace } from '../core/types';
const modes:{id:Workspace;vi:string;en:string;icon:typeof Box;phase?:string}[]=[
 {id:'multiplane25d',vi:'Multiplane 2.5D',en:'Multiplane 2.5D',icon:Layers3},
 {id:'blockout3d',vi:'3D Blockout',en:'3D Blockout',icon:Box,phase:'02'},
 {id:'character',vi:'Character',en:'Character',icon:PersonStanding,phase:'02'},
 {id:'composer',vi:'Composer',en:'Composer',icon:Clapperboard,phase:'03'},
 {id:'export',vi:'Export',en:'Export',icon:Download,phase:'03'},
];
export function Topbar(){
 const s=useStudio();const t=useT();const scene=activeScene(s.project);const fileRef=useRef<HTMLInputElement>(null);const [projectMenu,setProjectMenu]=useState(false);
 const SaveIcon=s.saveStatus==='saved'?Check:s.saveStatus==='saving'?CloudUpload:CloudAlert;
 const importFile=async(f:File|undefined)=>{if(!f)return;try{const p=await readProjectFile(f);s.load(p);s.notify(t('Đã nhập dự án cùng tài nguyên.','Project and assets imported.'),'success');}catch(e){s.notify((e as Error).message,'error');}finally{if(fileRef.current)fileRef.current.value='';}};
 return <header className="topbar">
  <div className="topbar-main">
   <div className="brand"><div className="brand-mark"><svg viewBox="0 0 36 36" width="30" height="30"><path d="M5 28V8h6l7 10 7-10h6v20h-7v-9l-6 8-6-8v9z" fill="currentColor"/><path d="M27 4L33 4 29 12 23 12Z" fill="#f2a077"/></svg></div><div className="brand-text"><strong>MANGAMOTION</strong><span>STUDIO <i>1.0</i></span></div></div>
   <div className="top-divider"/>
   <div className="project-switcher"><button onClick={()=>setProjectMenu(!projectMenu)}><FolderOpen size={14}/><span>{s.project.name}</span><ChevronDown size={12}/></button>{projectMenu&&<div className="dropdown project-dropdown"><div className="dropdown-label">{t('DỰ ÁN','PROJECT')}</div><button onClick={()=>{s.set({modal:'settings'});setProjectMenu(false);}}><Film size={14}/>{t('Cài đặt dự án & scene','Project & scene settings')}</button><button onClick={()=>{exportProjectFile(s.project);setProjectMenu(false);}}><Download size={14}/>{t('Xuất .json kèm tài nguyên','Export .json with assets')}</button><button onClick={()=>fileRef.current?.click()}><Upload size={14}/>{t('Nhập dự án .json','Import .json project')}</button><div className="dropdown-sep"/><div className="dropdown-label">{t('MỞ DỰ ÁN MẪU','OPEN DEMO')}</div><button onClick={()=>{s.load(createDemoProject());s.seek(1.25);s.select({type:'layer',id:'ronin'});setProjectMenu(false);s.notify(t('Đã mở dự án mẫu.','Demo project opened.'),'success');}}><Sparkles size={14}/>Chuyện của đêm · 3 scenes</button></div>}</div>
   <span className={`save-state ${s.saveStatus}`}><SaveIcon size={13}/>{s.saveStatus==='saved'?t('Đã lưu','Saved'):s.saveStatus==='saving'?t('Đang lưu…','Saving…'):t('Lỗi lưu','Save error')}</span>
   <div className="topbar-spacer"/>
   <div className="history-buttons"><IconBtn icon={Undo2} label="Undo (Ctrl+Z)" onClick={s.undo}/><IconBtn icon={Redo2} label="Redo (Ctrl+Y)" onClick={s.redo}/></div>
   <button className="lang-button" onClick={()=>s.set({locale:s.locale==='vi'?'en':'vi'})}><Globe size={13}/>{s.locale==='vi'?'VI':'EN'}<ChevronDown size={10}/></button>
   <select className="quality-select" value={s.quality} onChange={e=>s.set({quality:e.target.value as 'preview'|'high'})}><option value="preview">⚡ Preview</option><option value="high">✦ High quality</option></select>
   <button className="btn codelab-button" onClick={()=>s.set({modal:'codelab'})}><Code2 size={15}/><span>CodeLab</span><Badge tone="green">Agent</Badge></button>
   <button className="btn primary export-button" onClick={()=>s.set({modal:'export'})}><Download size={15}/><span>{t('Xuất video','Export video')}</span></button>
   <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={e=>importFile(e.target.files?.[0])}/>
  </div>
  <nav className="workspace-bar">
   <div className="workspace-tabs">{modes.map(m=><button key={m.id} className={`workspace-tab ${s.workspace===m.id?'active':''} ${m.phase?'future':''}`} onClick={()=>{if(m.phase){s.set({roadmap:m.id,modal:'roadmap'});}else s.set({workspace:m.id});}}><m.icon size={16}/><span>{t(m.vi,m.en)}</span>{m.phase?<span className="phase-tag">{t('SẮP CÓ','SOON')}</span>:<span className="active-dot"/>}</button>)}</div>
   <div className="scene-switcher"><span className="scene-label">{t('SCENE','SCENE')}</span><select value={scene.id} onChange={e=>{s.updateProject(p=>{p.activeSceneId=e.target.value;});s.seek(0);s.select(null);}}>{s.project.scenes.map((sc,i)=><option key={sc.id} value={sc.id}>{String(i+1).padStart(2,'0')} · {sc.name}</option>)}</select><button className="icon-btn" title={t('Thêm scene','Add scene')} onClick={()=>s.set({modal:'settings'})}><Plus size={14}/></button></div>
  </nav>
 </header>;
}
