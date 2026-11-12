import { Suspense, useEffect, useMemo, useRef, memo } from 'react';
import { useFrame, useThree, useLoader } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei/core/OrbitControls';
import { PerspectiveCamera } from '@react-three/drei/core/PerspectiveCamera';
import { OrthographicCamera } from '@react-three/drei/core/OrthographicCamera';
import { Line } from '@react-three/drei/core/Line';
import { Grid } from '@react-three/drei/core/Grid';
import { EffectComposer } from '@react-three/postprocessing';
import * as THREE from 'three';
import type { EffectComposer as Composer } from 'postprocessing';
import type { Asset, Layer, Scene, EvaluatedCamera } from '../types';
import { useStudio, activeScene } from '../store/useStudio';
import { seek, evaluateLayer } from '../timeline/engine';
import { evaluateCamera } from '../camera/camera';
import { mulberry32, particleSeeds, particleAt } from '../environment3d/particles';
import { MangaEffect } from '../shaders/MangaEffect';
import { registerCapture, nextFrame } from './registry';

const Card=memo(function Card({layer,assets,wireframe=false}:{layer:Layer;assets:Asset[];wireframe?:boolean}){
 const asset=assets.find(a=>a.id===layer.assetId);
 const texture=useLoader(THREE.TextureLoader,asset?.url??'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxIiBoZWlnaHQ9IjEiLz4=');
 const ref=useRef<THREE.Group>(null);const {camera}=useThree();
 useEffect(()=>{texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;texture.needsUpdate=true;},[texture]);
 const geometry=useMemo(()=>{if(layer.mask!=='diagonal')return new THREE.PlaneGeometry(1,1);const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([-.5,-.5,0,.5,-.5,0,.35,.5,0,-.5,.35,0],3));g.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,.85,1,0,.85],2));g.setIndex([0,1,2,0,2,3]);g.computeVertexNormals();return g;},[layer.mask]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 useFrame(()=>{if(!ref.current)return;const s=useStudio.getState();const sc=activeScene(s.project);const camZ=state.camera.type==="perspective"?state.camera.position[2]:6;const l=evaluateLayer(layer,s.time,camZ);ref.current.visible=l.visible;ref.current.position.set(...l.position);ref.current.scale.set(l.scale[0],l.scale[1],1);if(layer.billboard)ref.current.quaternion.copy(camera.quaternion);else ref.current.rotation.set(...l.rotation);const mesh=ref.current.children[0] as THREE.Mesh;if(mesh){const m=mesh.material as THREE.MeshBasicMaterial;m.opacity=l.opacity;}});
 const blending=layer.blend==='multiply'?THREE.MultiplyBlending:layer.blend==='screen'?THREE.CustomBlending:layer.blend==='add'?THREE.AdditiveBlending:THREE.NormalBlending;
 const screenProps=layer.blend==='screen'?{blendSrc:THREE.OneFactor,blendDst:THREE.OneMinusSrcColorFactor,blendEquation:THREE.AddEquation}:{};
 return <group ref={ref} position={layer.position} scale={[layer.scale[0],layer.scale[1],1]}>
  <mesh geometry={geometry} renderOrder={layer.position[2]+50}>
   <meshBasicMaterial map={texture} transparent opacity={layer.opacity} alphaTest={.015} side={THREE.DoubleSide} blending={blending} {...screenProps} color={layer.color} toneMapped={false}/>
  </mesh>
  {layer.shadow&&<mesh geometry={geometry} position={[.025,-.025,-.025]}><meshBasicMaterial map={texture} color="#020b12" transparent opacity={.3} alphaTest={.015}/></mesh>}
  {layer.rim&&<mesh geometry={geometry} position={[0,0,-.015]} scale={[1.018,1.018,1]}><meshBasicMaterial map={texture} color="#d5f5e5" transparent opacity={.22} depthWrite={false} blending={THREE.AdditiveBlending}/></mesh>}
  {wireframe&&<lineSegments><edgesGeometry args={[new THREE.PlaneGeometry(1,1)]}/><lineBasicMaterial color={layer.id===useStudio.getState().selection?.id?'#f5a17b':'#78b9b1'} transparent opacity={.75}/></lineSegments>}
 </group>;
});
function Scatter({layer,assets,wireframe}:{layer:Layer;assets:Asset[];wireframe:boolean}){
 const items=useMemo(()=>{const sc=layer.scatter;if(!sc)return[];const r=mulberry32(sc.seed);return Array.from({length:sc.count},(_,i)=>{const z=sc.zMin+(sc.zMax-sc.zMin)*i/Math.max(1,sc.count-1);return {...layer,id:`${layer.id}-${i}`,kind:'card' as const,assetId:sc.assetIds[i%sc.assetIds.length],position:[(i%2?1:-1)*(sc.width/2+r()*3),1+r()*2,z] as [number,number,number],scale:[4+r()*2,12+r()*3] as [number,number],color:i%3?'#9fbabc':'#739397'};});},[layer]);
 return <>{items.map(l=><Card key={l.id} layer={l} assets={assets} wireframe={wireframe}/>)}</>;
}
function Particles({scene,evaluated}:{scene:Scene;evaluated?:React.MutableRefObject<SceneState|null>}){
 const ref=useRef<THREE.InstancedMesh>(null);const env=scene.environment;
 // Rebuild the instanced mesh (new GPU buffers) when particle count changes — stale
 // instanceMatrix buffers were the Q1/REVIEW P1.1 risk surface.
 const seeds=useMemo(()=>particleSeeds(env),[env.seed,env.count,env.width,env.height,env.depth,env.centerZ]);
 const dummy=useMemo(()=>new THREE.Object3D(),[]);
 useFrame(()=>{if(!ref.current)return;const s=useStudio.getState();const e=(evaluated?.current??seek(activeScene(s.project),s.time)).environment;ref.current.visible=e.enabled;ref.current.count=Math.min(seeds.length,ref.current.instanceMatrix.count);for(let i=0;i<ref.current.count;i++){const p=particleAt(seeds,e,i,s.time);dummy.position.set(...p);dummy.rotation.set(0,0,e.kind==='rain'?-.12:Math.sin(s.time+seeds[i].phase)*.5);const size=seeds[i].size;dummy.scale.set(e.kind==='rain'?.012:.035*size,e.kind==='rain'?.19+size*.1:.035*size,1);dummy.updateMatrix();ref.current.setMatrixAt(i,dummy.matrix);}ref.current.instanceMatrix.needsUpdate=true;});
 return <instancedMesh key={seeds.length} ref={ref} args={[undefined,undefined,seeds.length]} frustumCulled={false} renderOrder={80}><planeGeometry args={[1,1]}/><meshBasicMaterial color={env.color} transparent opacity={env.opacity} depthWrite={false} depthTest side={THREE.DoubleSide} blending={env.kind==='dust'?THREE.AdditiveBlending:THREE.NormalBlending}/></instancedMesh>;
}
function applyCamera(cam:THREE.PerspectiveCamera|THREE.OrthographicCamera,state:EvaluatedCamera,aspect:number){
 cam.position.set(...state.position);cam.up.set(0,1,0);cam.lookAt(new THREE.Vector3(...state.target));cam.rotateZ(state.roll);
 if(cam instanceof THREE.PerspectiveCamera){cam.fov=state.fov;cam.aspect=aspect;}else{const h=10/state.zoom;cam.left=-h*aspect/2;cam.right=h*aspect/2;cam.top=h/2;cam.bottom=-h/2;}
 cam.updateProjectionMatrix();cam.updateMatrixWorld();
}
function CameraRig({scene,mode,captureSize}:{scene:Scene;mode:'camera'|'stage';captureSize:React.MutableRefObject<[number,number]|null>}){
 const perspective=useRef<THREE.PerspectiveCamera>(null),orthographic=useRef<THREE.OrthographicCamera>(null),director=useRef<THREE.PerspectiveCamera>(null);
 const {gl,scene:threeScene,size,set}=useThree();const composer=useRef<Composer>(null);const controls=useRef<any>(null);const focusVersion=useStudio(s=>s.focusVersion);
 const state=seek(scene,useStudio.getState().time);const isOrtho=mode==='camera'&&state.camera.type==='orthographic';
 const path=useMemo(()=>Array.from({length:41},(_,i)=>evaluateCamera(scene,scene.duration*i/40).position),[scene.cameras,scene.duration]);
 const helper=useMemo(()=>{const c=new THREE.PerspectiveCamera(42,16/9,.5,18);return new THREE.CameraHelper(c);},[]);
 useEffect(()=>()=>helper.dispose(),[helper]);
 useEffect(()=>{if(mode==='stage'&&controls.current){const sel=useStudio.getState().selection;const l=scene.layers.find(l=>l.id===sel?.id);if(l&&focusVersion){controls.current.target.set(...l.position);director.current?.position.set(l.position[0]+7,l.position[1]+5,l.position[2]+12);controls.current.update();}}},[focusVersion,mode]);
 useEffect(()=>{
  if(mode!=='camera')return;
  registerCapture({canvas:gl.domElement,capture:async(time,width,height)=>{
   const s=useStudio.getState();s.seek(time);await nextFrame();
   const oldSize=gl.getSize(new THREE.Vector2());const oldRatio=gl.getPixelRatio();
   if(width&&height){captureSize.current=[width,height];gl.setPixelRatio(1);gl.setSize(width,height,false);composer.current?.setSize(width,height,false);const cam=isOrtho?orthographic.current:perspective.current;if(cam)applyCamera(cam,evaluateCamera(activeScene(s.project),time),width/height);await nextFrame();}
   try{return await new Promise<Blob>((resolve,reject)=>gl.domElement.toBlob(b=>b?resolve(b):reject(new Error('Không chụp được khung hình. Hãy thử Preview nhanh.')),'image/png'));}
   finally{if(width&&height){captureSize.current=null;gl.setPixelRatio(oldRatio);gl.setSize(oldSize.x,oldSize.y,false);composer.current?.setSize(oldSize.x,oldSize.y,false);await nextFrame();}}
  }});
  return ()=>registerCapture(null);
 },[gl,mode,isOrtho]);
 useFrame(()=>{
  const s=useStudio.getState();const sc=activeScene(s.project);const evaluatedState=seek(sc,s.time);
  const dims=captureSize.current??[size.width,size.height];const aspect=dims[0]/dims[1];
  if(mode==='camera'){const cam=isOrtho?orthographic.current:perspective.current;if(cam)applyCamera(cam,evaluatedState.camera,aspect);}
  if(mode==='stage'){const hc=helper.camera as THREE.PerspectiveCamera;hc.fov=evaluatedState.camera.fov;hc.aspect=size.width/size.height;hc.position.set(...evaluatedState.camera.position);hc.lookAt(new THREE.Vector3(...evaluatedState.camera.target));hc.updateProjectionMatrix();hc.updateMatrixWorld();helper.update();}
 });
 return <>
  <PerspectiveCamera ref={perspective} makeDefault={mode==='camera'&&!isOrtho} position={[0,.2,6]} fov={42} near={.05} far={150}/>
  <OrthographicCamera ref={orthographic} makeDefault={isOrtho} position={[0,0,10]} near={.01} far={150}/>
  <PerspectiveCamera ref={director} makeDefault={mode==='stage'} position={[15,10,23]} fov={48} near={.1} far={200}/>
  {mode==='stage'&&<><OrbitControls ref={controls} makeDefault target={[0,0,-10]} enableDamping dampingFactor={.08} minDistance={2} maxDistance={90}/><primitive object={helper}/><Line points={path} color="#f2a077" lineWidth={1.5} dashed dashSize={.3} gapSize={.15}/><Grid position={[0,-4,-10]} args={[60,70]} cellSize={1} cellThickness={.5} cellColor="#34515a" sectionSize={5} sectionThickness={1} sectionColor="#52777b" fadeDistance={75} infiniteGrid/></>}
  {mode==='camera'&&<EffectComposer ref={composer} enabled={scene.shader.enabled} multisampling={0}><MangaEffect settings={scene.shader}/></EffectComposer>}
 </>;
}
export function RenderScene({scene,mode}:{scene:Scene;mode:'camera'|'stage'}){
 const wireframe=useStudio(s=>s.wireframe);const captureSize=useRef<[number,number]|null>(null);
 return <><color attach="background" args={[mode==='stage'?'#17232b':scene.environment.fogColor]}/>{scene.environment.fog>0&&<fogExp2 attach="fog" args={[scene.environment.fogColor,scene.environment.fog]}/>}<ambientLight intensity={1}/><Suspense fallback={null}>{scene.layers.filter(l=>l.kind!=='environment'&&l.visible).map(l=>l.kind==='scatter'?<Scatter key={l.id} layer={l} assets={scene.id?useStudio.getState().project.assets:[]} wireframe={mode==='stage'&&wireframe}/>:<Card key={l.id} layer={l} assets={useStudio.getState().project.assets} wireframe={mode==='stage'&&wireframe}/>)}</Suspense>{scene.environment.enabled&&<Particles scene={scene}/>}<CameraRig scene={scene} mode={mode} captureSize={captureSize}/></>;
}
