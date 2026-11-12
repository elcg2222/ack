export interface CaptureEngine { canvas:HTMLCanvasElement; capture:(time:number,width?:number,height?:number)=>Promise<Blob>; }
let engine:CaptureEngine|null=null;
export function registerCapture(e:CaptureEngine|null){engine=e;if(e)window.dispatchEvent(new CustomEvent('mangamotion:renderer-ready'));}
export function getCaptureEngine(){return engine;}
export function nextFrame(){return new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));}
