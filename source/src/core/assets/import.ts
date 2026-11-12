import type { Asset } from '../types';
import { uid } from '../types';
const IMAGE_EXT=['png','jpg','jpeg','webp','gif','svg'];
export function detectAssetType(file:File):Asset['type']|null{
 const ext=file.name.split('.').pop()?.toLowerCase();
 if(file.type.startsWith('image/')||IMAGE_EXT.includes(ext??''))return ext==='svg'||file.type==='image/svg+xml'?'svg':'image';
 if(file.type.startsWith('audio/')||['mp3','wav','ogg','m4a'].includes(ext??''))return 'audio';
 if(file.type.startsWith('video/')||['mp4','webm','mov'].includes(ext??''))return 'video';
 if(ext==='glb'||ext==='gltf')return 'glb';if(ext==='vrm')return 'vrm';if(ext==='json')return 'lottie';return null;
}
/** Định dạng đã nhận diện nhưng app chưa render/export được — báo rõ, không giả vờ hỗ trợ. */
export const UNSUPPORTED_RENDER_MSG='Định dạng này được chấp nhận vào thư viện nhưng trình xem 2.5D hiện CHƯA render được (chỉ ảnh/SVG mới hiển thị trên sân khấu).';
export async function importAssetFile(file:File):Promise<Asset>{
 if(file.size>30*1024*1024)throw new Error(`“${file.name}” vượt quá 30 MB.`);
 const type=detectAssetType(file);if(!type)throw new Error(`Định dạng “${file.name}” chưa được hỗ trợ.`);
 // Báo rõ ngay từ lúc nhập: GLB/VRM/audio/video/Lottie CHƯA render được trong app — không giả vờ đã hỗ trợ.
 if(type!=='image'&&type!=='svg')throw new Error(`Định dạng “${file.name}” (.${type}) hiện chưa được hỗ trợ để render trong MangaMotion 2.5D. ${UNSUPPORTED_RENDER_MSG}`);
 const url=await new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result as string);r.onerror=()=>reject(new Error(`Không đọc được “${file.name}”.`));r.readAsDataURL(file);});
 let width:number|undefined,height:number|undefined;
 {
  const img=await new Promise<HTMLImageElement>((resolve,reject)=>{const i=new window.Image();i.onload=()=>resolve(i);i.onerror=()=>reject(new Error(`Ảnh “${file.name}” bị hỏng hoặc không giải mã được.`));i.src=url;});
  width=img.naturalWidth||img.width; height=img.naturalHeight||img.height;
  if(!(width>0)||!(height>0))throw new Error(`Ảnh “${file.name}” có kích thước hợp lệ bằng 0 — không thể dùng làm card.`);
 }
 return {id:uid(),name:file.name,type,url,thumbnail:url,width,height};
}
