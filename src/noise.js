// seeded RNG + value/simplex-ish noise
export function mulberry(seed){let a=seed>>>0;return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const P=new Uint8Array(512);{const r=mulberry(1337);const p=[...Array(256).keys()];for(let i=255;i>0;i--){const j=Math.floor(r()*(i+1));[p[i],p[j]]=[p[j],p[i]]}for(let i=0;i<512;i++)P[i]=p[i&255]}
const fade=t=>t*t*t*(t*(t*6-15)+10);
function grad(h,x,y){const u=(h&1)?-x:x,v=(h&2)?-y:y;return u+v}
export function perlin(x,y){const X=Math.floor(x)&255,Y=Math.floor(y)&255;x-=Math.floor(x);y-=Math.floor(y);const u=fade(x),v=fade(y);
 const a=P[X]+Y,b=P[X+1]+Y;const l=(p,q,t)=>p+t*(q-p);
 return l(l(grad(P[a],x,y),grad(P[b],x-1,y),u),l(grad(P[a+1],x,y-1),grad(P[b+1],x-1,y-1),u),v)}
export function fbm(x,y,o=4,lac=2,g=0.5){let s=0,a=1,f=1,n=0;for(let i=0;i<o;i++){s+=perlin(x*f,y*f)*a;n+=a;a*=g;f*=lac}return s/n}
export const clamp=(v,a,b)=>v<a?a:v>b?b:v;
export const lerp=(a,b,t)=>a+(b-a)*t;
export const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};
export const angDiff=(a,b)=>{let d=(b-a)%(Math.PI*2);if(d>Math.PI)d-=Math.PI*2;if(d<-Math.PI)d+=Math.PI*2;return d};
export const lerpAng=(a,b,t)=>a+angDiff(a,b)*t;
