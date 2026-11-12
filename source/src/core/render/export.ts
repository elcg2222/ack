import JSZip from 'jszip';
import type { Project, Scene } from '../types';
import { getCaptureEngine } from './registry';
import { downloadBlob } from '../store/persistence';
import { useStudio, activeScene } from '../store/useStudio';
export async function capturePNG(time:number,width?:number,height?:number){const e=getCaptureEngine();if(!e)throw new Error('Hãy mở Camera View và đợi renderer sẵn sàng trước khi xuất.');return e.capture(time,width,height);}
export async function exportCurrentFrame(width=1920,height=1080){const s=useStudio.getState();const blob=await capturePNG(s.time,width,height);downloadBlob(blob,`mangamotion-frame-${s.time.toFixed(2)}s.png`);}
export async function exportPNGSequence(scene:Scene,width=1280,height=720,fps=12,onProgress?:(p:number)=>void,signal?:AbortSignal){
 const zip=new JSZip();const total=Math.ceil(scene.duration*fps);
 for(let i=0;i<total;i++){if(signal?.aborted)throw new DOMException('Đã hủy xuất.','AbortError');const t=Math.min(i/fps,scene.duration);const blob=await capturePNG(t,width,height);zip.file(`frames/frame_${String(i).padStart(5,'0')}.png`,blob);onProgress?.((i+1)/total);await new Promise(r=>setTimeout(r,0));}
 zip.file('manifest.json',JSON.stringify({scene:scene.name,duration:scene.duration,fps,width,height,frames:total,deterministic:true},null,2));
 const blob=await zip.generateAsync({type:'blob'});downloadBlob(blob,`${scene.id}-png-sequence.zip`);
}
export async function exportWebM(onProgress?:(p:number)=>void,signal?:AbortSignal){
 const e=getCaptureEngine();if(!e)throw new Error('Renderer chưa sẵn sàng.');if(typeof MediaRecorder==='undefined'||!e.canvas.captureStream)throw new Error('Trình duyệt chưa hỗ trợ ghi WebM. Hãy dùng chuỗi PNG.');
 const s=useStudio.getState();const scene=activeScene(s.project);const mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(m=>MediaRecorder.isTypeSupported(m));if(!mime)throw new Error('Trình duyệt không hỗ trợ codec WebM.');
 s.seek(0);const stream=e.canvas.captureStream(scene.fps);const rec=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:8_000_000});const chunks:Blob[]=[];
 return new Promise<void>((resolve,reject)=>{let raf=0;let stopped=false;const start=performance.now();
  const cleanup=()=>{cancelAnimationFrame(raf);stream.getTracks().forEach(t=>t.stop());useStudio.setState({playing:false});};
  const stop=()=>{if(stopped)return;stopped=true;if(rec.state!=='inactive')rec.stop();};
  rec.ondataavailable=ev=>{if(ev.data.size)chunks.push(ev.data);};
  rec.onerror=()=>{cleanup();reject(new Error('Lỗi ghi WebM. Hãy thử chuỗi PNG.'));};
  rec.onstop=()=>{cleanup();if(signal?.aborted){reject(new DOMException('Đã hủy xuất.','AbortError'));return;}const blob=new Blob(chunks,{type:mime});downloadBlob(blob,`${scene.id}.webm`);resolve();};
  signal?.addEventListener('abort',stop,{once:true});rec.start(250);useStudio.setState({playing:true});
  const tick=(now:number)=>{const p=Math.min(1,(now-start)/1000/scene.duration);onProgress?.(p);if(p>=1||signal?.aborted)stop();else raf=requestAnimationFrame(tick);};raf=requestAnimationFrame(tick);
 });
}
export async function exportComicPages(project:Project){
 const zip=new JSZip();const pages=project.assets.filter(a=>a.id.startsWith('page-'));
 for(const a of pages){const svg=decodeURIComponent(escape(atob(a.url.split(',')[1])));zip.file(`${a.id}.svg`,svg);}
 const scene=project.scenes.find(s=>s.id==='five-pages');
 zip.file('project.mangamotion.json',JSON.stringify(project,null,2));
 zip.file('WORKFLOW.md',`# Chuyện của đêm — quy trình 5 trang\n\n1. Ý tưởng & kịch bản: thiết lập → nhịp bước → đối đầu → cao trào → kết thúc.\n2. Vẽ & tách lớp SVG trong suốt.\n3. Dàn cảnh Multiplane 2.5D, đặt Z và camera.\n4. Gán keyframe, mưa 3D, anime stepped FPS.\n5. Hậu kỳ manga: halftone, ink, vignette.\n6. Kiểm tra seek(t) và xuất bản.\n\nScene: ${scene?.name??'five-pages'} · ${scene?.duration??20}s · 5 shots × 4s.\nMở project.mangamotion.json trong MangaMotion Studio để tiếp tục chỉnh sửa.\n`);
 const contact=`<svg xmlns="http://www.w3.org/2000/svg" width="${pages.length*320+40}" height="500" viewBox="0 0 ${pages.length*320+40} 500"><rect width="100%" height="100%" fill="#17191c"/>${pages.map((a,i)=>`<image href="${a.url}" x="${20+i*320}" y="20" width="300" height="427"/><text x="${20+i*320}" y="475" fill="#e8e6df" font-family="sans-serif" font-size="14">Trang ${i+1}</text>`).join('')}</svg>`;
 zip.file('contact-sheet.svg',contact);
 const blob=await zip.generateAsync({type:'blob'});downloadBlob(blob,'chuyen-cua-dem-5-pages.zip');
}
