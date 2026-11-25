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
