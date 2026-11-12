import { describe, it, expect, beforeEach } from 'vitest';
import { validateProject, saveProject, loadProject } from './persistence';
import { createDemoProject } from '../presets/demo';

// --- Mini IndexedDB mock (đủ dùng: open, objectStoreNames, put/get, mô phỏng quota) ---
class MockRequest { onsuccess:null|(()=>void)=null; onerror:null|(()=>void)=null; result:unknown=undefined; error:unknown=undefined;
  private done:(v:unknown)=>void; private failFn:(e:unknown)=>void;
  constructor(exec:(done:(v:unknown)=>void,fail:(e:unknown)=>void)=>void){let s=false;this.done=v=>{if(!s){s=true;this.result=v;queueMicrotask(()=>this.onsuccess?.());}};this.failFn=e=>{if(!s){s=true;this.error=e;queueMicrotask(()=>this.onerror?.( ));}};exec(this.done,this.failFn);}
}
class MockObjectStore {constructor(private map:Map<string,unknown>,private name:string){}
  put(value:unknown,key:string){return new MockRequest(done=>{const ev=(globalThis as any).__idbPrePutError;if(ev){(globalThis as any).__idbPrePutError=null;setTimeout(()=>this.map.set(key,value),0);done(undefined);return;}this.map.set(key,value);done(undefined);});}
  get(key:string){return new MockRequest(done=>done(this.map.get(key)));}
}
class MockTransaction {error:unknown=null;oncomplete:null|(()=>void)=null;onerror:null|(()=>void)=null;onabort:null|(()=>void)=null;
  private store:MockObjectStore;private req?:MockRequest;
  constructor(private map:Map<string,unknown>,name:string,private mode:string){this.store=new MockObjectStore(map,name);
   const preErr=(globalThis as any).__idbTxError;
   if(preErr){(globalThis as any).__idbTxError=null;setTimeout(()=>{this.error=preErr;this.onerror?.();this.onabort?.();},0);}
   else setTimeout(()=>this.oncomplete?.(),0);}
  objectStore(){return this.store;}
}
class MockDB {constructor(private maps:Map<string,Map<string,unknown>>){}
  objectStoreNames={contains:(n:string)=>this.maps.has(n)};
  createObjectStore(n:string){this.maps.set(n,new Map());return{};}
  transaction(name:string,mode:string){if(!this.maps.has(name))throw Object.assign(new Error('no such store'),{name:'NotFoundError'});return new MockTransaction(this.maps.get(name)!,name,mode);}
  close(){}
}
const maps=new Map<string,Map<string,unknown>>();
(globalThis as any).indexedDB={open(){const r={onupgradeneeded:null as null|(()=>void),onsuccess:null as null|(()=>void),onerror:null as null|(()=>void),result:null as MockDB|null};
  queueMicrotask(()=>{const db=new MockDB(maps);r.result=db;r.onupgradeneeded?.();r.onsuccess?.();});return r;}};

const clone=()=>JSON.parse(JSON.stringify(createDemoProject()));

