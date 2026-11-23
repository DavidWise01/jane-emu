'use strict';
const assert=require('node:assert/strict');
const {create}=require('../dashboard/av215_input_effects.js');
const p=create();
const ram=(x,palette,mode=1)=>({x,y:108,palette,mode});
const move=(f,x0,x1,actor='JANE',id='recycled')=>({
 source:'nes-completed-trial',root:'root-one',rom:'homebrew',actor,
 id,startFrame:f,endFrame:f+5,button:'RIGHT',before:ram(x0,0x30),after:ram(x1,0x30)
});
const color=(f,p0,p1,button,actor='JANE',id='recycled')=>({
 source:'nes-completed-trial',root:'root-one',rom:'homebrew',actor,
 id,startFrame:f,endFrame:f+5,button,before:ram(120,p0),after:ram(120,p1)
});
const b=(frame,mode,actor='JANE')=>({root:'root-one',rom:'homebrew',actor,frame,mode});
assert.equal(p.observe(move(10,120,128)).changed,true);
assert.equal(p.observe(color(18,0x30,0x16,'A')).changed,true);
assert.equal(p.snapshot().episodes.length,1);
assert.equal(p.snapshot().qualifiedEpisodes,0);
assert.equal(p.boundary(b(24,2)),true,'actual NES game-over splits episode');
assert.equal(p.boundary(b(24,2)),false,'repeat same defeat is not extra episode');
assert.equal(p.boundary(b(25,1)),false,'playing is not a boundary');
assert.equal(p.observe(move(30,120,130)).changed,true);
assert.equal(p.observe(color(38,0x30,0x16,'A')).changed,true);
assert.equal(p.snapshot().episodes.length,2);
assert.equal(p.snapshot().qualifiedEpisodes,0,
 'two partial lives cannot merge into one sustained evidence certificate');
assert.equal(p.observe(move(46,130,140)).changed,true);
assert.equal(p.observe(color(54,0x16,0x2a,'B')).changed,true);
assert.equal(p.snapshot().qualifiedEpisodes,1,'complete post-restart life qualifies separately');
assert.equal(p.boundary(b(62,0)),true,'title RAM closes existing episode');
assert.equal(p.observe(move(63,120,130)).changed,true);
assert.equal(p.snapshot().episodes.length,3);
assert.equal(p.boundary({...b(69,2),root:'different-root'}),false,
 'foreign cartridge run cannot terminate current life');
assert.equal(p.observe(color(250,0x30,0x16,'A')).changed,true);
assert.equal(p.snapshot().episodes.length,4,'large frame gap starts new episode');
assert.equal(p.snapshot().episodes[3].qualified,false);
assert.equal(p.observe(move(256,120,130,'TOPH')).changed,true);
assert.equal(p.snapshot().episodes.length,5,'new player owns separate evidence');
assert.equal(p.boundary(b(262,2,'TOPH')),true);
assert.equal(p.snapshot().boundaries.length,3);
assert.equal(p.observe(move(256,120,130,'TOPH')),false,
 'same completed action is not replayed across boundary');
assert.equal(p.snapshot().qualifiedEpisodes,1);
console.log('AV-217 no cross-life NES gameplay certificate regression PASS (controlled observations)');
