#![deny(unsafe_op_in_unsafe_fn)]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[repr(u32)]
pub enum Kind { Unknown=0, Unresolved=1, Controlled=2, Approaching=3, Near=4, Moving=5, Stationary=6 }
#[no_mangle]
pub extern "C" fn recognize(known:u32, controlled:u32, motion:u32, proximity:u32)->u32 {
    (if known==0 {Kind::Unresolved} else if controlled!=0 {Kind::Controlled} else {
        match (proximity,motion) {(1,_)=>Kind::Approaching,(2,_)=>Kind::Near,(_,1)=>Kind::Moving,(_,2)=>Kind::Stationary,_=>Kind::Unknown}
    }) as u32
}
#[no_mangle]
pub extern "C" fn position_match(x:i32,y:i32,px:i32,py:i32)->u32 {
    u32::from(x.abs_diff(px)<=5 && y.abs_diff(py)<=2)
}
#[no_mangle]
pub extern "C" fn motion_hits(hits:u32,same:u32,dx:i32,dp:i32)->u32 {
    if same==0 {0} else if dx!=0 && dp!=0 && dx.signum()!=dp.signum(){0}
    else if dx!=0 && dp!=0 && dx.abs_diff(dp)<=8 {hits.saturating_add(1)} else {hits}
}
#[no_mangle]
pub extern "C" fn fresh(now:u32,frame:u32)->u32 {u32::from(frame<=now && now-frame<=5)}
#[cfg(test)]
mod tests {
use super::*;
#[test] fn classification(){for (k,c,m,p,w) in [(0,0,1,1,1),(1,1,1,1,2),(1,0,1,1,3),(1,0,1,2,4),(1,0,1,0,5),(1,0,2,0,6),(1,0,0,0,0)] {assert_eq!(recognize(k,c,m,p),w);}}
#[test] fn positions(){assert_eq!(position_match(128,108,123,110),1);assert_eq!(position_match(128,108,122,110),0);assert_eq!(position_match(128,108,128,111),0);}
#[test] fn continuity(){assert_eq!(motion_hits(0,1,5,5),1);assert_eq!(motion_hits(1,1,5,5),2);assert_eq!(motion_hits(2,1,-5,5),0);assert_eq!(motion_hits(2,0,5,5),0);assert_eq!(motion_hits(2,1,0,0),2);}
#[test] fn freshness(){assert_eq!(fresh(20,15),1);assert_eq!(fresh(20,14),0);assert_eq!(fresh(20,21),0);}
}

 // Bounded, integer, horizontal projection. 0=hold, 1=left, 2=right.
 // Packed result: low two bits action; remaining bits predicted squared-distance gain.
 // Observational only; no controller side effects.
 #[no_mangle]
 pub extern "C" fn defend(px:i32,py:i32,ox:i32,oy:i32,vx:i32,vy:i32,step:i32)->u32 {
     if ![px,py,ox,oy].iter().all(|v|(0..=255).contains(v)) || !(-16..=16).contains(&vx) || !(-16..=16).contains(&vy) || !(1..=8).contains(&step) {return 0}
     let dist=|x:i32,y:i32| {let dx=x-(ox+vx);let dy=y-(oy+vy);dx*dx+dy*dy};
     let baseline=dist(px,py);
     let mut best=baseline;let mut action=0;
     for (a,x) in [(1,px-step),(2,px+step)] {
         if (0..=255).contains(&x) {let score=dist(x,py);if score>best {best=score;action=a}}
     }
     if best-baseline<16 {return 0}
     ((best-baseline) as u32)<<2 | action
 }
 #[no_mangle]
 pub extern "C" fn separation_gain(px:i32,py:i32,ox:i32,oy:i32,qx:i32,qy:i32,tx:i32,ty:i32)->i32 {
     if ![px,py,ox,oy,qx,qy,tx,ty].iter().all(|v|(0..=255).contains(v)){return i32::MIN}
     let sq=|a:i32,b:i32|a*a+b*b;
     sq(qx-tx,qy-ty)-sq(px-ox,py-oy)
 }
 #[cfg(test)]
 mod defense_tests {
 use super::*;
 #[test] fn directions(){assert_eq!(defend(100,100,120,100,-2,0,4)&3,1);assert_eq!(defend(100,100,80,100,2,0,4)&3,2);}
 #[test] fn bounds(){assert_eq!(defend(0,0,20,0,0,0,4),0);assert_eq!(defend(100,100,120,100,17,0,4),0);assert_eq!(defend(100,100,120,100,0,0,9),0);}
 #[test] fn endpoints(){assert_eq!(separation_gain(100,100,120,100,96,100,118,100),84);assert_eq!(separation_gain(100,100,120,100,104,100,118,100),-204);assert_eq!(separation_gain(-1,0,0,0,0,0,0,0),i32::MIN);}
 }

