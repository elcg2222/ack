import { describe, it, expect } from 'vitest';
import { detectAssetType, importAssetFile, UNSUPPORTED_RENDER_MSG } from './import';
import { validateProject } from '../store/persistence';
import { createDemoProject } from '../presets/demo';

// --- Mocks môi trường trình duyệt (node test env) ---
declare const process:any;
const nodeRequire=(m:string)=>(0,eval)('require')(m);
const BufferCtor=(()=>{try{return nodeRequire('buffer').Buffer;}catch{return null;}})();
const b64encode=(bytes:Uint8Array|number[]):string=>{if(BufferCtor)return BufferCtor.from(bytes).toString('base64');let bin='';for(const b of bytes)bin+=String.fromCharCode(b);return globalThis.btoa?btoa(bin):bin;};
const b64decode=(s:string):Uint8Array=>{if(BufferCtor)return new Uint8Array(BufferCtor.from(s,'base64'));const bin=atob(s);const out=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);return out;};
(globalThis as any).FileReader=class{result='';onload:null|(()=>void)=null;onerror:null|(()=>void)=null;
 readAsDataURL(file:File){const buf=(file as any)._bytes??[];const mime=(file as any).type||'application/octet-stream';this.result=`data:${mime};base64,${b64encode(buf)}`;queueMicrotask(()=>this.onload?.());}};
(globalThis as any).window={Image:class{onload:null|(()=>void)=null;onerror:null|(()=>void)=null;naturalWidth=0;naturalHeight=0;
 set src(v:string){queueMicrotask(()=>{const file=(globalThis as any).__currentFile;if(file&&file.__failDecode){this.onerror?.();return;}const mime=v.slice(5,v.indexOf(';'));const b64=v.split(',')[1]??'';const bytes=b64decode(b64);
  if(mime.startsWith('image/png')&&bytes.length>24&&bytes[1]===0x50&&file?.__pngSize){const s=file.__pngSize;this.naturalWidth=s[0];this.naturalHeight=s[1];}
  else if(mime.startsWith('image/svg')){this.naturalWidth=8;this.naturalHeight=8;}
  else {this.naturalWidth=0;this.naturalHeight=0;}
  this.onload?.();});}}};
// btoa/atob cho node
if(typeof (globalThis as any).btoa!=='function'){(globalThis as any).btoa=(s:string)=>{const u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i)&0xff;return b64encode(u);};}
if(typeof (globalThis as any).atob!=='function'){(globalThis as any).atob=(s:string)=>Array.from(b64decode(s)).map(b=>String.fromCharCode(b)).join('');}

const mkFile=(name:string,type:string,bytes:number[],pngSize?:[number,number])=>{const f=new File([Uint8Array.from(bytes)],name,{type}) as any;(f as any)._bytes=bytes;f.__pngSize=pngSize;(globalThis as any).__currentFile=f;return f as File;};
// PNG tối giản để so khớp regex MIME + có "kích thước" giả lập qua __pngSize
const PNG_BYTES=[0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,...Array.from({length:24},(_,i)=>i)];

describe('detectAssetType',()=>{
 it('nhận diện ảnh thường và SVG theo mime/đuôi',()=>{
  expect(detectAssetType(mkFile('a.PNG','image/png',PNG_BYTES))).toBe('image');
  expect(detectAssetType(mkFile('b.svg','image/svg+xml',[]))).toBe('svg');
  expect(detectAssetType(mkFile('c.svg','',[]))).toBe('svg');
  expect(detectAssetType(mkFile('d.mp3','audio/mpeg',[]))).toBe('audio');
  expect(detectAssetType(mkFile('e.glb','',[]))).toBe('glb');
  expect(detectAssetType(mkFile('f.bin','application/octet-stream',[]))).toBeNull();
 });
});

describe('importAssetFile — ảnh hợp lệ',()=>{
 it('trả về data URI đúng MIME, giữ nguyên tên file Unicode, có width/height',async()=>{
  const name='hình-ảnh-日本語·١٠.png';
  const a=await importAssetFile(mkFile(name,'image/png',PNG_BYTES,[16,9]));
  expect(a.name).toBe(name);
  expect(a.type).toBe('image');
  expect(a.url.startsWith(`data:image/png;base64,`)).toBe(true);
  expect(a.thumbnail).toBe(a.url);
  expect(a.width).toBe(16);expect(a.height).toBe(9);
 });
 it('SVG được phân loại svg và giữ tên Unicode',async()=>{
  const a=await importAssetFile(mkFile('tượng-trưng.svg','image/svg+xml',[60,115,118,103]));
  expect(a.type).toBe('svg');expect(a.url.startsWith('data:image/svg+xml')).toBe(true);
 });
 it('ảnh hỏng → lỗi dễ hiểu',async()=>{const f=mkFile('hong.png','image/png',PNG_BYTES);(f as any).__failDecode=true;await expect(importAssetFile(f)).rejects.toThrow(/bị hỏng|không giải mã/);});
});

describe('importAssetFile — định dạng chưa render được phải báo rõ, không giả vờ support',()=>{
 for(const [fname,mime] of [['clip.mp4','video/mp4'],['nhac.mp3','audio/mpeg'],['model.glb','model/gltf-binary'],['x.vrm',''],['an.json','application/json']] as [string,string][]){
  it(`${fname} → lỗi nêu rõ "chưa được hỗ trợ"`,async()=>{await expect(importAssetFile(mkFile(fname,mime,[1,2,3]))).rejects.toThrow(/chưa được hỗ trợ/);});
 }
 it('thông báo chứa giải thích CHƯA render (không im lặng nhận bừa)',async()=>{let msg='';try{await importAssetFile(mkFile('a.glb','',[]));}catch(e){msg=(e as Error).message;}expect(msg+UNSUPPORTED_RENDER_MSG).toMatch(/CHƯA render|chưa được hỗ trợ/i);});
});

describe('round-trip save/import qua schema v1',()=>{
 it('Unicode filename + data URI sống sót JSON.stringify → validateProject',async()=>{
  const asset=await importAssetFile(mkFile('trang-第一页·éè.png','image/png',PNG_BYTES,[4,3]));
  const p=createDemoProject() as any;
  p.assets.push(structuredClone(asset));
  p.scenes[0].layers.push({id:'l-u',name:'Lớp Unicode',kind:'card',assetId:asset.id,position:[0,0,-1],rotation:[0,0,0],scale:[1,1],opacity:1,visible:true,locked:false,billboard:false,compensate:false,blend:'normal',mask:'none',shadow:false,rim:false,posterize:0,color:'#ffffff',tracks:{}});
  const restored=validateProject(JSON.parse(JSON.stringify(p)));
  const back=restored.assets.find(a=>a.id===asset.id)!;
  expect(back.name).toBe('trang-第一页·éè.png');
  expect(back.url).toBe(asset.url);
  expect(back.width).toBe(4);
 });
});
