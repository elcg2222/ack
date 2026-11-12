import type { Environment, Vec3 } from '../types';
export function mulberry32(seed: number) {
  return () => { let t = seed += 0x6D2B79F5; t = Math.imul(t ^ t >>> 15,t | 1); t ^= t + Math.imul(t ^ t >>> 7,t | 61); return ((t ^ t >>> 14) >>> 0)/4294967296; };
}
export const wrap = (v: number, min: number, max: number) => ((v-min)%(max-min)+(max-min))%(max-min)+min;
export interface ParticleSeed { x:number; y:number; z:number; phase:number; size:number }
export function particleSeeds(env: Environment): ParticleSeed[] {
  const random = mulberry32(env.seed);
  return Array.from({length:env.count},()=>({x:(random()-.5)*env.width,y:(random()-.5)*env.height,z:(random()-.5)*env.depth+env.centerZ,phase:random()*Math.PI*2,size:.6+random()*.8}));
}
export function particlePosition(env: Environment, i: number, t: number): Vec3 {
  const p = particleSeed(env,i);
  return [wrap(p.x+env.windSpeed*t+Math.sin(t*env.frequency+p.phase)*env.swayAmp,-env.width/2,env.width/2),wrap(p.y-env.fallSpeed*t,-env.height/2,env.height/2),p.z];
}
// Closed-form per-index PRNG avoids allocating the entire pool for one particle.
function particleSeed(env: Environment, i: number): ParticleSeed {
  const r = mulberry32(env.seed + Math.imul(i+1, 1597334677));
  return {x:(r()-.5)*env.width,y:(r()-.5)*env.height,z:(r()-.5)*env.depth+env.centerZ,phase:r()*Math.PI*2,size:.6+r()*.8};
}
export function particleAt(seeds: ParticleSeed[], env: Environment, i:number, t:number): Vec3 {
  const p=seeds[i];
  return [wrap(p.x+env.windSpeed*t+Math.sin(t*env.frequency+p.phase)*env.swayAmp,-env.width/2,env.width/2),wrap(p.y-env.fallSpeed*t,-env.height/2,env.height/2),p.z];
}