pub mod memory {
    #[derive(Clone, Debug, PartialEq, Eq)]
    pub struct Receipt { pub actor:u8, pub frame:u32, pub sequence:u32, pub primitive:u8, pub result:i32 }
    #[derive(Clone, Debug, PartialEq, Eq)]
    pub struct Generation { number:u32, receipts:Vec<Receipt> }
    impl Generation {pub fn number(&self)->u32{self.number} pub fn receipts(&self)->&[Receipt]{&self.receipts}}
    #[derive(Default)]
    pub struct Ledger { sealed:Vec<Generation>, open:Vec<Receipt> }
    impl Ledger {
      pub fn append(&mut self,r:Receipt)->bool {
        if r.actor>2 || r.primitive>3 || self.open.len()>=1024 || self.sealed.len()>=64 ||
           self.open.last().is_some_and(|p|r.sequence<=p.sequence || r.frame<p.frame) ||
           self.open.is_empty() && self.sealed.last().and_then(|g|g.receipts.last()).is_some_and(|p|r.sequence<=p.sequence || r.frame<p.frame) {return false}
        self.open.push(r);true
      }
      pub fn seal(&mut self)->bool {
        if self.open.is_empty() || self.sealed.len()>=64{return false}
        self.sealed.push(Generation{number:self.sealed.len() as u32,receipts:std::mem::take(&mut self.open)});true
      }
      pub fn sealed(&self)->&[Generation]{&self.sealed}
      pub fn pending(&self)->usize{self.open.len()}
    }
}
thread_local! {static LEDGER:std::cell::RefCell<memory::Ledger>=std::cell::RefCell::new(memory::Ledger::default());}
#[no_mangle]
pub extern "C" fn memory_append(actor:u32,frame:u32,sequence:u32,primitive:u32,result:i32)->u32 {
 if actor>2||primitive>3{return 0}
 LEDGER.with(|l|u32::from(l.borrow_mut().append(memory::Receipt{actor:actor as u8,frame,sequence,primitive:primitive as u8,result})))
}
#[no_mangle]
pub extern "C" fn memory_seal()->u32 {LEDGER.with(|l|u32::from(l.borrow_mut().seal()))}
#[no_mangle]
pub extern "C" fn memory_generations()->u32 {LEDGER.with(|l|l.borrow().sealed().len() as u32)}
#[no_mangle]
pub extern "C" fn memory_pending()->u32 {LEDGER.with(|l|l.borrow().pending() as u32)}
#[no_mangle]
pub extern "C" fn memory_count(g:u32,actor:u32)->u32 {
 if actor>2{return 0}
 LEDGER.with(|l|l.borrow().sealed().get(g as usize).map_or(0,|s|s.receipts().iter().filter(|r|r.actor as u32==actor).count() as u32))
}
#[cfg(test)]
mod memory_tests {
 use super::memory::*;
 fn r(actor:u8,frame:u32,sequence:u32)->Receipt{Receipt{actor,frame,sequence,primitive:0,result:1}}
 #[test] fn immutable_inheritance(){let mut l=Ledger::default();assert!(l.append(r(0,1,1)));assert!(l.append(r(1,2,2)));assert!(l.seal());let frozen=l.sealed()[0].clone();assert!(!l.append(r(0,2,2)));assert!(!l.append(r(0,1,3)));assert!(l.append(r(2,3,3)));assert!(l.seal());assert_eq!(l.sealed()[0],frozen);assert_eq!(l.sealed()[1].number(),1);assert!(!l.seal());}
 #[test] fn capacity(){let mut l=Ledger::default();for i in 0..1024{assert!(l.append(r(0,i,i)));}assert!(!l.append(r(0,1024,1024)));assert!(l.seal());assert!(!l.append(r(3,1025,1025)));}
}

