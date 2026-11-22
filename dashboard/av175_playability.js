/* AV-175 · Browser gameplay evidence recorder.
   Read-only: never controls the emulator, stores ROM bytes or asserts gameplay pass.
   One game. One active player. Two observers. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.JaneAV175=api;
  if(typeof document!=='undefined'&&document.addEventListener) {
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>api.mount(),{once:true});
    else api.mount();
  }
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const SCHEMA='jane.av175.playability.v1',MAX=2000;
  function makeRecorder(clock){
    const now=typeof clock==='function'?clock:()=>new Date().toISOString();
    let history=[],seq=0,prev=null,bootCount=0;
    const normalize=(x)=>{
      x=x||{};
      return {
        root:typeof x.root==='string'?x.root.slice(0,128):null,
        actor:typeof x.actor==='string'?x.actor.slice(0,32):null,
        rom:typeof x.rom==='string'?x.rom.slice(0,128):null,
        frame:Number.isSafeInteger(x.frame)&&x.frame>=0?x.frame:null,
        running:x.running===true
      };
    };
    function append(kind,details={},state=prev){
      if(!/^[a-z][a-z0-9_-]{0,39}$/.test(kind))throw Error('Invalid evidence event');
      const row={seq:++seq,at:now(),kind,root:state?.root||null,actor:state?.actor||null,
        rom:state?.rom||null,frame:state?.frame??null,details:{...details}};
      history.push(row);if(history.length>MAX)history.shift();
      return Object.freeze(row);
    }
    function observe(value){
      const s=normalize(value),had=prev,loaded=s.rom&&s.rom!=='unloaded';
      if(!had){
        append('recorder_attached',{note:'Monitoring began; earlier gameplay not evidenced'},s);
      } else {
        if(s.root&&s.root!==had.root)append('session_changed',{previousRoot:had.root},s);
        if(s.rom!==had.rom)append('cartridge_changed',{previousRom:had.rom},s);
        if(s.actor&&s.actor!==had.actor)append('handoff_observed',{previousActor:had.actor},s);
        if(s.frame!==null&&had.frame!==null&&s.frame<had.frame)append('frame_reset_observed',{previousFrame:had.frame},s);
        if(loaded&&s.frame!==null&&had.frame!==null&&s.frame>had.frame&&s.rom===had.rom){
          bootCount++;
          if(bootCount===1)append('frames_advancing',{from:had.frame,to:s.frame,delta:s.frame-had.frame},s);
        }
      }
      if(!loaded||s.frame===null)bootCount=0;
      prev=s;return snapshot();
    }
    function annotate(kind,note){
      const allowed=['rom_screen_seen','start_sent','gameplay_seen','game_over_seen','recovery_seen','failure','other'];
      if(!allowed.includes(kind))throw Error('Unknown annotation type');
      return append('operator_'+kind,{note:String(note||'').slice(0,500),reportedBy:'manual browser operator; not independently confirmed'});
    }
    function snapshot(){
      return {schema:SCHEMA,count:history.length,seq,latest:prev?{...prev}:null,
        frameProgressSeen:bootCount>0,events:history.slice()};
    }
    function exportJSON(){return JSON.stringify({...snapshot(),exportedAt:now(),
      caution:'Manual annotations are claims; browser gameplay not independently verified by the recorder.'},null,2)}
    return {observe,annotate,snapshot,exportJSON};
  }
  function mount(){
    if(document.getElementById('av175'))return;
    const panel=document.querySelector('.instrument-panel')||document.querySelector('main')||document.body;
    if(!panel)return;
    const recorder=makeRecorder();
    const details=document.createElement('details');details.id='av175';details.className='av175-evidence';
    details.style.cssText='margin:10px 0;padding:10px;border:1px solid #a864ee;border-radius:8px;background:#160e22;color:#f7eaff;font:12px system-ui;max-width:100%;overflow-wrap:anywhere';
    const summary=document.createElement('summary');summary.style.cssText='cursor:pointer;font-weight:800;color:#ff9b35';summary.textContent='AV-175 · PLAYABILITY EVIDENCE (read-only)';
    details.appendChild(summary);
    const hint=document.createElement('p');hint.textContent='Observe frames, mark actual browser transitions, export append-only JSON. No ROM bytes collected; marks do not prove gameplay.';
    details.appendChild(hint);
    const status=document.createElement('pre');status.id='av175Status';status.style.cssText='white-space:pre-wrap;word-break:break-word';status.textContent='Waiting for emulator observations';
    details.appendChild(status);
    const labels=[['rom_screen_seen','ROM screen visible'],['start_sent','START pressed'],['gameplay_seen','Gameplay visible'],['game_over_seen','Game over visible'],['recovery_seen','Recovery visible'],['failure','Report failure']];
    const controls=document.createElement('div');controls.style.cssText='display:flex;flex-wrap:wrap;gap:5px';
    labels.forEach(([kind,label])=>{
      const button=document.createElement('button');button.type='button';button.textContent=label;button.dataset.av175=kind;
      button.addEventListener('click',()=>{recorder.annotate(kind,'Operator clicked '+label);render()});
      controls.appendChild(button);
    });
    details.appendChild(controls);
    const exportButton=document.createElement('button');exportButton.type='button';exportButton.textContent='Export AV-175 JSON';
    exportButton.style.marginTop='8px';
    exportButton.addEventListener('click',()=>{
      const blob=new Blob([recorder.exportJSON()],{type:'application/json'});
      const url=URL.createObjectURL(blob),a=document.createElement('a');
      a.href=url;a.download='jane-av175-playability-evidence.json';a.click();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
    });
    details.appendChild(exportButton);
    panel.insertBefore(details,panel.firstChild);
    function observe(){
      let ctx=null,perception=null;
      try{ctx=window.JANE_RUN_CONTEXT?.()||null}catch(_){}
      try{perception=document.getElementById('game')?.contentWindow?.JANE_PERCEPTION?.status?.()||null}catch(_){}
      const frame=Number(perception?.frame??ctx?.frame);
      const state={root:ctx?.root,actor:ctx?.actor,rom:ctx?.rom,
        frame:Number.isSafeInteger(frame)&&frame>=0?frame:null,running:perception?.running===true};
      recorder.observe(state);
      render();
    }
    function render(){
      const s=recorder.snapshot();
      status.textContent='Actor: '+(s.latest?.actor||'—')+' | ROM root: '+(s.latest?.rom||'unloaded')+
        '\nFrame: '+(s.latest?.frame??'unknown')+' | recorded events: '+s.count+
        '\nFrame advancement: '+(s.frameProgressSeen?'OBSERVED':'NOT OBSERVED')+
        '\nLatest: '+(s.events.at(-1)?.kind||'—');
    }
    observe();setInterval(observe,900);
    window.JANE_AV175_RECORDER=recorder;
  }
  return {makeRecorder,mount,SCHEMA};
});
