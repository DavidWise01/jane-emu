/* AV-207: actual NES-cartridge sprite mechanics in the ONE existing controller.
 * Never injects keys or writes emulator RAM. RAM observations (x, palette, mode)
 * determine each next gameplay action. All other ROMs use existing strategies.
 */
(function(root,factory){'use strict';
 const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.JaneAV207=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){'use strict';
 const SCHEMA='jane.av207.ram-closed-loop-movement-colors.v1';
 const ACTIONS=['RIGHT','A','LEFT','B'];
 const bound=n=>Number.isSafeInteger(n)&&n>=0&&n<=255;
 function create(){
  let identity=null,phase=0,completedLaps=0,offers=[],lastFrame=-1;
  const identityOf=x=>[x.root,x.rom,x.actor].join('|');
  function offer(x={}){
   if(!x.root||!x.rom||!x.actor||!Number.isSafeInteger(x.frame)||
      x.frame<0||x.mode!==1||!bound(x.x)||!bound(x.palette)||
      !Array.isArray(x.actions))return null;
   const key=identityOf(x);
   if(identity!==key||x.frame<lastFrame){
    identity=key;phase=0;completedLaps=0;offers=[];lastFrame=-1;
   }
   lastFrame=x.frame;
   // Forward progress only on *observed* NES state changes.
   // RIGHT to 136, A => $16, LEFT to 104, B => $2A, then repeat.
   for(let step=0;step<4;step++){
    const reached=[x.x>=136,x.palette===0x16,x.x<=104,x.palette===0x2A][phase];
    if(!reached)break;
    phase=(phase+1)%4;
    if(phase===0)completedLaps++;
   }
   const button=ACTIONS[phase];
   if(!x.actions.includes(button))return null;
   if(offers.length>=96)offers.shift();
   offers.push({frame:x.frame,button,phase,x:x.x,palette:x.palette});
   return button;
  }
  function snapshot(){return {schema:SCHEMA,identity,phase,goal:ACTIONS[phase],
    completedLaps,offers:offers.map(x=>({...x})),
    note:'Offers depend on measured homebrew NES RAM, not on inferred wins.'};}
  return {offer,snapshot};
 }
 return {SCHEMA,ACTIONS,create};
});
