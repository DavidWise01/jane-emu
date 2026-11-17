/* Z184: deterministic evidence-branch stability test. Z is a model parameter, not nuclear atomic number. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.Z184=api})(typeof window==='undefined'?globalThis:window,function(){
'use strict';const Z=184;const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function test(ERSE){const rows=[],add=(name,pass,detail)=>rows.push({name,pass:!!pass,detail});let disk=[];const store={read:()=>JSON.parse(JSON.stringify(disk)),write:v=>{disk=JSON.parse(JSON.stringify(v))}};let t=0;const c=ERSE.create({store,now:()=>++t});
for(let i=1;i<=208;i++)c.checkpoint('state:'+i,{frame:i,action:'NONE',generation:0});
const old=c.pull('state:184','OTF');add('Cold pull Z=184',old.hit&&old.tier==='lead'&&old.record.payload.frame===184,old.tier);
const before=JSON.stringify(disk);if(!old.hit)return {z:Z,rows,stable:false};
const source=old.record;const scenario={...source.payload,action:'LEFT',generation:1,parent:source.seq};const branch=c.checkpoint('branch:184',scenario);add('Branch appended with parent reference',branch.ok&&branch.record.payload.parent===source.seq,'Separate key');
add('Original remains unchanged',equal(c.pull('state:184','JIT').record,source),'No in-place mutation');
const reloaded=ERSE.create({store});add('Reload retrieves original and branch',equal(reloaded.pull('state:184').record,source)&&equal(reloaded.pull('branch:184').record,branch.record),'Persistent round trip');
const readOnly=reloaded.pull('state:184');readOnly.record.payload.action='RIGHT';add('Returned copy cannot alter stored source',equal(reloaded.pull('state:184').record,source),'Detached payload');
add('Capacity remains bounded',c.status().lead===208&&c.status().argon<=17,'17 / 208');
const persisted=JSON.stringify(disk);const reject=ERSE.create({store:{read:store.read,write(){throw Error('injected write fault')}}});const result=reject.checkpoint('fault',{frame:184});add('Write fault preserves prior archive',!result.ok&&persisted===JSON.stringify(disk)&&!reject.pull('fault').hit,'No partial commit');
let count=0;for(let k=0;k<184;k++){const r=reloaded.pull('state:184',k%2?'JIT':'OTF');if(r.hit&&equal(r.record,source))count++}add('184 recurring pulls preserve identity',count===184,count+' / 184');
return {z:Z,rows,stable:rows.every(r=>r.pass),scope:'synthetic evidence only; no NES state restoration',initial_records:JSON.parse(before).length}}
return {test,Z};
});