describe('validateProject — schema sâu (schemaVersion=1)',()=>{
 it('chấp nhận project demo gốc (round-trip JSON giữ nguyên)',()=>{const p=clone();const v=validateProject(p);expect(v.scenes).toHaveLength(3);expect(JSON.stringify(v)).toBe(JSON.stringify(p));});
 it('từ chối malformed/không phải object',()=>{for(const bad of [null,undefined,'chuỗi',42,[]])expect(()=>validateProject(bad)).toThrow(/Dự án không hợp lệ/);});
 it('từ chối sai schemaVersion',()=>{const p=clone();p.schemaVersion=2;expect(()=>validateProject(p)).toThrow(/schemaVersion = 1/);});
 it('từ chối revision/updatedAt hỏng',()=>{const p=clone();p.revision='abc' as any;expect(()=>validateProject(p)).toThrow(/revision/);const q=clone();q.updatedAt='không-phải-iso';expect(()=>validateProject(q)).toThrow(/updatedAt/);});
 it('bắt asset trùng id và thiếu tên',()=>{const p=clone();p.assets.push({...structuredClone(p.assets[0])});expect(()=>validateProject(p)).toThrow(/trùng/);const q=clone();q.assets[0].name='';expect(()=>validateProject(q)).toThrow(/tài nguyên/);});
 it('từ chối URL ngoài (http/blob) thay vì data URI',()=>{const p=clone();p.assets[0].url='https://cdn.example.com/a.png';expect(()=>validateProject(p)).toThrow(/data URI|URL ngoài/);});
 it('từ chối type asset không hợp lệ',()=>{const p=clone();(p.assets[0] as any).type='exe';expect(()=>validateProject(p)).toThrow(/type không hợp lệ/);});
 it('bắt layer tham chiếu assetId không tồn tại',()=>{const p=clone();p.scenes[0].layers[1].assetId='khong-ton-tai';expect(()=>validateProject(p)).toThrow(/tài nguyên không tồn tại/);});
 it('bắt scatter.assetIds tham chiếu missing',()=>{const p=clone();const sc=p.scenes[0].layers.find((l:any)=>l.kind==='scatter');sc.scatter.assetIds=['ma-id'];expect(()=>validateProject(p)).toThrow(/scatter/i);});
 it('bắt NaN/Infinity trong transform',()=>{const p=clone();p.scenes[0].layers[0].position[1]=NaN;expect(()=>validateProject(p)).toThrow(/transform|không hợp lệ/);const q=clone();q.scenes[0].cameras[0].zoom=Infinity;expect(()=>validateProject(q)).toThrow(/camera/);});
 it('bắt count hạt âm/vượt trần và fps ngoài khoảng',()=>{const p=clone();p.scenes[0].environment.count=-5;expect(()=>validateProject(p)).toThrow(/hạt|scene/);const q=clone();q.scenes[0].fps=0;expect(()=>validateProject(q)).toThrow(/scene/);});
 it('bắt activeSceneId trỏ scene không tồn tại',()=>{const p=clone();p.activeSceneId='scene-ma';expect(()=>validateProject(p)).toThrow(/scene đang chọn/);});
 it('bắt track property lạ (lỗi dễ hiểu)',()=>{const p=clone();p.scenes[0].layers[0].tracks['gravity']={property:'gravity',keys:[{id:'k',time:0,value:1,easing:'linear',bezier:[0,0,1,1]}]};expect(()=>validateProject(p)).toThrow(/track layer không rõ thuộc tính/);});
 it('bắt keyframe easing/easings sai',()=>{const p=clone();const l=p.scenes[0].layers.find((x:any)=>x.tracks['position.y']);l.tracks['position.y'].keys[0].easing='elastic';expect(()=>validateProject(p)).toThrow(/keyframe bị hỏng/);});
 it('bắt camera id trùng và shot start tràn duration',()=>{const p=clone();p.scenes[0].cameras.push(structuredClone(p.scenes[0].cameras[0]));expect(()=>validateProject(p)).toThrow(/camera/);const q=clone();q.scenes[0].shots[0].start=999;expect(()=>validateProject(q)).toThrow(/shot/);});
});

describe('saveProject/loadProject — lỗi IndexedDB không được báo "saved"',()=>{
 beforeEach(()=>{maps.clear();(globalThis as any).__idbTxError=null;(globalThis as any).__idbPrePutError=null;});
 it('round-trip lưu rồi đọc lại khớp từng field',async()=>{const p=clone();validateProject(p);await saveProject(p);const loaded=await loadProject();expect(loaded).toEqual(p);});
 it('loadProject trả undefined khi chưa có gì',async()=>{expect(await loadProject()).toBeUndefined();});
 it('saveProject TỪ CHỐI khi transaction abort do QuotaExceeded (không resolve = không "saved")',async()=>{const p=clone();(globalThis as any).__idbTxError=Object.assign(new Error('quota'),{name:'QuotaExceededError'});await expect(saveProject(p)).rejects.toThrow(/Bộ nhớ đầy|Bị hủy|CHƯA được lưu/i);});
 it('saveProject từ chối dữ liệu tự nó không hợp lệ trước khi ghi DB',async()=>{const p=clone();p.activeSceneId='ma';await expect(saveProject(p)).rejects.toThrow(/scene đang chọn/);});
});
