import { mulberry32 } from '../environment3d/particles';
import type { Asset } from '../types';
const uri = (s: string) => `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(s)))}`;
const defs = `<defs>
 <linearGradient id="sky" x2="0" y2="1"><stop stop-color="#182e36"/><stop offset=".55" stop-color="#66858a"/><stop offset="1" stop-color="#b6c9c6"/></linearGradient>
 <linearGradient id="mist" x2="0" y2="1"><stop stop-color="#b4cfcc" stop-opacity="0"/><stop offset=".65" stop-color="#b4cfcc" stop-opacity=".6"/><stop offset="1" stop-color="#b4cfcc" stop-opacity="0"/></linearGradient>
 <linearGradient id="trunk"><stop stop-color="#08191e"/><stop offset=".65" stop-color="#163039"/><stop offset=".82" stop-color="#45636a"/><stop offset=".87" stop-color="#172e35"/><stop offset="1" stop-color="#0a2026"/></linearGradient>
 <pattern id="hatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(24)"><path d="M0 0V9" stroke="#c6d6ce" stroke-width=".7" opacity=".3"/></pattern>
 <pattern id="dots" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="#10232b" opacity=".35"/></pattern>
 <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".65" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".13"/></feComponentTransfer><feBlend in="SourceGraphic" mode="multiply"/></filter>
 </defs>`;
