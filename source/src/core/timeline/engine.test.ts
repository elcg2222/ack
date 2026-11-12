import { describe, it, expect } from 'vitest';
import { sampleTrack, seek, sceneSnapshot, snapTime, cubicBezier, ease } from './engine';
import { createDemoProject } from '../presets/demo';
import { particlePosition, mulberry32 } from '../environment3d/particles';
import { evaluateCamera } from '../camera/camera';
import type { Track } from '../types';
const track=(keys:[number,number][],easing:Track['keys'][number]['easing']='linear'):Track=>({property:'x',keys:keys.map(([time,value],i)=>({id:`k${i}`,time,value,easing,bezier:[.42,0,.58,1]}))});
describe('timeline interpolation',()=>{
 it('holds before first and after last keyframe',()=>{const tr=track([[1,10],[3,30]]);expect(sampleTrack(tr,0,0)).toBe(10);expect(sampleTrack(tr,5,0)).toBe(30);});
 it('linear midpoint',()=>{expect(sampleTrack(track([[0,0],[2,10]]),1,0)).toBe(5);});
 it('step holds then jumps',()=>{expect(sampleTrack(track([[0,0],[2,10]],'step'),1.9,0)).toBe(0);expect(sampleTrack(track([[0,0],[2,10]],'step'),2,0)).toBe(10);});
 it('easeInOut symmetric',()=>{expect(ease(.5,'easeInOut')).toBeCloseTo(.5,5);expect(ease(.25,'easeInOut')).toBeLessThan(.25);expect(ease(.75,'easeInOut')).toBeGreaterThan(.75);});
 it('bezier endpoints and monotonic inverse',()=>{expect(cubicBezier(0,[.42,0,.58,1])).toBeCloseTo(0,5);expect(cubicBezier(1,[.42,0,.58,1])).toBeCloseTo(1,5);expect(cubicBezier(.5,[.42,0,.58,1])).toBeCloseTo(.5,3);});
 it('snaps to frame grid and markers',()=>{expect(snapTime(1.234,30)).toBeCloseTo(1.2333,3);expect(snapTime(2.49,30,[2.5])).toBe(2.5);expect(snapTime(1.234,30,[],false)).toBe(1.234);});
});
describe('deterministic seek(t)',()=>{
 const project=createDemoProject();const scene=project.scenes[0];
 it('returns identical snapshots after arbitrary scrubbing',()=>{const a=sceneSnapshot(scene,1.25);seek(scene,3.8);seek(scene,.4);const b=sceneSnapshot(scene,1.25);expect(JSON.stringify(a)).toBe(JSON.stringify(b));});
 it('clamps time to scene duration',()=>{expect(seek(scene,-5).time).toBe(0);expect(seek(scene,999).time).toBe(scene.duration);});
 it('camera shake is pure function of t and seed',()=>{const a=evaluateCamera(scene,2.5);const b=evaluateCamera(scene,2.5);expect(a).toEqual(b);const c=evaluateCamera(scene,2.5001);expect(c.position[0]).not.toBe(a.position[0]);});
 it('posterized layer time quantizes to 12fps while camera stays smooth',()=>{const ronin=scene.layers.find(l=>l.id==='ronin')!;const a=seek(scene,1.01).layers.find(l=>l.id==='ronin')!;const b=seek(scene,1.02).layers.find(l=>l.id==='ronin')!;expect(a.position[1]).toBe(b.position[1]);const camA=seek(scene,1.01).camera,camB=seek(scene,1.02).camera;expect(camA.position[2]).not.toBe(camB.position[2]);});
 it('particle positions wrap deterministically',()=>{const env=scene.environment;const a=particlePosition(env,7,1.25);particlePosition(env,7,9);const b=particlePosition(env,7,1.25);expect(a).toEqual(b);expect(Math.abs(a[0])).toBeLessThanOrEqual(env.width/2);expect(Math.abs(a[1])).toBeLessThanOrEqual(env.height/2);});
 it('mulberry32 same seed same sequence',()=>{const a=mulberry32(42),b=mulberry32(42);expect([a(),a(),a()]).toEqual([b(),b(),b()]);});
 it('five-page comic scene exposes exactly five shots',()=>{const comic=project.scenes.find(s=>s.id==='five-pages')!;expect(comic.shots).toHaveLength(5);expect(comic.duration).toBe(20);for(let i=0;i<5;i++){const st=seek(comic,i*4+.5);const visible=st.layers.filter(l=>l.opacity>0.5);expect(visible).toHaveLength(1);expect(visible[0].id).toBe(`comic-page-${i+1}`);}});
});
