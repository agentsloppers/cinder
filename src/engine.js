import * as THREE from 'three';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import {ShaderPass} from 'three/examples/jsm/postprocessing/ShaderPass.js';
import {RGBELoader} from 'three/examples/jsm/loaders/RGBELoader.js';
import {OutputPass} from 'three/examples/jsm/postprocessing/OutputPass.js';
export {THREE};

const GradeShader={uniforms:{tDiffuse:{value:null},time:{value:0},vig:{value:0.55},grain:{value:0.045},hurt:{value:0},fade:{value:0},tint:{value:new THREE.Vector3(1,1,1)},desat:{value:0}},
 vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
 fragmentShader:`uniform sampler2D tDiffuse;uniform float time,vig,grain,hurt,fade,desat;uniform vec3 tint;varying vec2 vUv;
 float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233))+time)*43758.5453);}
 void main(){vec2 uv=vUv;vec2 c=uv-.5;float d=dot(c,c);
  vec2 off=c*d*0.012; vec3 col=vec3(texture2D(tDiffuse,uv-off).r,texture2D(tDiffuse,uv).g,texture2D(tDiffuse,uv+off).b);
  float l=dot(col,vec3(.299,.587,.114)); col=mix(vec3(l),col,0.92-desat); col*=tint;
  col=mix(col*vec3(.96,.98,1.06),col*vec3(1.06,1.0,.92),smoothstep(.2,.8,l));
  col*=1.-vig*smoothstep(.12,.62,d*1.9); col=mix(col,vec3(.55,.02,.02)*(1.-d),hurt*smoothstep(.05,.5,d)*.9);
  col+=(h(uv*vec2(1920.,1080.))-.5)*grain; col*=1.-fade; gl_FragColor=vec4(col,1.);}`};

