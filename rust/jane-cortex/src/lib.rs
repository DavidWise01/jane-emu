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
