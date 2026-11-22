/* AV-177 — motion-aware scene segmentation. Read-only telemetry; never touches NES input.
   Consumes existing AV-097 trace packets: regional pixel delta, frame and hash. */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.JaneAV177=api;
  if(typeof document!=='undefined'){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>api.mount(),{once:true});
    else api.mount();
  }
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const SCHEMA='jane.av177.motion-scenes.v1';
  function create(options={}){
    const windowSize=Number.isInteger(options.windowSize)?Math.max(4,Math.min(options.windowSize,24)):8;
    const sustain=Number.isInteger(options.sustain)?Math.max(2,options.sustain):3;
    let root=null,rom=null,lastFrame=-1,window=[],candidate=null,streak=0,emitted=null,history=[],latest=null;
    function clear(nextRoot,nextRom){root=nextRoot;rom=nextRom;lastFrame=-1;window=[];candidate=null;streak=0;emitted=null;latest=null;}
    function valid(p){return p&&Number.isSafeInteger(p.frame)&&p.frame>=0&&
      Number.isFinite(p.delta)&&p.delta>=0&&p.delta<=1&&Array.isArray(p.regions)&&p.regions.length===24&&
      p.regions.every(r=>r&&Number.isInteger(r.id)&&r.id>=0&&r.id<24&&Number.isFinite(r.delta)&&r.delta>=0&&r.delta<=1)&&
      new Set(p.regions.map(r=>r.id)).size===24;}
    function signature(rows){
      const mean=rows.reduce((a,r)=>a+r.delta,0)/rows.length;
      const activity=mean<.006?'still':mean<.035?'subtle':mean<.18?'moving':'high-motion';
      const totals=Array(24).fill(0);
      for(const r of rows)for(const c of r.regions)totals[c.id]+=c.delta;
      const ranked=totals.map((value,id)=>({value,id})).sort((a,b)=>b.value-a.value||a.id-b.id);
      const peak=ranked[0];
      const region=peak.value/rows.length<.008?'none':peak.id<12?'upper':'lower';
      // A coarse, deliberately non-semantic state: animated frames need not have equal hashes.
      return {key:activity+'/'+region,activity,region,meanMotion:mean,hotRegion:peak.id};
    }
    function observe(p,ctx={}){
      const nextRoot=typeof ctx.root==='string'?ctx.root:null,nextRom=typeof ctx.rom==='string'?ctx.rom:null;
      if(!nextRoot||!nextRom||nextRom==='unloaded'||!valid(p))return null;
      if(nextRoot!==root||nextRom!==rom||p.frame<lastFrame)clear(nextRoot,nextRom);
      if(p.frame<=lastFrame)return null;
      lastFrame=p.frame;
      window.push({frame:p.frame,delta:p.delta,regions:p.regions.map(r=>({id:r.id,delta:r.delta}))});
      if(window.length>windowSize)window.shift();
      if(window.length<windowSize)return null;
      const s=signature(window);latest={...s,frame:p.frame,root,rom};
      if(s.key===candidate)streak++;else{candidate=s.key;streak=1;}
      if(streak<sustain||candidate===emitted)return null;
      const event=Object.freeze({schema:SCHEMA,type:'motion_scene_candidate',root,rom,frame:p.frame,
        signature:candidate,priorSignature:emitted,activity:s.activity,region:s.region,
        meanMotion:Number(s.meanMotion.toFixed(6)),samples:windowSize,sustained:sustain,
        confidence:'candidate-only',semantic:'UNKNOWN',verifiedGameplay:false});
      emitted=candidate;history.push(event);if(history.length>500)history.shift();
      return event;
    }
    function snapshot(){return {schema:SCHEMA,root,rom,latest:latest?{...latest}:null,events:history.slice(),windowLength:window.length};}
    function exportJSON(){return JSON.stringify({...snapshot(),exportedAt:new Date().toISOString(),
      warning:'Motion segmentation is not proof of title, gameplay, death or recovery.'},null,2);}
    return {observe,snapshot,exportJSON};
  }
  function mount(){
    if(document.getElementById('av177'))return;
    const parent=document.getElementById('av175')||document.querySelector('.instrument-panel');
    if(!parent)return;
    const detector=create(),panel=document.createElement('details');
    panel.id='av177';panel.style.cssText='margin:8px 0;padding:10px;border:1px solid #fb842e;border-radius:8px;background:#171327;color:#f3e9ff;font:12px system-ui;';
    const summary=document.createElement('summary');summary.textContent='AV-177 · MOTION-AWARE SCENES';summary.style.cssText='cursor:pointer;font-weight:800;color:#ffb067';panel.append(summary);
    const description=document.createElement('p');
    description.textContent='Live read-only 24-region motion pattern. Works with animated screens; still/subtle/moving is not a gameplay label. Enable Screen Trace.';
    panel.append(description);
    const status=document.createElement('pre');status.style.cssText='white-space:pre-wrap;word-break:break-word';panel.append(status);
    const button=document.createElement('button');button.type='button';button.textContent='Export AV-177 motion events';
    button.addEventListener('click',()=>{const blob=new Blob([detector.exportJSON()],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='jane-av177-motion-scenes.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)});
    panel.append(button);parent.append(panel);
    function render(){const s=detector.snapshot(),last=s.events.at(-1);
      status.textContent='Motion: '+(s.latest?.activity||'WAIT')+' | region: '+(s.latest?.region||'—')+
        '\nFrame: '+(s.latest?.frame??'—')+' | window: '+s.windowLength+
        '\nScene: '+(s.latest?.key||'UNKNOWN')+' | transitions: '+s.events.length+
        '\nLatest: '+(last?.signature||'none')+' | SEMANTIC: UNKNOWN';}
    window.addEventListener('jane-screen-trace',ev=>{
      const ctx=window.JANE_RUN_CONTEXT?.()||{};
      detector.observe(ev.detail,{root:ctx.root,rom:ctx.rom});
      render();
    });render();
    window.JANE_AV177_DETECTOR=detector;
  }
  return {SCHEMA,create,mount};
});
