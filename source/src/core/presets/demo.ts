import type { Project, Scene, Layer, Camera, Environment, ShaderSettings, Track, Easing } from '../types';
import { createArtwork } from '../assets/artwork';
import { applyCameraPreset } from '../camera/camera';
export const defaultEnvironment:Environment={kind:'rain',enabled:true,count:850,seed:42,width:30,height:20,depth:44,centerZ:-12,fallSpeed:7,windSpeed:-1.1,swayAmp:.12,frequency:1.2,opacity:.42,color:'#c4e1df',fog:.023,fogColor:'#65858a',speedlines:0,speedlineRadius:.2};
export const defaultShader:ShaderSettings={enabled:true,halftone:true,dotSize:3.5,angle:30,threshold:.5,ink:1.13,bw:false,vignette:.36,blur:.12,focus:.5,flash:0};
export const layerDefaults:Layer={id:'layer',name:'Manga card',kind:'card',assetId:'ronin',position:[0,0,0],rotation:[0,0,0],scale:[3,4.5],opacity:1,visible:true,locked:false,billboard:false,compensate:false,blend:'normal',mask:'none',shadow:false,rim:false,posterize:0,color:'#ffffff',tracks:{}};
export const defaultCamera:Camera={id:'camera-1',name:'Camera 01',type:'perspective',start:0,position:[0,.2,6],target:[0,0,-8],roll:0,fov:42,zoom:1,shake:{amplitude:.008,frequency:9,seed:42},tracks:{}};
export function makeTrack(property:string, values:[number,number][], easing:Easing='easeInOut'):Track{return {property,keys:values.map(([time,value],i)=>({id:`${property}-${i}`,time,value,easing,bezier:[.42,0,.58,1]}))};}
export function createDemoProject():Project {
 const layers:Layer[]=[
  {...layerDefaults,id:'background',name:'Rừng xa',assetId:'forest',position:[0,1,-38],scale:[62,35],color:'#c6e0df'},
  {...layerDefaults,id:'scatter',name:'Rừng cây · Z-scatter',kind:'scatter',assetId:'trees',position:[0,0,-18],scale:[5,12],scatter:{count:16,seed:71,zMin:-35,zMax:-2,width:8,assetIds:['tree-card']}},
  {...layerDefaults,id:'midtrees',name:'Cây trung cảnh',assetId:'trees',position:[0,1,-17],scale:[29,16.3],color:'#b4cece'},
  {...layerDefaults,id:'ronin',name:'Ronin',assetId:'ronin',position:[.1,-.7,-8],scale:[3.3,4.95],posterize:12,shadow:true,tracks:{'position.y':makeTrack('position.y',[[-0,-.7],[2,-.67],[4,-.7],[6,-.67],[8,-.7]])}},
  {...layerDefaults,id:'sfx',name:'ZAÀ… · SFX',assetId:'sfx',position:[2.05,1.3,-5],rotation:[0,0,-.04],scale:[2.8,.91],rim:true,tracks:{'opacity':makeTrack('opacity',[[0,.25],[.6,.85],[7,.85],[8,.25]])}},
  {...layerDefaults,id:'foreground',name:'Cành cây tiền cảnh',assetId:'foreground',position:[0,.2,2],scale:[11,6.2],color:'#8eafb2'},
  {...layerDefaults,id:'rain',name:'Mưa 3D',kind:'environment',assetId:undefined},
 ];
 const camera=applyCameraPreset({...defaultCamera,position:[-.35,.2,6]},'dolly',8);
 const forest:Scene={id:'forest-night',name:'Đi xuyên rừng mưa đêm',mode:'multiplane25d',duration:8,fps:30,aspect:'16:9',layers,cameras:[camera],environment:defaultEnvironment,shader:defaultShader,shots:[{id:'shot-1',name:'01 · Đi vào rừng',start:0,duration:3,color:'#80b7ad'},{id:'shot-2',name:'02 · Kiếm sĩ xuất hiện',start:3,duration:3,color:'#829dcc'},{id:'shot-3',name:'03 · Trước cơn bão',start:6,duration:2,color:'#cfad7c'}],markers:[{id:'lightning',time:2.5,label:'Chớp sáng'}]};
 const attack:Scene={...structuredClone(forest),id:'panel-break',name:'Khung tranh vỡ & đòn tấn công',duration:6,shots:[{id:'a1',name:'01 · Đối đầu',start:0,duration:2,color:'#829dcc'},{id:'a2',name:'02 · Tấn công',start:2,duration:2,color:'#ee9474'},{id:'a3',name:'03 · Dư âm',start:4,duration:2,color:'#80b7ad'}],markers:[{id:'impact',time:2.5,label:'Va chạm'}],environment:{...defaultEnvironment,kind:'dust',count:180,fallSpeed:.3,windSpeed:.4,opacity:.6,color:'#f4ce91',fog:.008,speedlines:.65},cameras:[applyCameraPreset(defaultCamera,'dutch',6)],layers:[
  {...layerDefaults,id:'action-bg',name:'Radial action background',assetId:'attack',position:[0,0,-12],scale:[25,14]},
  {...layerDefaults,id:'panel-1',name:'Khung tranh 01',assetId:'page-1',position:[-3,0,-5],rotation:[0,.15,-.1],scale:[3.5,5],mask:'panel',shadow:true},
  {...layerDefaults,id:'panel-2',name:'Khung tranh 02',assetId:'page-3',position:[3,.2,-3],rotation:[0,-.15,.12],scale:[3.1,4.4],mask:'diagonal',shadow:true},
  {...layerDefaults,id:'attack-ronin',name:'Ronin · phá khung',assetId:'ronin',position:[0,-1,-4],scale:[3.3,4.95],shadow:true,posterize:12,tracks:{'position.z':makeTrack('position.z',[[0,-5],[2,-4],[2.5,1.8],[6,2.2]]),'position.x':makeTrack('position.x',[[0,-1],[2,0],[2.5,.7],[6,.8]]),'rotation.z':makeTrack('rotation.z',[[0,-.15],[2,0],[2.5,-.3],[6,-.2]])}},
  {...layerDefaults,id:'attack-sfx',name:'VÚT! · SFX',assetId:'sfx',position:[-1.5,1.5,2],scale:[3.5,1.14],rotation:[0,0,-.15],tracks:{'opacity':makeTrack('opacity',[[0,0],[2,0],[2.2,1],[5,1],[6,0]],'step')}},
 ]};
 const comic:Scene={...structuredClone(forest),id:'five-pages',name:'Chuyện của đêm · 5 trang',duration:20,aspect:'16:9',environment:{...defaultEnvironment,count:160,opacity:.15,fog:0},shader:{...defaultShader,halftone:false,vignette:.15},cameras:[{...defaultCamera,type:'orthographic',position:[0,0,10],target:[0,0,0],zoom:1,shake:{amplitude:0,frequency:1,seed:1},tracks:{}}],shots:Array.from({length:5},(_,i)=>({id:`page-shot-${i+1}`,name:`0${i+1} · ${['Thiết lập','Nhịp bước','Đối đầu','Cao trào','Kết thúc'][i]}`,start:i*4,duration:4,color:['#80b7ad','#829dcc','#cfad7c','#ee9474','#a5a1c8'][i],page:i+1})),markers:Array.from({length:5},(_,i)=>({id:`page-marker-${i}`,time:i*4,label:`Trang ${i+1}`})),layers:Array.from({length:5},(_,i)=>({...layerDefaults,id:`comic-page-${i+1}`,name:`Trang 0${i+1}`,assetId:`page-${i+1}`,position:[0,0,0],scale:[5.625,8],tracks:{opacity:{property:'opacity',keys:[{id:`p${i}-a`,time:Math.max(0,i*4-.01),value:0,easing:'step',bezier:[.42,0,.58,1]},{id:`p${i}-b`,time:i*4,value:1,easing:'step',bezier:[.42,0,.58,1]},{id:`p${i}-c`,time:(i+1)*4,value:0,easing:'step',bezier:[.42,0,.58,1]}]}}}))};
 return {schemaVersion:1,id:'project-mangamotion',name:'Chuyện của đêm',scenes:[forest,attack,comic],assets:createArtwork(),activeSceneId:forest.id,revision:1,updatedAt:new Date().toISOString()};
}
export const workflowSteps=[
 {title:'Ý tưởng & kịch bản',en:'Story & script',detail:'Một kiếm sĩ, khu rừng mưa, nhát cắt quyết định. Viết nhịp truyện thành 5 trang: thiết lập → nhịp bước → đối đầu → cao trào → kết thúc.',action:'Mở kịch bản 5 trang',time:0},
 {title:'Vẽ & tách lớp',en:'Draw & separate',detail:'Tách nền, cây, nhân vật, thoại và SFX thành SVG trong suốt. Tất cả 11 tài nguyên mẫu đã nằm trong thư viện; có thể thay bằng ảnh của bạn.',action:'Xem tài nguyên',time:0},
 {title:'Dàn cảnh 2.5D',en:'Stage in 2.5D',detail:'Đặt nhân vật tại Z = −8, tiền cảnh Z = 2 và rải 16 cây từ Z = −2 đến −35. Chuyển sang 3D Stage để thấy chiều sâu thật.',action:'Xem không gian 3D',time:1.25},
 {title:'Gán chuyển động',en:'Animate & keyframe',detail:'Dolly 8 giây, breathing 12fps cho nhân vật, mưa 3D chạy 60fps. Đặt keyframe tại chớp sáng 2.5s; tua và kiểm tra từng khung hình.',action:'Xem đòn tấn công',time:2.5},
 {title:'Mực, raster & ánh sáng',en:'Ink, tone & light',detail:'Bật screentone, nét mực Sobel, vignette và mờ tiêu cự. Preview nhanh khi dựng; chuyển chất lượng cao trước khi xuất.',action:'Tinh chỉnh hậu kỳ',time:3.8},
 {title:'Kiểm tra & xuất bản',en:'Validate & deliver',detail:'Chạy self-test seek(t), xuất 5 trang SVG, chuỗi PNG tất định hoặc WebM xem trước. Dự án JSON giữ nguyên tài nguyên để agent tiếp tục chỉnh sửa.',action:'Mở bảng xuất bản',time:1.25},
];
