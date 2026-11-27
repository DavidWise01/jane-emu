const assert=require('node:assert/strict'),fs=require('node:fs');
const a=fs.readFileSync('dashboard/arena.html','utf8'),j=fs.readFileSync('dashboard/waterbear-room.js','utf8'),c=fs.readFileSync('dashboard/waterbear-biome.css','utf8');
new Function(j);
assert.equal((a.match(/<iframe\b/g)||[]).length,1);
for(const x of ['id="game"','av186-three-tools','waterbear-room.css','waterbear-biome.css','waterbear-room.js','JANE_WATERBEAR_OBSERVATIONS'])assert.ok(a.includes(x),x);
for(const x of ['#ff963c','#65ed75','#c18aff','[11,12,13,14,15]','syncMesh(actor)','pulse(c,p,snapshot)','biome(c,p,snapshot)','inhabit(c,p,snapshot)','exchange(snapshot)','socialize(snapshot)','journal(snapshot)','JANE_WATERBEAR_JOURNAL','wb-midnight-heart','Export observation journals'])assert.ok(j.includes(x),x);
for(const x of ['wbSignal','wbCubitPulse','wbTravel','wbBreath','wbSocialNod','wbHeart','wb-journal','overflow:visible!important','min-height:320px!important','prefers-reduced-motion'])assert.ok(c.includes(x),x);
console.log('Cumulative waterbear source invariants PASS (not browser qualification)');
