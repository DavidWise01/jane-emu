/* AV-200 — observed defeat/restart gate; one live NES, no input injection.
 * A manual loss label, handoff, or mere frame motion cannot prove game over.
 * Call observe with trusted cartridge-specific state observations from the
 * running emulator; action records must come from the same actual run.
 */
(function(root,factory){'use strict';
 const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.JaneAV200=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){'use strict';
 const SCHEMA='jane.av200.defeat-restart-gate.v1';
 const norm=x=>typeof x==='string'?x.trim().toUpperCase():'';
 function create(){
  let session=null,events=[],defeat=null,start=null,resumed=null,completed=[];
  const copy=x=>JSON.parse(JSON.stringify(x));
  function reset(x){session={root:x.root,rom:x.rom,actor:x.actor,frame:x.frame};events=[];defeat=null;start=null;resumed=null;completed=[];}
  function observe(x={}){
   if(!x||!x.root||!x.rom||x.rom==='unloaded'||!Number.isSafeInteger(x.frame)||x.frame<0)return snapshot();
   if(!session||session.root!==x.root||session.rom!==x.rom||x.frame<session.frame)reset(x);
   if(x.frame<session.frame)return snapshot();
   session.frame=x.frame;session.actor=x.actor;
   // Only a cartridge-specific observed state can begin recovery.
   // Human labels, guessed screen hashes and manual transfer are excluded.
   const observedDefeat=x.defeat?.source==='cartridge-observed' &&
     x.defeat?.verified===true && x.defeat?.gameOver===true &&
     x.defeat?.rom===session.rom && x.defeat?.root===session.root &&
     x.defeat?.frame===x.frame;
   const nextEpisode=observedDefeat&&(
     !defeat||(resumed&&x.frame>resumed.frame&&x.defeat.evidenceId&&
       x.defeat.evidenceId!==defeat.evidenceId));
   if(nextEpisode){
    // A new defeat opens only after the previous episode fully recovered.
    // Preserve the old certificate; never let stale START prove this episode.
    if(resumed)completed.push({defeat:{...defeat},start:{...start},resumed:{...resumed}});
    defeat={frame:x.frame,actor:x.actor,evidenceId:x.defeat.evidenceId||null};
    start=null;resumed=null;
    events.push({kind:'DEFEAT_OBSERVED',...defeat});
   }
   // START must have been completed on the real controller, after defeat.
   const a=x.action;
   if(defeat&&!start&&a?.source==='nes-completed-action'&&
      norm(a.button)==='START'&&a.root===session.root&&a.rom===session.rom&&
      Number.isSafeInteger(a.endFrame)&&a.endFrame>defeat.frame&&a.endFrame<=x.frame){
    start={frame:a.endFrame,actor:x.actor,id:a.id||null};
    events.push({kind:'START_COMPLETED',...start});
   }
   // Restart additionally needs an independently observed playing state.
   const observedPlaying=x.playing?.source==='cartridge-observed'&&
     x.playing?.verified===true&&x.playing?.playing===true&&
     x.playing?.root===session.root&&x.playing?.rom===session.rom&&
     x.playing?.frame===x.frame;
   if(start&&!resumed&&observedPlaying&&x.frame>=start.frame+60){
    resumed={frame:x.frame,actor:x.actor};
    events.push({kind:'PLAY_RESUMED',...resumed});
   }
   return snapshot();
  }
  function snapshot(){return copy({schema:SCHEMA,session,defeat,start,resumed,
    events,completed,completedCount:completed.length+(defeat&&start&&resumed?1:0),
    verifiedRecovery:!!(defeat&&start&&resumed),
    manualHandoffCountsAsDefeat:false,phase5FrozenPercent:50,
    note:'Only cartridge-specific observed defeat, completed START and 60 advancing post-START frames can pass.'});}
  return {observe,snapshot};
 }
 return {SCHEMA,create};
});
