import type { Camera, Scene, EvaluatedCamera, Vec3, Track } from '../types';
import { sampleTrack } from '../timeline/engine';
export const lensToFov = (mm: number) => 2*Math.atan(24/(2*mm))*180/Math.PI;
export const fovToLens = (fov: number) => 12/Math.tan(fov*Math.PI/360);
export function noise1(t: number, seed: number) {
  const i = Math.floor(t), f = t-i, s = f*f*(3-2*f);
  const hash = (n: number) => { let x = Math.imul(n ^ seed, 0x45d9f3b); x = Math.imul(x ^ (x>>>16),0x45d9f3b); return ((x ^ (x>>>16))>>>0)/4294967295*2-1; };
  return hash(i)*(1-s)+hash(i+1)*s;
}
export function evaluateCamera(scene: Scene, t: number): EvaluatedCamera {
  const cams = [...scene.cameras].sort((a,b) => a.start-b.start);
  const c = cams.filter(c => c.start <= t).at(-1) ?? cams[0];
  const v = (p: string, b: number) => sampleTrack(c.tracks[p],t,b);
  const amp = v('shake.amplitude',c.shake.amplitude), freq = c.shake.frequency;
  const position: Vec3 = [v('position.x',c.position[0])+noise1(t*freq,c.shake.seed)*amp, v('position.y',c.position[1])+noise1(t*freq,c.shake.seed+73)*amp, v('position.z',c.position[2])];
  return { id:c.id, type:c.type, position, target:[v('target.x',c.target[0]),v('target.y',c.target[1]),v('target.z',c.target[2])], roll:v('roll',c.roll)+noise1(t*freq,c.shake.seed+127)*amp*.2, fov:v('fov',c.fov), zoom:v('zoom',c.zoom), shake:{...c.shake,amplitude:amp} };
}
export const cameraPresets = [
  { id:'dolly', name:'Dolly xuyên rừng', en:'Forest dolly', description:'Đẩy máy xuyên qua các lớp cây', icon:'MoveUpRight' },
  { id:'pan', name:'Pan ngang', en:'Horizontal pan', description:'Lướt nhẹ theo chiều ngang khung tranh', icon:'MoveHorizontal' },
  { id:'dutch', name:'Dutch angle zoom', en:'Dutch angle zoom', description:'Nghiêng máy và phóng cận kịch tính', icon:'RotateCw' },
  { id:'handheld', name:'Handheld breathing', en:'Handheld breathing', description:'Nhịp thở nhẹ của máy quay cầm tay', icon:'Activity' },
];
export function applyCameraPreset(camera: Camera, preset: string, duration: number): Camera {
  const c = structuredClone(camera); c.tracks = {};
  const track = (property: string, values: [number,number][], easing: Track['keys'][number]['easing'] = 'easeInOut') => { c.tracks[property] = {property,keys:values.map(([time,value],i)=>({id:`${c.id}-${property}-${i}`,time,value,easing,bezier:[.42,0,.58,1]}))}; };
  if (preset === 'dolly') { track('position.z',[[0,6],[duration,1.8]]); track('position.x',[[0,-.35],[duration,.35]]); }
  if (preset === 'pan') { track('position.x',[[0,-2],[duration,2]]); track('target.x',[[0,-1],[duration,1]]); }
  if (preset === 'dutch') { track('position.z',[[0,6],[duration,0]]); track('roll',[[0,0],[duration,-.14]]); track('fov',[[0,42],[duration,30]]); }
  if (preset === 'handheld') { c.shake.amplitude=.045; c.shake.frequency=1.8; track('position.y',[[0,.2],[duration/2,.35],[duration,.2]]); }
  return c;
}
