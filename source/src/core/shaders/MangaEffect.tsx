import { useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Effect } from 'postprocessing';
import { Uniform, Vector2 } from 'three';
import type { ShaderSettings } from '../types';
import { useStudio } from '../store/useStudio';
import { seek } from '../timeline/engine';
const fragment=`
uniform float uDotSize;
uniform float uAngle;
uniform float uThreshold;
uniform float uInk;
uniform float uBW;
uniform float uHalftone;
uniform float uVignette;
uniform float uBlur;
uniform float uFocus;
uniform float uFlash;
uniform float uSpeedlines;
uniform float uRadius;
uniform vec2 uResolution;
float luma(vec3 c){return dot(c,vec3(.299,.587,.114));}
float hash(float n){return fract(sin(n*127.1)*43758.5453);}
void mainImage(const in vec4 inputColor,const in vec2 uv,out vec4 outputColor){
 vec2 px=1.0/uResolution;
 float focus=abs(length((uv-.5)*vec2(1.0,.7))-(1.0-uFocus)*.45);
 float blur=smoothstep(.12,.5,focus)*uBlur*5.0;
 vec3 col=inputColor.rgb;
 if(blur>.01){col=(inputColor.rgb+texture2D(inputBuffer,uv+vec2(px.x*blur,0.)).rgb+texture2D(inputBuffer,uv-vec2(px.x*blur,0.)).rgb+texture2D(inputBuffer,uv+vec2(0.,px.y*blur)).rgb+texture2D(inputBuffer,uv-vec2(0.,px.y*blur)).rgb)*.2;}
 float gray=luma(col);
 float tl=luma(texture2D(inputBuffer,uv+vec2(-px.x,-px.y)).rgb);
 float tr=luma(texture2D(inputBuffer,uv+vec2(px.x,-px.y)).rgb);
 float bl=luma(texture2D(inputBuffer,uv+vec2(-px.x,px.y)).rgb);
 float br=luma(texture2D(inputBuffer,uv+vec2(px.x,px.y)).rgb);
 float edge=length(vec2(tl+2.*luma(texture2D(inputBuffer,uv+vec2(-px.x,0.)).rgb)+bl-tr-2.*luma(texture2D(inputBuffer,uv+vec2(px.x,0.)).rgb)-br,tl+2.*luma(texture2D(inputBuffer,uv+vec2(0.,-px.y)).rgb)+tr-bl-2.*luma(texture2D(inputBuffer,uv+vec2(0.,px.y)).rgb)-br));
 col=(col-.5)*uInk+.5;
 if(uBW>.5)col=vec3(luma(col));
 if(uHalftone>.5){float a=uAngle*3.14159265/180.;mat2 rot=mat2(cos(a),-sin(a),sin(a),cos(a));vec2 p=rot*gl_FragCoord.xy/uDotSize;float d=length(fract(p)-.5);float radius=sqrt(clamp(1.-gray,0.,1.))*.55;float tone=1.-smoothstep(radius-.07,radius+.07,d);float mask=smoothstep(uThreshold-.2,uThreshold+.2,1.-gray);col=mix(col,col*.48,mask*(1.-tone)*.65);}
 col*=1.-clamp(edge*.48,0.,.65);
 float v=length((uv-.5)*1.35);col*=1.-smoothstep(.25,.85,v)*uVignette;
 if(uSpeedlines>.0){vec2 p=(uv-.5)*vec2(uResolution.x/uResolution.y,1.);float a=atan(p.y,p.x);float line=step(.83,hash(floor((a+3.14159)*220.)));float radial=smoothstep(uRadius,uRadius+.35,length(p));col=mix(col,vec3(.025,.045,.055),line*radial*uSpeedlines);}
 col+=vec3(.8,.9,1.)*uFlash;
 outputColor=vec4(clamp(col,0.,1.),inputColor.a);
}`;
export function MangaEffect({settings}:{settings:ShaderSettings}){
 const size=useThree(s=>s.size);const gl=useThree(s=>s.gl);
 const effect=useMemo(()=>new Effect('MangaInk',fragment,{uniforms:new Map<string,Uniform>([['uDotSize',new Uniform(3.5)],['uAngle',new Uniform(30)],['uThreshold',new Uniform(.5)],['uInk',new Uniform(1.1)],['uBW',new Uniform(0)],['uHalftone',new Uniform(1)],['uVignette',new Uniform(.3)],['uBlur',new Uniform(0)],['uFocus',new Uniform(.5)],['uFlash',new Uniform(0)],['uSpeedlines',new Uniform(0)],['uRadius',new Uniform(.2)],['uResolution',new Uniform(new Vector2(1,1))]])}),[]);
 useEffect(()=>()=>effect.dispose(),[effect]);
 useEffect(()=>{effect.uniforms.get('uResolution')!.value.set(size.width,size.height);},[size,effect]);
 useFrame(()=>{effect.uniforms.get('uResolution')!.value.set(gl.domElement.width,gl.domElement.height);const s=get().project.scenes.find(x=>x.id===get().project.activeSceneId)!;const t=get().time;const fx=seek(s,t).shader;const env=s.environment;const u=effect.uniforms;u.get('uDotSize')!.value=Math.max(1,fx.dotSize);u.get('uAngle')!.value=fx.angle;u.get('uThreshold')!.value=fx.threshold;u.get('uInk')!.value=fx.ink;u.get('uBW')!.value=fx.bw?1:0;u.get('uHalftone')!.value=fx.halftone?1:0;u.get('uVignette')!.value=fx.vignette;u.get('uBlur')!.value=fx.blur;u.get('uFocus')!.value=fx.focus;u.get('uFlash')!.value=fx.flash+(s.id==='forest-night'||s.id==='panel-break'?Math.exp(-Math.pow((t-2.5)*17,2))*.72:0);u.get('uSpeedlines')!.value=env.speedlines;u.get('uRadius')!.value=env.speedlineRadius;});
 return <primitive object={effect} dispose={null}/>;
}
const get = useStudio.getState;
import { seek } from '../timeline/engine';
