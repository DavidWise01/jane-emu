/* AV-201: read-only adapter for original AV-201 loss ROM.
 * Reads real JSNES RAM $0005 (0 title, 1 playing, 2 defeat) and completed
 * controller trials; never writes RAM, synthesizes START or changes owner.
 */
(function(){'use strict';
 let faultIsolator=null,armed=false,bootRoot=null,gameRom=null,gate=null,seen=new Set(),observations=[],lastMode=null,defeatCount=0,rotationIds=new Set(),recoveryIds=new Set(),cycles=[],frameLast=-1,stalls=0,lastPlaying=-1;
 const context=()=>window.JANE_RUN_CONTEXT?.();
 function reset(){gate=window.JaneAV200?.create?.()||null;seen.clear();observations=[];bootRoot=null;gameRom=null;lastMode=null;defeatCount=0;rotationIds.clear();recoveryIds.clear();cycles=[];frameLast=-1;stalls=0;lastPlaying=-1;}
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
  const previousMode=lastMode;
  if(mode===2&&previousMode===1)defeatCount++;
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
  // AV-203: request only the existing controller's START scheduler.
  // Initial title needs no defeat; later recovery requires a recorded
  // AV-202 cartridge-specific owner transfer.
  let recoveryId=null,defeatId=null;
  if(mode===0)recoveryId='av203-boot-'+bootRoot;
  if(mode===2&&defeatCount>0){
    defeatId='av201-loss-'+bootRoot+'-'+defeatCount;
    if(rotationIds.has(defeatId))
      recoveryId='av203-recover-'+defeatId;
  }
  if(recoveryId&&!recoveryIds.has(recoveryId)){
    const live=context();
    const result=window.JANE_AV203_QUEUE_RECOVERY?.({
      source:'av201-cartridge-observed',root:live?.root,rom:live?.rom,
      actor:live?.actor,mode,frame,evidenceId:recoveryId,defeatId});
    if(result?.ok){
      recoveryIds.add(recoveryId);
      record({kind:'AV203_START_QUEUED',frame,mode,evidenceId:recoveryId,
        actor:live.actor,root:live.root,rom:live.rom,defeatId});
    }
  }
  if(frameLast>=0&&frame===frameLast)stalls++;
  if(frameLast>=0&&frame<frameLast){armed=false;return;}
  frameLast=frame;
  // A cycle becomes a fact only after live PLAYING resumes for 60 frames,
  // following a distinct ROM-observed loss and successful owner transfer.
  if(mode===2&&defeatCount>0&&!cycles.some(x=>x.defeatCount===defeatCount))
    cycles.push({defeatCount,defeatFrame:frame,defeatId:'av201-loss-'+bootRoot+'-'+defeatCount,
      ownerAtDefeat:c.actor,transfer:null,restart:null,resumed:null});
  const currentCycle=cycles.at(-1);
  if(currentCycle&&currentCycle.transfer===null){
    const transfer=observations.find(x=>x.kind==='AV202_REAL_DEFEAT_HANDOFF'&&
      x.evidenceId===currentCycle.defeatId);
    if(transfer)currentCycle.transfer={frame:transfer.frame,from:transfer.from,to:transfer.to};
  }
  if(mode===1){
    if(previousMode===2&&currentCycle&&currentCycle.transfer)
      currentCycle.restart={frame,actor:c.actor};
    if(currentCycle?.restart&&!currentCycle.resumed&&frame>=currentCycle.restart.frame+60){
      const completed=(f.JANE_PERCEPTION?.diagnostics?.()?.recentTrials||[])
        .some(t=>String(t.button).toUpperCase()==='START'&&
          Number.isSafeInteger(t.endFrame)&&
          t.endFrame>currentCycle.defeatFrame&&t.endFrame<=frame);
      if(completed){
      currentCycle.resumed={frame,actor:c.actor};
      record({kind:'AV203_RESUMED_FRAMES',frame,defeatId:currentCycle.defeatId,actor:c.actor,
        delta:frame-currentCycle.restart.frame});
      }
    }
    lastPlaying=frame;
  }
  // AV-213 samples only the already-running NES and its existing receipts.
  // Never infer a passing game from these fault-candidate classifications.
  faultIsolator??=window.JaneAV213?.create?.()||null;
  faultIsolator?.ingest?.({root:c.root,rom:c.rom,actor:c.actor,frame,mode,
    nowMs:performance.now(),
    startPolicy:window.JANE_AV205_START_STATUS?.()||null,
    gameplay:window.JANE_AV208_GAMEPLAY_STATUS?.()||null,
    monitor:{observations:observations.slice()}});
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
     cycles:cycles.map(x=>({...x})),completedCycles:cycles.filter(x=>x.transfer&&x.restart&&x.resumed).length,
     recoveryRequests:recoveryIds.size,clockStalls:stalls,
     av213Faults:faultIsolator?.snapshot?.()||null,
     note:'Actual NES RAM mode on purpose-built homebrew ROM; not a commercial cartridge proof.'}),
   stop:()=>{clearInterval(timer);armed=false;}
 };
})();
