import type { Asset } from '../types';
import { uid } from '../types';
export function detectAssetType(file:File):Asset['type']|null{
 const ext=file.name.split('.').pop()?.toLowerCase();
 if(file.type.startsWith('image/')||['png','jpg','jpeg','webp','gif','svg'].includes(ext??''))return ext==='svg'?'svg':'image';
 if(file.type.startsWith('audio/')||['mp3','wav','ogg','m4a'].includes(ext??''))return 'audio';
 if(file.type.startsWith('video/')||['mp4','webm','mov'].includes(ext??''))return 'video';
 if(ext==='glb'||ext==='gltf')return 'glb';if(ext==='vrm')return 'vrm';if(ext==='json')return 'lottie';return null;
}
export async function importAssetFile(file:File):Promise<Asset>{
 if(file.size>30*1024*1024)throw new Error(`“${file.name}” vượt quá 30 MB.`);
 const type=detectAssetType(file);if(!type)throw new Error(`Định dạng “${file.name}” chưa được hỗ trợ.`);
 const url=await new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result as string);r.onerror=()=>reject(new Error(`Không đọc được “${file.name}”.`));r.readAsDataURL(file);});
 if(type==='image'||type==='svg'){await new Promise<void>((resolve,reject)=>{const img=new window.Image();img.onload=()=>resolve();img.onerror=()=>reject(new Error(`Ảnh “${file.name}” bị hỏng hoặc không giải mã được.`));img.src=url;});}
 if(type==='lottie'){try{const j=JSON.parse(atob(url.split(',')[1]));if(!j.layers&&!j.assets)throw new Error();}catch{throw new Error('Lottie JSON không hợp lệ.');}}
 return {id:uid(),name:file.name,type,url,thumbnail:type==='image'||type==='svg'?url:undefined};
}
