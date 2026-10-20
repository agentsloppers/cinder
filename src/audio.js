// Procedural audio: all synthesized with WebAudio. No samples needed.
let ac=null,master,sfxBus,musBus,noiseBuf,reverb;
export const Audio={vol:{master:0.8,sfx:0.9,music:0.5},
 init(){ if(ac)return; ac=new (window.AudioContext||window.webkitAudioContext)(); master=ac.createGain(); master.gain.value=this.vol.master;
  const comp=ac.createDynamicsCompressor(); comp.threshold.value=-14; comp.ratio.value=4; master.connect(comp); comp.connect(ac.destination);
  sfxBus=ac.createGain(); sfxBus.gain.value=this.vol.sfx; sfxBus.connect(master); musBus=ac.createGain(); musBus.gain.value=this.vol.music; musBus.connect(master);
  noiseBuf=ac.createBuffer(1,ac.sampleRate*2,ac.sampleRate); const d=noiseBuf.getChannelData(0); for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  // cheap reverb: decaying noise impulse
  const len=ac.sampleRate*2.4,imp=ac.createBuffer(2,len,ac.sampleRate); for(let c=0;c<2;c++){const ch=imp.getChannelData(c);for(let i=0;i<len;i++)ch[i]=(Math.random()*2-1)*Math.pow(1-i/len,3.2)}
  reverb=ac.createConvolver(); reverb.buffer=imp; const rg=ac.createGain(); rg.gain.value=0.35; reverb.connect(rg); rg.connect(master);
 },
 resume(){ if(ac&&ac.state!=='running')ac.resume() },
 setVol(k,v){ this.vol[k]=v; if(!ac)return; if(k==='master')master.gain.value=v; if(k==='sfx')sfxBus.gain.value=v; if(k==='music')musBus.gain.value=v },
 get now(){return ac?ac.currentTime:0},
 _noise(t,dur,{type='lowpass',f=1000,f2=null,q=1,g=0.3,a=0.005,rev=0,pan=0}={}){ if(!ac)return; const s=ac.createBufferSource(); s.buffer=noiseBuf; s.loop=true; s.playbackRate.value=0.8+Math.random()*0.4;
  const fl=ac.createBiquadFilter(); fl.type=type; fl.frequency.setValueAtTime(f,t); if(f2)fl.frequency.exponentialRampToValueAtTime(f2,t+dur); fl.Q.value=q;
  const gn=ac.createGain(); gn.gain.setValueAtTime(0,t); gn.gain.linearRampToValueAtTime(g,t+a); gn.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  s.connect(fl);fl.connect(gn); this._out(gn,rev,pan); s.start(t,Math.random()); s.stop(t+dur+0.05) },
 _tone(t,dur,{f=200,f2=null,type='sine',g=0.3,a=0.005,rev=0,pan=0}={}){ if(!ac)return; const o=ac.createOscillator(); o.type=type; o.frequency.setValueAtTime(f,t); if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+dur);
  const gn=ac.createGain(); gn.gain.setValueAtTime(0,t); gn.gain.linearRampToValueAtTime(g,t+a); gn.gain.exponentialRampToValueAtTime(0.0001,t+dur); o.connect(gn); this._out(gn,rev,pan); o.start(t); o.stop(t+dur+0.05) },
 _out(n,rev,pan){ let out=n; if(pan&&ac.createStereoPanner){const p=ac.createStereoPanner();p.pan.value=pan;n.connect(p);out=p} out.connect(sfxBus); if(rev){const r=ac.createGain();r.gain.value=rev;out.connect(r);r.connect(reverb)} },
 play(name,o={}){ if(!ac||ac.state!=='running')return; const t=ac.currentTime+0.001; const fn=this.S[name]; if(fn)fn.call(this,t,o) },
 S:{
  swing(t,o){ const h=o.heavy; this._noise(t,h?0.34:0.2,{type:'bandpass',f:h?500:900,f2:h?1800:3200,q:1.2,g:h?0.5:0.32,a:0.06}); },
  hit(t,o){ const h=o.heavy; this._noise(t,0.12,{type:'lowpass',f:2800,f2:300,g:0.7}); this._tone(t,0.16,{f:h?110:160,f2:45,type:'sine',g:0.9}); this._tone(t,0.08,{f:900,f2:200,type:'square',g:0.12}); },
  flesh(t,o){ this._noise(t,0.18,{type:'lowpass',f:1800,f2:200,g:0.6}); this._tone(t,0.2,{f:90,f2:40,g:0.8}); },
  clang(t,o){ for(const f of [820,1230,1790,2410])this._tone(t,0.5,{f:f*(1+Math.random()*0.02),type:'triangle',g:0.12,rev:0.4}); this._noise(t,0.06,{type:'highpass',f:3000,g:0.4}); },
  parry(t,o){ for(const f of [1400,2100,3150,4200])this._tone(t,0.9,{f,type:'sine',g:0.14,rev:0.6}); this._noise(t,0.08,{type:'highpass',f:4000,g:0.5}); this._tone(t,0.25,{f:200,f2:60,g:0.8}); },
  block(t,o){ this._noise(t,0.1,{type:'bandpass',f:1500,q:2,g:0.5}); this._tone(t,0.14,{f:240,f2:90,type:'triangle',g:0.6}); },
  roll(t,o){ this._noise(t,0.35,{type:'bandpass',f:600,f2:250,q:0.8,g:0.28,a:0.05}); },
  step(t,o){ this._noise(t,0.07,{type:'lowpass',f:o.f||500,g:0.1+(o.g||0)}); },
  hurt(t,o){ this._tone(t,0.3,{f:260,f2:90,type:'sawtooth',g:0.25}); this._noise(t,0.2,{type:'lowpass',f:1200,f2:200,g:0.5}); },
  death(t,o){ this._tone(t,1.6,{f:220,f2:35,type:'sawtooth',g:0.3,rev:0.5}); this._noise(t,1.2,{type:'lowpass',f:800,f2:60,g:0.5,rev:0.4}); },
  ui(t,o){ this._tone(t,0.07,{f:700,f2:900,type:'triangle',g:0.15}) },
  uiOk(t,o){ this._tone(t,0.12,{f:520,type:'triangle',g:0.18}); this._tone(t+0.07,0.2,{f:780,type:'triangle',g:0.18}) },
  flask(t,o){ for(let i=0;i<4;i++)this._noise(t+i*0.12,0.1,{type:'bandpass',f:700+i*120,q:3,g:0.25}); this._tone(t+0.5,0.5,{f:440,f2:660,type:'sine',g:0.12,rev:0.3}) },
  shrine(t,o){ [261,329,392,523,659].forEach((f,i)=>this._tone(t+i*0.14,2.2,{f,type:'sine',g:0.16,rev:0.8,a:0.05})) },
  levelup(t,o){ [392,523,659,784].forEach((f,i)=>this._tone(t+i*0.09,0.7,{f,type:'triangle',g:0.18,rev:0.5})) },
  pickup(t,o){ this._tone(t,0.15,{f:880,type:'triangle',g:0.18});this._tone(t+0.08,0.25,{f:1320,type:'triangle',g:0.18,rev:0.3}) },
  roar(t,o){ this._tone(t,1.4,{f:90,f2:50,type:'sawtooth',g:0.5,rev:0.5}); this._noise(t,1.4,{type:'bandpass',f:300,f2:120,q:1,g:0.7,a:0.3,rev:0.4}) },
  boom(t,o){ this._tone(t,0.9,{f:80,f2:28,g:1,rev:0.4}); this._noise(t,0.6,{type:'lowpass',f:1500,f2:100,g:0.9}) },
  cast(t,o){ this._tone(t,0.6,{f:300,f2:1200,type:'sine',g:0.2,rev:0.5}); this._noise(t,0.5,{type:'bandpass',f:2000,f2:5000,q:2,g:0.15,a:0.2}) },
  bolt(t,o){ this._tone(t,0.25,{f:900,f2:200,type:'sawtooth',g:0.15,rev:0.3}) },
  warn(t,o){ this._tone(t,0.14,{f:1000,type:'square',g:0.05}); },
  pull(t,o){ for(let i=0;i<8;i++)this._tone(t+i*0.07,0.6,{f:300+i*110,type:'sine',g:0.1,rev:0.6}); },
  reveal(t,o){ const r=o.r||3; const notes=r>=5?[261,392,523,659,784,1046]:r===4?[330,494,659,988]:[330,494]; notes.forEach((f,i)=>this._tone(t+i*0.1,1.8,{f,type:'triangle',g:0.2,rev:0.8})); if(r>=5)this._noise(t,1.5,{type:'highpass',f:5000,g:0.2,a:0.5,rev:0.5}) },
  bossdie(t,o){ this._tone(t,3,{f:120,f2:30,type:'sawtooth',g:0.5,rev:0.8}); this._noise(t,2.5,{type:'lowpass',f:2000,f2:50,g:0.8,rev:0.6}); },
 },
 // ambient + music: low drone pad with slow heartbeat; mood changes with `setMood`
 startMusic(){ if(!ac||this._mus)return; this._mus=true; const root=ac.createGain(); root.gain.value=0; root.connect(musBus); const r2=ac.createGain(); r2.gain.value=0.5; root.connect(r2); r2.connect(reverb);
  this._musGain=root; const notes=[55,82.4,110,130.8]; this._oscs=notes.map((f,i)=>{const o=ac.createOscillator(),g=ac.createGain(),l=ac.createOscillator(),lg=ac.createGain(); o.type=i%2?'sawtooth':'triangle'; o.frequency.value=f; const fl=ac.createBiquadFilter();fl.type='lowpass';fl.frequency.value=420; l.frequency.value=0.05+i*0.03; lg.gain.value=0.04; l.connect(lg); lg.connect(g.gain); g.gain.value=0.05; o.connect(fl); fl.connect(g); g.connect(root); o.start(); l.start(); return {o,g,fl}});
  // wind
  const w=ac.createBufferSource(); w.buffer=noiseBuf; w.loop=true; const wf=ac.createBiquadFilter(); wf.type='bandpass'; wf.frequency.value=400; wf.Q.value=0.6; const wg=ac.createGain(); wg.gain.value=0.05; const wl=ac.createOscillator(); wl.frequency.value=0.09; const wlg=ac.createGain(); wlg.gain.value=0.03; wl.connect(wlg); wlg.connect(wg.gain); w.connect(wf); wf.connect(wg); wg.connect(musBus); w.start(); wl.start(); this._wind={wf,wg};
  root.gain.linearRampToValueAtTime(1,ac.currentTime+4); this.mood('explore') },
 mood(m){ this._moodName=m; if(!ac||!this._oscs)return; const t=ac.currentTime; const set={explore:[420,0.05],combat:[900,0.075],boss:[1400,0.1],shrine:[260,0.04],menu:[300,0.05]}[m]||[420,0.05]; this._oscs.forEach((x,i)=>{x.fl.frequency.linearRampToValueAtTime(set[0]*(1+i*0.2),t+2);x.g.gain.linearRampToValueAtTime(set[1],t+2)}) },
 // boss/combat pulse
 thump(){ if(!ac)return; const t=ac.currentTime; this._tone(t,0.25,{f:70,f2:35,g:0.5}) },
};
