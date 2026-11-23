/* AV-201: read-only adapter for original AV-201 loss ROM.
 * Reads real JSNES RAM $0005 (0 title, 1 playing, 2 defeat) and completed
 * controller trials; never writes RAM, synthesizes START or changes owner.
 */
(function(){'use strict';
 let armed=false,bootRoot=null,gameRom=null,gate=null,seen=new Set(),observations=[],lastMode=null,defeatCount=0,rotationIds=new Set();
 const context=()=>window.JANE_RUN_CONTEXT?.();
 function reset(){gate=window.JaneAV200?.create?.()||null;seen.clear();observations=[];bootRoot=null;gameRom=null;lastMode=null;defeatCount=0;rotationIds.clear();}
 function record(row){observations.push(row);if(observations.length>256)observations.shift();}
 document.addEventListener('click',e=>{
   if(e.target?.closest?.('#av201-demo')){armed=true;reset();}
 },true);
 function tick(){
  if(!armed||!gate)return;
  const c=context();if(!c?.root||!c?.rom||c.rom==='unloaded')return;
  const f=document.getElementById('game')?.contentWindow;
  const st=f?.JANE_PERCEPTION?.status?.();
  if(!Number.isSafeInteger(st?.frame)||!f?.JANE_ARENA_RAM?.read)return;
  if(!bootRoot){bootRoot=c.root;gameRom=c.rom;}
  if(c.root!==bootRoot||c.rom!==gameRom){armed=false;return;}
  const mode=f.JANE_ARENA_RAM.read(5),frame=st.frame;
  if(![0,1,2].includes(mode))return;
  if(mode===2&&lastMode===1)defeatCount++;
  lastMode=mode;
  // The game-over transition comes from the actual ROM. The host's
  // authoritative handoff gate independently re-reads NES RAM before acting.
  if(mode===2&&defeatCount>0){
    const evidenceId='av201-loss-'+bootRoot+'-'+defeatCount;
    if(!rotationIds.has(evidenceId)){
      const result=window.JANE_AV202_DEFEAT_HANDOFF?.({
        source:'av201-cartridge-observed',root:c.root,rom:c.rom,
        actor:c.actor,frame,evidenceId});
      if(result?.ok){rotationIds.add(evidenceId);
        record({kind:'AV202_REAL_DEFEAT_HANDOFF',evidenceId,frame,
          from:c.actor,to:window.JANE_RUN_CONTEXT?.()?.actor,root:c.root,rom:c.rom});}
    }
  }
  const x={root:c.root,rom:c.rom,actor:c.actor,frame};
  if(mode===2)x.defeat={source:'cartridge-observed',verified:true,gameOver:true,
    root:c.root,rom:c.rom,frame,evidenceId:'av201-ram-0005-'+frame};
  if(mode===1)x.playing={source:'cartridge-observed',verified:true,playing:true,
    root:c.root,rom:c.rom,frame};
  const trials=f.JANE_PERCEPTION?.diagnostics?.()?.recentTrials||[];
  // Only a completed real NES START action, not an offered action.
  const starts=trials.filter(t=>String(t.button).toUpperCase()==='START'&&
    Number.isSafeInteger(t.endFrame)&&t.endFrame<=frame).sort((a,b)=>b.endFrame-a.endFrame);
  if(starts.length){const t=starts[0];x.action={source:'nes-completed-action',
    root:c.root,rom:c.rom,button:'START',id:t.id,endFrame:t.endFrame};}
  const prior=gate.snapshot();
  const now=gate.observe(x);
  const tag=mode+'|'+frame+'|'+(now.defeat?.frame??'-')+'|'+(now.start?.frame??'-')+'|'+(now.resumed?.frame??'-');
  if(now.events.length>prior.events.length&&!seen.has(tag)){
    seen.add(tag);record({frame,mode,root:c.root,rom:c.rom,
      event:now.events.at(-1),controllerRecord:x.action||null});}
 }
 const timer=setInterval(tick,60);
 window.JANE_AV201_MONITOR={
   snapshot:()=>({schema:'jane.av201.live-cartridge-observation.v1',
     armed,root:bootRoot,rom:gameRom,
     gate:gate?.snapshot()||null,observations:observations.slice(),
     note:'Actual NES RAM mode on purpose-built homebrew ROM; not a commercial cartridge proof.'}),
   stop:()=>{clearInterval(timer);armed=false;}
 };
})();