function tree(x:number, base:number, h:number, w:number, seed:number, color:string, detail=false) {
  const r=mulberry32(seed); let s=`<g><path d="M${x-w/2} ${base} Q${x+w*.2} ${base-h*.45} ${x-w*.18} ${base-h} L${x+w*.3} ${base-h} Q${x+w*.3} ${base-h*.4} ${x+w/2} ${base}Z" fill="${color}"/>`;
  for(let j=0;j<7;j++){const y=base-h*(.3+r()*.65),dir=j%2?1:-1,len=w*(2+r()*3),ey=y-h*(.06+r()*.14);s+=`<path d="M${x} ${y+12} Q${x+dir*len*.45} ${ey+20} ${x+dir*len} ${ey} Q${x+dir*len*.55} ${ey+30} ${x} ${y+35}Z" fill="${color}"/>`;
    for(let k=0;k<3;k++){const bx=x+dir*len*(.3+k*.2),by=ey+(y-ey)*(.3+k*.2);s+=`<path d="M${bx} ${by}l${dir*len*.18} ${-h*.07}m${-dir*len*.09} ${h*.035}l${dir*len*.2} ${-h*.015}" fill="none" stroke="${color}" stroke-width="${Math.max(1,w*.035)}"/>`;}
  }
  if(detail){for(let j=0;j<11;j++){const xx=x-w*.43+r()*w*.8;s+=`<path d="M${xx} ${base-r()*h*.2}q${r()*12-6} ${-h*.2} ${r()*14-7} ${-h*(.35+r()*.4)}" fill="none" stroke="${j%3?'#79918e':'#030f15'}" stroke-width="${j%3?.8:2}" opacity=".45"/>`;}
    s+=`<path d="M${x-w*.35} ${base}q${w*.2} ${-h*.4} ${w*.13} ${-h*.9}" fill="none" stroke="#9cafa4" stroke-width="1.6" opacity=".6"/>`;}
  return s+'</g>';
}
function forestSVG(){
  const r=mulberry32(41);let s=`<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">${defs}<rect width="1600" height="900" fill="url(#sky)"/><circle cx="875" cy="205" r="93" fill="#d4dfd4"/><circle cx="875" cy="205" r="110" fill="#d4dfd4" opacity=".06"/>`;
  s+=`<path d="M0 430L120 350 240 390 390 280 530 370 660 305 820 400 1000 320 1170 360 1370 260 1600 410V900H0Z" fill="#45646c" opacity=".65"/>`;
  for(let i=0;i<42;i++){const x=i*41+r()*20,h=350+r()*380;s+=tree(x,720+r()*80,h,7+r()*14,i+100,'#45636a');}
  s+=`<rect y="360" width="1600" height="430" fill="url(#mist)"/>`;
  for(let i=0;i<22;i++){const x=i*78+r()*30; if(x>650&&x<990)continue;s+=tree(x,820+r()*60,650+r()*300,18+r()*25,i+200,'#29474f');}
  s+=`<path d="M0 785Q320 720 650 755Q810 710 1010 755Q1300 720 1600 790V900H0Z" fill="#365158"/><path d="M775 735Q720 790 540 900H1150Q875 795 860 735Z" fill="#829b98"/>`;
  for(let i=0;i<115;i++){const x=r()*1600,y=770+r()*130;s+=`<path d="M${x} ${y}l${10+r()*90} ${r()*3-1.5}" stroke="${i%3?'#b8c8bb':'#1c3942'}" stroke-width="${r()*1.8+.3}" opacity=".5"/>`;}
  s+=`<path d="M0 0H1600V130Q1330 55 1170 125Q960 50 790 95Q510 30 340 130Q130 80 0 170Z" fill="#142d35"/>`;
  for(let i=0;i<65;i++){const x=r()*1600,y=r()*100;s+=`<path d="M${x} ${y}q${30+r()*70} ${20+r()*40} ${100+r()*80} ${r()*40}" stroke="#142d35" stroke-width="${3+r()*10}" fill="none"/>`;}
  s+=`<rect width="1600" height="900" fill="url(#dots)" opacity=".24"/><rect width="1600" height="900" opacity=".3" filter="url(#grain)"/>`;
  return s+'</svg>';
}
function treesSVG(foreground=false){
  let s=`<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">${defs}`;
  if(foreground){s+=tree(80,1020,1250,135,901,'url(#trunk)',true)+tree(1530,1040,1320,160,902,'url(#trunk)',true);s+=`<path d="M0 80Q220 180 460 55L610 0H0ZM1600 40Q1430 160 1190 65L1090 0H1600Z" fill="#081b22"/><path d="M60 300Q250 190 390 215L520 175 395 235Q215 235 90 365ZM1510 240Q1320 170 1230 215L1090 180 1235 240Q1390 220 1500 300Z" fill="#081b22"/>`;
    for(let i=0;i<16;i++){let x=i<8?170+i*37:1200+(i-8)*35,y=120+(i%8)*14;s+=`<path d="M${x} ${y}q25 60 80 70q-65-15-80-70" fill="#0b2229"/>`;}
  }else {s+=tree(285,960,1150,74,31,'url(#trunk)',true)+tree(1320,970,1180,83,32,'url(#trunk)',true)+tree(470,910,1050,35,33,'#1b373e',true)+tree(1140,910,1070,40,34,'#1b373e',true);}
  return s+'</svg>';
}
function characterSVG(){return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900">
 <defs><linearGradient id="coat" x1="0" x2="1"><stop stop-color="#07131b"/><stop offset=".6" stop-color="#142731"/><stop offset="1" stop-color="#354a50"/></linearGradient><pattern id="ht" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(-25)"><path d="M0 0V6" stroke="#c1ccc3" stroke-width=".65" opacity=".4"/></pattern></defs>
 <ellipse cx="302" cy="858" rx="139" ry="16" fill="#06151c" opacity=".5"/>
 <path d="M272 615L253 745 226 837 267 848 310 754 326 657 341 752 368 843 409 837 389 723 371 608Z" fill="#0a1720" stroke="#657c7e" stroke-width="2"/>
 <path d="M253 753L244 824 222 842Q207 858 223 865L273 864 282 837 286 771ZM359 765L370 837 365 860 425 861Q440 850 413 839L402 754Z" fill="#07131b" stroke="#718582" stroke-width="2"/>
 <path d="M247 775L276 786M244 793L272 804M241 811L269 821M370 786L403 778M374 805L407 797M378 823L412 815" stroke="#71817e" stroke-width="3"/>
 <path d="M266 248Q228 259 211 310L185 433 151 577 192 605 223 520 239 471 232 618 205 690Q270 674 305 647Q349 683 425 692L393 581 385 448 426 515 451 493 414 353Q404 285 351 263Z" fill="url(#coat)" stroke="#9aaba2" stroke-width="2.5"/>
 <path d="M272 267L310 326 345 267 373 302 337 383 298 411 253 321Z" fill="#667b7b" stroke="#0a1821" stroke-width="4"/>
 <path d="M272 274L309 337 294 390 262 324ZM344 278L317 338 303 394 342 355 365 307Z" fill="#b3beb2"/>
 <path d="M298 395L321 393 345 536 306 561 279 535Z" fill="#152731" stroke="#6e8583" stroke-width="2"/>
 <path d="M242 493Q300 513 376 490L384 525Q303 548 237 526Z" fill="#7c8980" stroke="#07151c" stroke-width="4"/>
 <path d="M251 505L369 503M246 516L375 515" stroke="#1b3037" stroke-width="4"/><path d="M298 504L322 502 325 527 300 530Z" fill="#c5c9b7" stroke="#10232b" stroke-width="3"/>
 <path d="M244 540L224 662 266 641 289 557M337 551L365 650 405 674 373 540" fill="url(#ht)" stroke="#69807e" stroke-width="1.5"/>
 <path d="M251 342L225 461 203 535M263 365L245 461M356 353L374 451 407 492M345 400L358 466M291 567L276 622M350 573L369 628" fill="none" stroke="#a2afa3" stroke-width="2" opacity=".65"/>
 <path d="M225 367Q204 415 200 455L231 491 255 472 239 438 260 388Z" fill="#182c35" stroke="#8c9f95" stroke-width="2"/>
 <path d="M203 452L187 475 197 500 218 505 237 485 229 468Z" fill="#b3bfb0" stroke="#10232b" stroke-width="3"/>
 <path d="M389 389L405 427 387 460 365 448 372 422 364 400Z" fill="#1b3039" stroke="#91a397" stroke-width="2"/>
 <path d="M387 451L401 447 416 463 410 482 394 487 379 473Z" fill="#b9c3b3" stroke="#10232b" stroke-width="3"/>
 <path d="M397 470L420 484 430 474 406 458Z" fill="#14242c" stroke="#bac6b7" stroke-width="2"/>
 <path d="M417 478L552 283 558 255 539 273 407 471Z" fill="#d7dfd0" stroke="#10232b" stroke-width="2"/><path d="M421 472L548 278" stroke="#fffbe0" stroke-width="2"/>
 <path d="M278 230L276 267 307 298 337 267 337 226Z" fill="#a6b7a9" stroke="#10232b" stroke-width="3"/>
 <path d="M260 158Q285 119 330 143L351 185 343 224 323 251 298 255 273 233 263 203Z" fill="#c1cabb" stroke="#0a1b24" stroke-width="3"/>
 <path d="M321 167L340 190 330 202 337 213 322 218 319 239 302 249 327 246 344 224 351 185Z" fill="#718981"/>
 <path d="M258 194L244 174 253 153 236 151 263 135 254 116 281 124 292 98 309 119 334 106 337 127 365 132 354 147 371 169 352 198 338 174 323 158 320 187 303 166 290 194 282 171 267 207Z" fill="#081720" stroke="#718781" stroke-width="2"/>
 <path d="M270 203L291 200 286 207ZM315 198L334 194 328 202Z" fill="#09202a"/><path d="M278 203L287 203M320 199L328 198" stroke="#e5e6cb" stroke-width="2"/>
 <path d="M306 204L301 220 308 221M299 233L315 231" fill="none" stroke="#344e50" stroke-width="2"/>
 <path d="M264 253Q294 274 338 253L355 274Q310 303 266 279Z" fill="#172c34" stroke="#8b9e92" stroke-width="2"/>
 <path d="M270 266Q213 266 170 235Q116 205 61 235Q135 232 169 270Q213 300 278 282Z" fill="#233c43" stroke="#819a90" stroke-width="2"/>
 <path d="M264 273Q188 288 136 264Q91 248 39 268" fill="none" stroke="#b1bfb0" stroke-width="1.5"/>
 <path d="M228 616L213 675M391 628L411 678M188 553L175 580" stroke="#c3ccba" stroke-width="2"/>
 </svg>`;
}
function sfxSVG(){return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="260" viewBox="0 0 800 260"><defs><pattern id="d" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.3" fill="#132b32"/></pattern></defs><g transform="translate(25 190) rotate(-8) skewX(-12)"><text x="5" y="5" font-family="sans-serif" font-weight="900" font-size="155" font-style="italic" letter-spacing="-9" fill="#0a1c24" stroke="#0a1c24" stroke-width="18">ZAÀ…</text><text font-family="sans-serif" font-weight="900" font-size="155" font-style="italic" letter-spacing="-9" fill="#dce4d5" stroke="#18333c" stroke-width="3" paint-order="stroke">ZAÀ…</text></g><path d="M55 218L670 155M95 232L540 192M600 50L752 28" stroke="#dce4d5" stroke-width="3"/></svg>`;}
function attackSVG(){let s=`<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900"><defs><pattern id="dots" width="8" height="8" patternUnits="userSpaceOnUse"><circle cx="4" cy="4" r="2" fill="#142029"/></pattern></defs><rect width="1600" height="900" fill="#c9d2c8"/><circle cx="800" cy="450" r="650" fill="url(#dots)"/>`;const r=mulberry32(53);for(let i=0;i<150;i++){const a=r()*Math.PI*2,rad=180+r()*350;s+=`<path d="M${800+Math.cos(a)*rad} ${450+Math.sin(a)*rad*.6}L${800+Math.cos(a)*1400} ${450+Math.sin(a)*1000}" stroke="#10212a" stroke-width="${r()*4+.5}"/>`;}return s+'</svg>'; }
function pageSVG(n:number){
  const titles=['ĐÊM KHÔNG TRĂNG','TIẾNG BƯỚC CHÂN','LƯỠI KIẾM THỨC TỈNH','NHÁT CẮT ĐỊNH MỆNH','SAU CƠN MƯA'];
  const captions=['Rừng phía Bắc. Một đêm mưa không có trăng.','Có ai đó đang đến. Không một tiếng thở.','“Ta đã đợi ngươi từ rất lâu.”','Một hơi thở. Một đường kiếm.','Bình minh sẽ đến. Nhưng đêm nay chưa kết thúc.'];
  const f=uri(forestSVG()),c=uri(characterSVG()),t=uri(treesSVG()),a=uri(attackSVG());
  const image=(url:string,x:number,y:number,w:number,h:number)=>`<image href="${url}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice"/>`;
  let s=`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1280" viewBox="0 0 900 1280"><rect width="900" height="1280" fill="#e5e8df"/><text x="42" y="43" font-family="sans-serif" font-size="14" letter-spacing="4" fill="#24333a">MANGAMOTION / CHUYỆN CỦA ĐÊM</text><text x="855" y="43" text-anchor="end" font-family="sans-serif" font-size="16" fill="#24333a">0${n} / 05</text>`;
  const panel=(id:string,x:number,y:number,w:number,h:number)=>`<clipPath id="p${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}"/></clipPath>`;
  s+=`<defs>${panel('1',40,70,820,450)}${panel('2',40,536,395,470)}${panel('3',451,536,409,470)}</defs>`;
  s+=`<g clip-path="url(#p1)">${image(n===4?a:f,40,70,820,450)}${n!==4?image(t,40,70,820,450):''}${n===3||n===5?image(c,330,120,310,465):''}</g><g clip-path="url(#p2)">${image(n===2?t:f,40,536,395,470)}${image(c,n===2?70:95,600,300,450)}</g><g clip-path="url(#p3)">${image(n===4?a:f,451,536,409,470)}${n===4?image(c,380,520,530,795):image(c,515,650,250,375)}</g>`;
  s+=`<g fill="none" stroke="#11232c" stroke-width="7"><rect x="40" y="70" width="820" height="450"/><rect x="40" y="536" width="395" height="470"/><rect x="451" y="536" width="409" height="470"/></g>`;
  s+=`<rect x="62" y="91" width="${n===1?365:430}" height="51" fill="#e5e8df"/><text x="78" y="123" font-family="sans-serif" font-weight="800" font-size="23" fill="#152731">${titles[n-1]}</text><rect x="60" y="948" width="355" height="42" fill="#e5e8df"/><text x="72" y="975" font-family="sans-serif" font-size="14" fill="#152731">${captions[n-1]}</text>`;
  if(n===3)s+=`<ellipse cx="665" cy="622" rx="161" ry="53" fill="#f1f2e9" stroke="#14252c" stroke-width="3"/><path d="M610 665L590 701 647 672" fill="#f1f2e9" stroke="#14252c" stroke-width="3"/><text x="665" y="616" text-anchor="middle" font-family="sans-serif" font-size="18" font-weight="700" fill="#14252c">Ta đã đợi ngươi</text><text x="665" y="642" text-anchor="middle" font-family="sans-serif" font-size="18" font-weight="700" fill="#14252c">từ rất lâu.</text>`;
  if(n===4)s+=`<g transform="translate(120 450) rotate(-12)"><text font-family="sans-serif" font-weight="900" font-style="italic" font-size="115" fill="#eff0e4" stroke="#14252c" stroke-width="9" paint-order="stroke">VÚT!</text></g>`;
  s+=`<path d="M40 1040H860" stroke="#24333a"/><text x="40" y="1080" font-family="sans-serif" font-weight="800" font-size="30" fill="#14252c">${n.toString().padStart(2,'0')} — ${titles[n-1]}</text><text x="40" y="1116" font-family="sans-serif" font-size="17" fill="#42555b">${captions[n-1]}</text><text x="40" y="1215" font-family="sans-serif" font-size="12" letter-spacing="3" fill="#52656a">STORYBOARD → MULTIPLANE → MOTION MANGA</text><text x="860" y="1250" text-anchor="end" font-family="sans-serif" font-size="17" fill="#24333a">${n}</text></svg>`;
  return s;
}
export function svgData(svg:string){return uri(svg);}
export function createArtwork():Asset[]{
 const list:[string,string,string,number,number][]=[['forest','Rừng · hậu cảnh',forestSVG(),1600,900],['trees','Thân cây · trung cảnh',treesSVG(),1600,900],['tree-card','Thân cây · thẻ trong suốt',`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="1000" viewBox="0 0 400 1000">${defs}${tree(200,1050,1200,65,731,'url(#trunk)',true)}</svg>`,400,1000],['foreground','Cành cây · tiền cảnh',treesSVG(true),1600,900],['ronin','Ronin · nhân vật',characterSVG(),600,900],['sfx','ZAÀ… · chữ tượng thanh',sfxSVG(),800,260],['attack','Action lines · nền',attackSVG(),1600,900]];
 for(let i=1;i<=5;i++)list.push([`page-${i}`,`Trang 0${i} · ${['Thiết lập','Nhịp bước','Đối đầu','Cao trào','Kết thúc'][i-1]}`,pageSVG(i),900,1280]);
 return list.map(([id,name,svg,width,height])=>({id,name,type:'svg',url:uri(svg),thumbnail:uri(svg),width,height,builtIn:true}));
}
