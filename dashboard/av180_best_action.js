/* AV-180 deterministic, one-way best-eligible-action arbitration.
 * No votes, no new NES input owner. Disabled unless operator opts in.
 * Public choose() is pure; the existing chooseAction() remains sole controller.
 */
(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.JaneAV180=api;
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>api.mount(),{once:true});else api.mount();}
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';const SCHEMA='jane.av180.best-action.v1';
const ORDER=['START','UP','DOWN','LEFT','RIGHT','A','B','SELECT'];
const RANK=Object.fromEntries(ORDER.map((b,i)=>[b,i]));
function choose(candidates,context={}){
 const actor=context.actor,rom=context.rom,state=context.state;
 if(!rom||rom==='unloaded'||!['JANE','TOPH','PATRICIA'].includes(actor))
  return {action:null,reason:'no-active-owner',eligible:0};
 if(state==='STALLED'||state==='GAME_OVER'||state==='UNLOADED')
  return {action:null,reason:'unsafe-state',eligible:0};
 const valid=(Array.isArray(candidates)?candidates:[]).filter(x=>
  x&&typeof x.action==='string'&&Object.hasOwn(RANK,x.action)&&
  Number.isFinite(x.priority)&&x.priority>=0&&x.priority<=100&&
  x.eligible===true&&x.owner===actor&&x.rom===rom&&
  (x.action!=='START'||state==='MENU'));
 valid.sort((a,b)=>b.priority-a.priority||RANK[a.action]-RANK[b.action]||
   String(a.source||'').localeCompare(String(b.source||''),'en'));
 return valid.length?
   {action:valid[0].action,reason:'highest-priority-eligible',eligible:valid.length,
    source:String(valid[0].source||'unspecified').slice(0,60),priority:valid[0].priority}:
   {action:null,reason:'no-eligible-action',eligible:0};
}
function makeBridge(){
 let enabled=false,last=null,history=[],identity=null;
 function setEnabled(v){enabled=v===true;return enabled;}
 function decide(candidates,ctx={}){
  const current=String(ctx.root||'')+'|'+String(ctx.rom||'')+'|'+String(ctx.actor||'');
  if(identity!==current){identity=current;last=null;}
  const result=enabled?choose(candidates,ctx):{action:null,reason:'disabled',eligible:0};
  last={...result,root:ctx.root||null,rom:ctx.rom||null,actor:ctx.actor||null,frame:ctx.frame??null,enabled};
  // Record bounded, append-only decision observations; no automatic input dispatch here.
  history.push(last);if(history.length>400)history.shift();
  return result;
 }
 return {setEnabled,decide,status:()=>({schema:SCHEMA,enabled,last,history:history.slice()}),
   exportJSON:()=>JSON.stringify({schema:SCHEMA,enabled,history},null,2)};
}
function mount(){
 if(document.getElementById('av180'))return;
 const host=document.querySelector('.instrument-panel')||document.querySelector('main');if(!host)return;
 const bridge=makeBridge(),panel=document.createElement('details');panel.id='av180';
 panel.style.cssText='margin:8px 0;padding:10px;border:1px solid #c86dff;border-radius:8px;background:#1b1228;color:#faf0ff;font:12px system-ui';
 const heading=document.createElement('summary');heading.textContent='AV-180 · SINGLE BEST ELIGIBLE ACTION';heading.style.cssText='cursor:pointer;font-weight:800;color:#ff9c54';panel.append(heading);
 const label=document.createElement('label'),toggle=document.createElement('input');toggle.type='checkbox';toggle.checked=false;toggle.addEventListener('change',()=>bridge.setEnabled(toggle.checked));
 label.append(toggle,document.createTextNode(' Enable deterministic arbitration (off by default)'));panel.append(label);
 const note=document.createElement('p');note.textContent='Ranks the existing coaching recommendation; no second controller, no additional inputs. Invalid/unsafe actions abstain. Original NES action selection remains available.';panel.append(note);
 const status=document.createElement('pre');status.style.cssText='white-space:pre-wrap;word-break:break-word';panel.append(status);
 const button=document.createElement('button');button.textContent='Export AV-180 decisions';button.type='button';
 button.addEventListener('click',()=>{const u=URL.createObjectURL(new Blob([bridge.exportJSON()],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download='jane-av180-decisions.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)});panel.append(button);
 host.insertBefore(panel,host.firstChild);
 function render(){const s=bridge.status(),x=s.last;status.textContent='MODE: '+(s.enabled?'ACTIVE':'OFF')+'\nDECISION: '+(x?.action||'ABSTAIN')+' · '+(x?.reason||'no observation')+'\nENTRIES: '+s.history.length+' · INPUT OWNER: NES chooseAction()';}
 setInterval(render,900);render();
 window.JANE_AV180_BRIDGE=bridge;
}
return {SCHEMA,ORDER,choose,makeBridge,mount};
});
