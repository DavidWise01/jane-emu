'use strict';
const assert=require('node:assert/strict');
const {create}=require('../dashboard/av207_sprite_mechanics.js');
const p=create();
const x=(frame,px,palette,actor='JANE',mode=1)=>({
 root:'one-root',rom:'av201-homebrew',actor,frame,mode,x:px,palette,
 actions:['RIGHT','LEFT','A','B','START']
});
assert.equal(p.offer(x(10,120,0x30)),'RIGHT');
assert.equal(p.offer(x(15,127,0x30)),'RIGHT');
assert.equal(p.offer(x(18,136,0x30)),'A');
assert.equal(p.offer(x(22,136,0x16)),'LEFT');
assert.equal(p.offer(x(35,104,0x16)),'B');
assert.equal(p.offer(x(40,104,0x2A)),'RIGHT');
assert.equal(p.snapshot().completedLaps,1);
assert.equal(p.offer(x(44,120,0x2A)),'RIGHT');
assert.equal(p.offer(x(50,137,0x2A)),'A');
assert.equal(p.offer(x(51,137,0x16)),'LEFT');
assert.equal(p.offer(x(60,103,0x16)),'B');
assert.equal(p.offer(x(70,103,0x2A)),'RIGHT');
assert.equal(p.snapshot().completedLaps,2);
assert.equal(p.offer(x(71,120,0x2A,'JANE',2)),null,'no gameplay actions on defeat');
assert.equal(p.offer({...x(72,120,0x2A),actions:['A']}),null,'no extra controller or unsupported actions');
assert.equal(p.offer(x(75,120,0x30,'TOPH')),'RIGHT','new owner starts independent cycle');
assert.equal(p.snapshot().completedLaps,0);
assert.equal(p.offer(x(10,120,0x30,'TOPH')),'RIGHT','clock rewind resets goal');
assert.equal(p.offer({...x(80,120,0x30),root:'other-root'}),'RIGHT','session ancestry changes reset');
console.log('AV-207 deterministic NES RAM gameplay policy passed: movement, A/B, owner, defeat, reset');
