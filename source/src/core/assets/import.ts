import type { Asset } from '../types';
import { uid } from '../types';
/** Chỉ ảnh/SVG thực sự render trên sân khấu 2.5D. Các định dạng khác được NHẬN vào thư viện kèm cảnh báo. */
export const RENDERABLE_ASSET_TYPES:Asset['type'][]=['image','svg'];
export const UNSUPPORTED_RENDER_MSG='Tệp được nhận vào thư viện nhưng trình xem 2.5D hiện CHƯA render được định dạng này (chỉ ảnh/SVG hiển thị trên sân khấu).';
export function unsupportedFormatReason(type:Asset['type']):string|null{
 switch(type){
  case 'glb':case 'vrm':return `Định dạng ${type.toUpperCase()} chưa được hỗ trợ render trong bản 2.5D này. ${UNSUPPORTED_RENDER_MSG}`;
  case 'audio':case 'video':return `${type==='audio'?'Âm thanh':'Video'} chưa được hỗ trợ timeline trong bản 2.5D này. ${UNSUPPORTED_RENDER_MSG}`;
  case 'lottie':return `Lottie JSON chưa được hỗ trợ render trong bản 2.5D này. ${UNSUPPORTED_RENDER_MSG}`;
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
 if(type==='image'||type==='svg'){
  const img=await new Promise<HTMLImageElement>((resolve,reject)=>{const i=new window.Image();i.onload=()=>resolve(i);i.onerror=()=>reject(new Error(`Ảnh “${file.name}” bị hỏng hoặc không giải mã được.`));i.src=url;});
  width=img.naturalWidth||img.width;height=img.naturalHeight||img.height;
  if(type==='image'&&(!(width>0)||!(height>0)))throw new Error(`Ảnh “${file.name}” có kích thước bằng 0 — không thể dùng làm card.`);
 }
 if(type==='lottie'){try{const j=JSON.parse(atob(url.split(',')[1]));if(!j.layers&&!j.assets)throw new Error();}catch{throw new Error('Lottie JSON không hợp lệ.');}}
 const reason=unsupportedFormatReason(type);
 if(reason)console.warn(`[import] ${file.name}: ${reason}`);
 return {id:uid(),name:file.name,type,url,thumbnail:type==='image'||type==='svg'?url:undefined,width,height};
}