export const Engine={
 init(canvas){
  const q=(localStorage.getItem('ch_quality')||'high'); this.quality=q;
  const r=this.renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance'});
  r.debug.checkShaderErrors=true; r.debug.onShaderError=(gl,prog,vs,fs)=>{ const log=(gl.getShaderInfoLog(fs)||'')+(gl.getShaderInfoLog(vs)||''); console.warn('CINDER shader fail',log.slice(0,400));
   try{ fetch('/api/tele',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({ev:[{t:Date.now(),type:'shaderfail',d:log.slice(0,600)}]})}) }catch(_){}
   if(!localStorage.getItem('cinder_safe_shaders')){ localStorage.setItem('cinder_safe_shaders','1'); setTimeout(()=>location.reload(),300) } };
  r.shadowMap.enabled=true; r.shadowMap.type=THREE.PCFSoftShadowMap; r.toneMapping=THREE.ACESFilmicToneMapping; r.toneMappingExposure=0.92; r.outputColorSpace=THREE.SRGBColorSpace;
  this.scene=new THREE.Scene(); this.camera=new THREE.PerspectiveCamera(62,1,0.1,900);
  this.scene.fog=new THREE.FogExp2(0x2a2a38,0.0085); this.scene.background=new THREE.Color(0x2a2a38);
  // lighting: low dusk sun + cool sky fill
  this.hemi=new THREE.HemisphereLight(0x8fa3d6,0x3a2f28,0.9); this.scene.add(this.hemi);
  this.sun=new THREE.DirectionalLight(0xffb27a,3.1); this.sun.position.set(-60,45,-30); this.sun.castShadow=true; const sh=this.sun.shadow;
  sh.mapSize.set(q==='low'?1024:2048,q==='low'?1024:2048); const S=48; Object.assign(sh.camera,{left:-S,right:S,top:S,bottom:-S,near:1,far:220}); sh.bias=-0.0006; sh.normalBias=0.04;
  this.scene.add(this.sun); this.scene.add(this.sun.target);
  try{ const pm=new THREE.PMREMGenerator(r); new RGBELoader().load('/a/ph/misty_pines/misty_pines_1k.hdr',t=>{ this.scene.environment=pm.fromEquirectangular(t).texture; this.scene.environmentIntensity=0.35; t.dispose(); pm.dispose() },undefined,()=>{}); }catch(e){}
  this.sunDir=new THREE.Vector3(-60,45,-30).normalize();
  this.buildSky();
  this.composer=null; this.setupComposer();
  this.pr=Math.min(devicePixelRatio||1, q==='low'?1:1.5); this.resize(); addEventListener('resize',()=>this.resize());
  this.clock=new THREE.Clock(); this.ft=[]; this.shake=0; this.grade=this.gradePass.uniforms;
 },
 setupComposer(){
  const r=this.renderer; this.composer=new EffectComposer(r); this.composer.addPass(new RenderPass(this.scene,this.camera));
  if(this.quality!=='low'){ this.bloom=new UnrealBloomPass(new THREE.Vector2(512,512),0.42,0.7,0.82); this.composer.addPass(this.bloom); }
  this.composer.addPass(new OutputPass()); this.gradePass=new ShaderPass(GradeShader); this.composer.addPass(this.gradePass);
 },
 buildSky(){
  const g=new THREE.SphereGeometry(700,32,16); const m=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,uniforms:{sunDir:{value:this.sunDir},time:{value:0}},
   vertexShader:`varying vec3 vP;void main(){vP=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
   fragmentShader:`varying vec3 vP;uniform vec3 sunDir;uniform float time;
   float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
   float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
   void main(){vec3 d=normalize(vP);float y=d.y;
    vec3 hor=vec3(.62,.33,.22),mid=vec3(.20,.20,.34),top=vec3(.045,.05,.11);
    vec3 c=mix(hor,mid,smoothstep(-.02,.28,y)); c=mix(c,top,smoothstep(.2,.9,y));
    float s=max(dot(d,sunDir),0.); c+=vec3(1.,.55,.28)*pow(s,10.)*.55+vec3(1.,.8,.5)*pow(s,300.)*3.;
    vec2 uv=d.xz/(d.y+.25)*1.4; float cl=noise(uv*1.6+time*.004)*.6+noise(uv*3.7-time*.006)*.4; cl=smoothstep(.45,.85,cl)*smoothstep(0.,.25,y);
    c=mix(c,mix(vec3(.28,.2,.22),vec3(.9,.5,.3),pow(s,3.)),cl*.55);
    vec2 sp=floor(d.xz/(d.y+.3)*180.);float st=step(.9965,hash(sp))*smoothstep(.25,.6,y);c+=vec3(st)*.8;
    if(y<0.) c=mix(hor*.5,vec3(.05,.05,.07),smoothstep(0.,-.2,y));
    gl_FragColor=vec4(c,1.);}`});
  this.sky=new THREE.Mesh(g,m); this.sky.renderOrder=-10; this.sky.frustumCulled=false; this.scene.add(this.sky);
 },
 resize(){ const w=innerWidth,h=innerHeight; this.renderer.setPixelRatio(this.pr); this.renderer.setSize(w,h,false); this.composer.setPixelRatio(this.pr); this.composer.setSize(w,h); this.camera.aspect=w/h; this.camera.updateProjectionMatrix(); this.w=w;this.h=h },
 followSun(p){ this.sun.target.position.set(p.x,p.y,p.z); this.sun.position.set(p.x+this.sunDir.x*100,p.y+this.sunDir.y*100,p.z+this.sunDir.z*100); this.sky.position.copy(this.camera.position) },
 render(dt){ const t=performance.now()/1000; this.grade.time.value=t%10; this.sky.material.uniforms.time.value=t;
  // adaptive resolution
  this.ft.push(dt); if(this.ft.length>90){const a=this.ft.reduce((s,x)=>s+x,0)/this.ft.length; this.ft=[]; if(a>0.026&&this.pr>0.75){this.pr=Math.max(0.75,this.pr-0.25);this.resize()} else if(a<0.0155&&this.pr<Math.min(devicePixelRatio||1,this.quality==='low'?1:1.5)){this.pr=Math.min(this.pr+0.25,1.5);this.resize()}}
  this.composer.render(dt); },
};