#[derive(Default)]
struct IdentityState { scope:u32, last:Option<u32>, prior:Option<(u32,u32,u32,i32,i32)>, hits:u32, kind:u32, id:u32 }
impl IdentityState {
 fn update(&mut self,scope:u32,frame:u32,valid:u32,id:u32,tile:u32,attr:u32,x:i32,px:i32)->u32 {
  if scope==0 { *self=Self::default();return 0 }
  if self.scope!=scope||self.last.is_some_and(|f|frame<f){*self=Self{scope,..Self::default()};}
  if self.last==Some(frame){return self.kind}
  self.last=Some(frame);
  if valid!=1||id>63||tile>255||attr>255||!(0..=255).contains(&x)||!(0..=255).contains(&px){self.prior=None;self.hits=0;self.kind=if valid==2{2}else{0};return self.kind}
  self.hits=match self.prior {Some((i,t,a,old_x,old_px)) if (i,t,a)==(id,tile,attr)=>motion_hits(self.hits,1,x-old_x,px-old_px),_=>0};
  self.prior=Some((id,tile,attr,x,px));self.id=id;self.kind=if self.hits>=2{3}else{1};self.kind
 }
}
thread_local!{static IDENTITY:std::cell::RefCell<IdentityState>=std::cell::RefCell::new(IdentityState::default());}
#[no_mangle]
pub extern "C" fn identity_step(scope:u32,frame:u32,valid:u32,id:u32,tile:u32,attr:u32,x:i32,px:i32)->u32{IDENTITY.with(|s|s.borrow_mut().update(scope,frame,valid,id,tile,attr,x,px))}
#[no_mangle]
pub extern "C" fn identity_hits()->u32{IDENTITY.with(|s|s.borrow().hits)}
#[cfg(test)]
mod identity_tests {
 use super::*;
 #[test]fn boundaries(){let mut s=IdentityState::default();assert_eq!(s.update(1,1,1,0,1,0,120,120),1);assert_eq!(s.update(1,2,1,0,1,0,125,125),1);assert_eq!(s.update(1,3,1,0,1,0,130,130),3);assert_eq!(s.update(1,3,1,0,1,0,130,130),3);assert_eq!(s.hits,2);assert_eq!(s.update(1,4,2,0,0,0,0,0),2);assert_eq!(s.update(2,5,1,0,1,0,135,135),1);assert_eq!(s.update(0,0,0,0,0,0,0,0),0);}
}

