import type { Asset } from '../types';
import { uid } from '../types';
export const RENDERABLE_ASSET_TYPES:Asset['type'][]=['image','svg'];
const UNSUPPORTED_HINT='Hiện studio chỉ render ảnh PNG/JPG/WEBP/GIF/SVG; tệp này được lưu vào thư viện nhưng chưa dùng trong 2.5D stage được.';
// Trả về lỗi dễ hiểu cho định dạng app CHƯA hỗ trợ, null nếu hỗ trợ đầy đủ.
export function unsupportedFormatReason(type:Asset['type']):string|null{
 switch(type){
  case 'glb':case 'vrm':return `Định dạng ${type.toUpperCase()} chưa được hỗ trợ render trong bản 2.5D này. ${UNSUPPORTED_HINT}`;
  case 'audio':case 'video':return `${type==='audio'?'Âm thanh':'Video'} chưa được hỗ trợ timeline trong bản 2.5D này. ${UNSUPPORTED_HINT}`;
  case 'lottie':return `Lottie JSON chưa được hỗ trợ render trong bản 2.5D này. ${UNSUPPORTED_HINT}`;
  default:return null;
 }
}
export function detectAssetType(file:File):Asset['type']|null{
 const ext=file.name.split('.').pop()?.toLowerCase();
 if(file.type.startsWith('image/')||['png','jpg','jpeg','webp','gif','svg'].includes(ext??''))return ext==='svg'||file.type==='image/svg+xml'?'svg':'image';
 if(file.type.startsWith('audio/')||['mp3','wav','ogg','m4a'].includes(ext??''))return 'audio';
 if(file.type.startsWith('video/')||['mp4','webm','mov'].includes(ext??''))return 'video';
 if(ext==='glb'||ext==='gltf')return 'glb';if(ext==='vrm')return 'vrm';if(ext==='json')return 'lottie';return null;
}
export async function importAssetFile(file:File):Promise<Asset>{
 if(file.size>30*1024*1024)throw new Error(`“${file.name}” vượt quá 30 MB.`);
 const type=detectAssetType(file);if(!type)throw new Error(`Định dạng “${file.name}” chưa được hỗ trợ.`);
 const url=await new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result as string);r.onerror=()=>reject(new Error(`Không đọc được “${file.name}”.`));r.readAsDataURL(file);});
 let width:number|undefined,height:number|undefined;
 if(type==='image'||type==='svg'){const dims=await new Promise<{w:number;h:number}>((resolve,reject)=>{const img=new window.Image();img.onload=()=>resolve({w:img.naturalWidth,h:img.naturalHeight});img.onerror=()=>reject(new Error(`Ảnh “${file.name}” bị hỏng hoặc không giải mã được.`));img.src=url;});width=dims.w;height=dims.h;if(type==='image'&&(!width||!height))throw new Error(`Ảnh “${file.name}” không có kích thước hợp lệ (0×0).`);}
 if(type==='lottie'){try{const j=JSON.parse(atob(url.split(',')[1]));if(!j.layers&&!j.assets)throw new Error();}catch{throw new Error('Lottie JSON không hợp lệ.');}}
 const reason=unsupportedFormatReason(type);
 if(reason)console.warn(`[import] ${file.name}: ${reason}`);
 // name giữ nguyên tên gốc (kể cả Unicode) để round-trip qua save/load không đổi tên.
 return {id:uid(),name:file.name,type,url,width,height,thumbnail:type==='image'||type==='svg'?url:undefined};
}
