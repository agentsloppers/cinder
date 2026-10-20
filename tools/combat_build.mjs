import * as esbuild from 'esbuild';
import path from 'path';
const STUB=path.resolve('tools/stubs.js');
const swap=['engine.js','assets.js','fx.js','audio.js','player.js','knight_rig.js'];
await esbuild.build({entryPoints:['tools/combat.js'],bundle:true,platform:'node',format:'esm',outfile:'tools/.combat.mjs',logLevel:'error',external:['three'],
 plugins:[{name:'stub',setup(b){ b.onResolve({filter:/\.js$/},a=>{ const base=path.basename(a.path); if(a.importer&&swap.includes(base)&&a.importer.includes('/src/'))return {path:STUB}; return null }) }}]});