#[no_mangle]
pub extern "C" fn survival_score(verified:u32,outcome:u32,frames:u32,losses:u32)->i32 {
 if verified!=1 || !(1..=2).contains(&outcome) || frames==0 || frames>3600 || losses>255 {return i32::MIN}
 if outcome==2 || losses>0 {return -10000-(losses as i32)*100}
 frames as i32
}
#[cfg(test)]
mod survival_tests {
 use super::*;
 #[test]fn priority(){for f in 1..=3600 {assert!(survival_score(1,2,f,0)<0);assert!(survival_score(1,1,f,1)<0);assert_eq!(survival_score(1,1,f,0),f as i32);}}
 #[test]fn invalid(){for (v,o,f,l) in [(0,1,60,0),(1,0,60,0),(1,1,0,0),(1,1,3601,0),(1,1,60,256)]{assert_eq!(survival_score(v,o,f,l),i32::MIN);}}
}

 // Action IDs 0=HOLD, 1=LEFT, 2=RIGHT; 3=ABSTAIN.
 // All scores are qualified predictions, not observed survival outcomes.
 #[no_mangle]
 pub extern "C" fn arbitrate(mask:u32, risk_mask:u32, hold:i32,left:i32,right:i32)->u32 {
    if mask&!7!=0 || risk_mask&!7!=0 || mask&1==0 || risk_mask&1!=0 {return 3}
    let scores=[hold,left,right];
    if !(-3600..=3600).contains(&hold) {return 3}
    let mut best=0;
    for i in 1..3 {
      if mask&(1<<i)!=0 && risk_mask&(1<<i)==0 && (-3600..=3600).contains(&scores[i]) && scores[i]>scores[best] {best=i;}
    }
    best as u32
 }
 #[cfg(test)]
 mod arbitration_tests {
 use super::*;
 #[test] fn precedence(){assert_eq!(arbitrate(7,2,0,100,20),2);assert_eq!(arbitrate(7,0,0,20,20),1);assert_eq!(arbitrate(7,0,20,20,20),0);assert_eq!(arbitrate(6,0,0,100,100),3);assert_eq!(arbitrate(7,1,0,100,100),3);assert_eq!(arbitrate(7,0,0,i32::MAX,-1),0);}
 #[test] fn masks(){for m in 0..8 {for r in 0..8 {let a=arbitrate(m,r,0,1,2);if a<3{assert_ne!(m&(1<<a),0);assert_eq!(r&(1<<a),0);}}}}
 }

 // Descriptive separation outcome, never a causal survival reward.
 // 0 unqualified, 1 reduced, 2 unchanged, 3 increased.
 #[no_mangle]
 pub extern "C" fn effect_class(qualified:u32,gain:i32)->u32 {
   if qualified!=1 || !(-130050..=130050).contains(&gain){return 0}
   if gain<0{1}else if gain==0{2}else{3}
 }
 #[cfg(test)]
 mod effect_tests {
 use super::*;
 #[test]fn signs(){assert_eq!(effect_class(0,84),0);assert_eq!(effect_class(1,-204),1);assert_eq!(effect_class(1,0),2);assert_eq!(effect_class(1,84),3);assert_eq!(effect_class(1,i32::MIN),0);}
 }

 // Read-only sealed receipt access. No import or mutation of live ledger.
 #[no_mangle]
 pub extern "C" fn memory_generation_len(g:u32)->u32 {LEDGER.with(|l|l.borrow().sealed().get(g as usize).map_or(0,|s|s.receipts().len() as u32))}
 #[no_mangle]
 pub extern "C" fn memory_receipt_field(g:u32,i:u32,field:u32)->i64 {
 LEDGER.with(|l|{let l=l.borrow();let Some(r)=l.sealed().get(g as usize).and_then(|s|s.receipts().get(i as usize))else{return i64::MIN};match field{0=>r.actor as i64,1=>r.frame as i64,2=>r.sequence as i64,3=>r.primitive as i64,4=>r.result as i64,_=>i64::MIN}})
 }
 #[no_mangle]
 pub extern "C" fn memory_receipt_valid(actor:u32,primitive:u32,result:i32)->u32{u32::from(actor<=2&&primitive<=3&&result>0)}
 #[cfg(test)]
 mod archive_tests{use super::*;#[test]fn archive_domains(){assert_eq!(memory_receipt_valid(2,3,1),1);assert_eq!(memory_receipt_valid(3,3,1),0);assert_eq!(memory_receipt_valid(0,4,1),0);assert_eq!(memory_receipt_valid(0,0,0),0);}}

#[no_mangle]
pub extern "C" fn cartridge_evidence(same_rom:u32,valid:u32,actor:u32,rows:u32)->u32 {
 if same_rom!=1 || valid!=1 || actor>2 || rows==0 || rows>65536 {0} else {1}
}
#[cfg(test)]
mod cartridge_tests {use super::*;#[test]fn isolation(){for a in 0..3{assert_eq!(cartridge_evidence(1,1,a,32),1);assert_eq!(cartridge_evidence(0,1,a,32),0);assert_eq!(cartridge_evidence(1,0,a,32),0);}assert_eq!(cartridge_evidence(1,1,3,32),0);assert_eq!(cartridge_evidence(1,1,0,0),0);assert_eq!(cartridge_evidence(1,1,0,65537),0);}}

 // Packed state: low nibble budget, bit 4 qualifying-window history.
 #[no_mangle]
 pub extern "C" fn fast_budget_step(budget:u32,good:u32,enabled:u32,speed:u32,interval_us:u32,fps_milli:u32,yields:u32)->u32 {
 if !(9..=12).contains(&budget)||good>1||enabled!=1||speed!=4{return 9}
 if interval_us>22000||fps_milli>=228000{return budget.saturating_sub(1).max(9)}
 if interval_us<=18000&&fps_milli<204000&&yields>0 {
 if good==1{return (budget+1).min(12)}return budget|16
 } budget
 }
 #[cfg(test)]
 mod fast_budget_tests {use super::*;#[test]fn bounds(){for b in 9..=12 {for g in 0..=1 {for i in [0,18000,18001,22000,22001] {for f in [0,203999,204000,227999,228000] {for y in 0..=1 {let q=fast_budget_step(b,g,1,4,i,f,y);assert!((9..=12).contains(&(q&15)));assert!(q>>4<=1);}}}}}assert_eq!(fast_budget_step(9,0,1,4,16700,135000,1),25);assert_eq!(fast_budget_step(9,1,1,4,16700,135000,1),10);assert_eq!(fast_budget_step(12,1,1,8,16700,135000,1),9);}}
