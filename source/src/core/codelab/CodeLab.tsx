import { useEffect, useRef, useState } from 'react';
import Editor, { loader } from '@monaco-editor/react';
import type * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { Play, Square, Copy, RotateCcw, Terminal, CheckCircle2, XCircle, Info, ChevronDown, BookOpen, LoaderCircle } from 'lucide-react';
import { executeAgentCommand, AGENT_COMMANDS, agentSchema } from '../agent/api';
import { useStudio } from '../store/useStudio';
import { useT } from '../../ui/primitives';
// Monaco được phục vụ cục bộ từ public/monaco/vs (không CDN, không backend).
loader.config({ paths: { vs: '/monaco/vs' } });
const DEFAULT_CODE=`// MangaMotion Agent API — chạy trong sandbox iframe.
// Mọi lệnh đều đi qua cầu nối được kiểm soát tới Core Engine.

const state = await api.getState();
console.log('Scene hiện tại:', state.project.activeSceneId);

// Tua tới đúng khoảnh khắc chớp sáng
await api.seek({ time: 2.5 });

// Đẩy mưa dày hơn và đổi sang manga đen trắng
await api.setEnvironment({ count: 1200, fallSpeed: 8 });
await api.setShader({ bw: true, dotSize: 4 });

// Kiểm tra tính tất định của seek(t)
const test = await api.runSelfTest();
console.log('Determinism:', test.pass ? 'PASS · drift = 0' : 'FAIL');

return { time: 2.5, particles: 1200, determinism: test.pass };`;
const SNIPPETS=[
 {name:'Rain + B&W look',code:DEFAULT_CODE},
 {name:'Dolly camera 8s',code:`await api.seek({ time: 0 });\nawait api.applyCameraPreset({ preset: 'dolly' });\nawait api.play();\nconsole.log('Đang phát dolly xuyên rừng.');\nreturn { preset: 'dolly', duration: 8 };`},
 {name:'Thêm lớp SFX',code:`const { id } = await api.addLayer({\n  layer: { name: 'SFX mới', assetId: 'sfx', position: [1.6, 1.4, -3], scale: [3, 0.98], rotation: [0, 0, -0.08], rim: true }\n});\nawait api.seek({ time: 1.2 });\nconsole.log('Đã tạo layer', id);\nreturn { id };`},
 {name:'Snapshot JSON',code:`const state = await api.getState();\nconsole.log(JSON.stringify(state.project, null, 2).slice(0, 4000));\nreturn { scenes: state.project.scenes.length, assets: state.project.assets.length };`},
 {name:'Determinism self-test',code:`const result = await api.runSelfTest();\nconsole.log(JSON.stringify(result, null, 2));\nreturn result;`},
];
interface LogLine{type:'log'|'error'|'result'|'info';text:string;time:string}
const SANDBOX_HTML=`<!doctype html><html><body><script>
const pending=new Map();let seq=0;
const send=(m)=>parent.postMessage(m,'*');
const api=new Proxy({},{get:(_,method)=>(...args)=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});send({source:'mangamotion-sandbox',type:'api',id,method,args:args[0]??{}});setTimeout(()=>{if(pending.has(id)){pending.delete(id);reject(new Error('API timeout: '+method));}},15000);})});
window.addEventListener('message',async(e)=>{const m=e.data;if(!m||m.source!=='mangamotion-host')return;
 if(m.type==='api-result'){const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(new Error(m.error)):p.resolve(m.result);}return;}
 if(m.type==='run'){const console={log:(...a)=>send({source:'mangamotion-sandbox',type:'log',level:'log',text:a.map(x=>typeof x==='string'?x:JSON.stringify(x)).join(' ')}),error:(...a)=>send({source:'mangamotion-sandbox',type:'log',level:'error',text:a.map(String).join(' ')}),warn:(...a)=>send({source:'mangamotion-sandbox',type:'log',level:'info',text:a.map(String).join(' ')})};
  try{const fn=new Function('api','console','return (async()=>{'+m.code+'\\n})()');const result=await fn(api,console);send({source:'mangamotion-sandbox',type:'done',result:result===undefined?null:result});}catch(err){send({source:'mangamotion-sandbox',type:'done',error:err.message||String(err),stack:err.stack});}}
});
send({source:'mangamotion-sandbox',type:'ready'});
<\/script></body></html>`;
export function CodeLab(){
 const t=useT();const notify=useStudio(s=>s.notify);const [code,setCode]=useState(DEFAULT_CODE);const [logs,setLogs]=useState<LogLine[]>([{type:'info',text:'Sandbox sẵn sàng. API bridge chỉ cho phép các lệnh MangaMotion đã khai báo.',time:'00:00'}]);const [running,setRunning]=useState(false);const [snippet,setSnippet]=useState(0);const [showRef,setShowRef]=useState(false);
 const iframeRef=useRef<HTMLIFrameElement>(null);const readyRef=useRef(false);const timeoutRef=useRef<ReturnType<typeof setTimeout>>();const editorRef=useRef<monaco.editor.IStandaloneCodeEditor|null>(null);
 const stamp=()=>new Date().toLocaleTimeString('vi-VN',{hour12:false});
 useEffect(()=>{const handler=async(e:MessageEvent)=>{if(e.source!==iframeRef.current?.contentWindow)return;const m=e.data;if(!m||m.source!=='mangamotion-sandbox')return;
  if(m.type==='ready'){readyRef.current=true;return;}
  if(m.type==='log'){setLogs(l=>[...l,{type:m.level,text:m.text,time:stamp()}]);return;}
  if(m.type==='api'){try{if(!AGENT_COMMANDS.includes(m.method))throw new Error(`Lệnh không được phép: ${m.method}`);const result=await executeAgentCommand(m.method,m.args);iframeRef.current?.contentWindow?.postMessage({source:'mangamotion-host',type:'api-result',id:m.id,result:JSON.parse(JSON.stringify(result,(k,v)=>v instanceof Blob?{blob:true,size:v.size}:v))},'*');}catch(err){iframeRef.current?.contentWindow?.postMessage({source:'mangamotion-host',type:'api-result',id:m.id,error:(err as Error).message},'*');}return;}
  if(m.type==='done'){clearTimeout(timeoutRef.current);setRunning(false);if(m.error)setLogs(l=>[...l,{type:'error',text:m.error,time:stamp()}]);else setLogs(l=>[...l,{type:'result',text:typeof m.result==='string'?m.result:JSON.stringify(m.result,null,2),time:stamp()}]);}
 };window.addEventListener('message',handler);return()=>{window.removeEventListener('message',handler);clearTimeout(timeoutRef.current);};},[]);
 const run=()=>{if(!readyRef.current){notify('Sandbox đang khởi động, thử lại sau giây lát.','info');return;}setRunning(true);setLogs([{type:'info',text:t('Đang chạy code trong sandbox…','Running code in sandbox…'),time:stamp()}]);timeoutRef.current=setTimeout(()=>{setRunning(false);setLogs(l=>[...l,{type:'error',text:'Timeout 20s. Code có thể bị treo hoặc gọi API quá lâu.',time:stamp()}]);},20000);iframeRef.current?.contentWindow?.postMessage({source:'mangamotion-host',type:'run',code},'*');};
 useEffect(()=>{const h=(e:KeyboardEvent)=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();run();}};window.addEventListener('keydown',h);return()=>window.removeEventListener('keydown',h);},[code]);
 return <div className="codelab">
  <div className="codelab-toolbar"><select value={snippet} onChange={e=>{const i=Number(e.target.value);setSnippet(i);setCode(SNIPPETS[i].code);}}>{SNIPPETS.map((s,i)=><option key={i} value={i}>{s.name}</option>)}</select><button className="btn" onClick={()=>{navigator.clipboard?.writeText(code);notify(t('Đã sao chép code.','Code copied.'),'success');}}><Copy size={13}/>Copy</button><button className="btn" onClick={()=>{setCode(DEFAULT_CODE);setLogs([]);}}><RotateCcw size={13}/>Reset</button><div className="spacer"/><button className="btn" onClick={()=>setShowRef(!showRef)}><BookOpen size={13}/>API Reference<ChevronDown size={11} className={showRef?'':'collapsed'}/></button><button className="btn primary" onClick={run} disabled={running}>{running?<LoaderCircle size={14} className="spin"/>:<Play size={14}/>} {running?t('Đang chạy…','Running…'):t('Chạy code','Run code')}<kbd>Ctrl↵</kbd></button></div>
  {showRef&&<div className="api-reference"><strong>window.MangaMotion · Agent API v1</strong><p>{t('Mỗi lệnh nhận một object tham số và trả về Promise. Có thể gọi trực tiếp từ console trình duyệt hoặc qua sandbox.','Each command takes one argument object and returns a Promise. Call from the browser console or through the sandbox.')}</p><div>{AGENT_COMMANDS.map(c=><code key={c}>{c}</code>)}</div><pre>{JSON.stringify(agentSchema.examples,null,2)}</pre></div>}
  <div className="codelab-main"><div className="editor-wrap"><div className="editor-tab"><span className="js-icon">JS</span> agent-script.js <span className="sandbox-tag">sandbox iframe</span></div><Editor height="100%" defaultLanguage="javascript" value={code} onChange={v=>setCode(v??'')} theme="vs-dark" onMount={e=>{editorRef.current=e;}} options={{fontSize:13,fontFamily:'ui-monospace, SFMono-Regular, Menlo, monospace',minimap:{enabled:false},scrollBeyondLastLine:false,padding:{top:14},lineNumbersMinChars:3,automaticLayout:true,tabSize:2,wordWrap:'on'}}/></div>
   <div className="console-panel"><div className="console-head"><Terminal size={13}/><strong>CONSOLE</strong><span>{logs.length}</span><button className="icon-btn" onClick={()=>setLogs([])} title="Clear console"><RotateCcw size={12}/></button></div><div className="console-lines">{logs.map((l,i)=><div key={i} className={`console-line ${l.type}`}>{l.type==='error'?<XCircle size={12}/>:l.type==='result'?<CheckCircle2 size={12}/>:<Info size={12}/>}<span className="log-time">{l.time}</span><pre>{l.text}</pre></div>)}{running&&<div className="console-line info"><LoaderCircle size={12} className="spin"/><span>{t('Đang thực thi…','Executing…')}</span></div>}</div></div>
  </div>
  <iframe ref={iframeRef} title="MangaMotion code sandbox" sandbox="allow-scripts" srcDoc={SANDBOX_HTML} style={{display:'none'}}/>
 </div>;
}
