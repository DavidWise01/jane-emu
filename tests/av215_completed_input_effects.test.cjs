'use strict';
const assert=require('node:assert/strict');
const {create}=require('../dashboard/av215_input_effects.js');
const p=create();
const before={x:120,y:108,palette:0x30,mode:1};
const trial=(id,button,after,extra={})=>({
 id,root:'NES-A',rom:'homebrew',actor:'JANE',startFrame:100,
 endFrame:109,source:'nes-completed-trial',button,before,after,...extra
});
assert.equal(p.observe(trial('R','RIGHT',{...before,x:130})).kind,'NES_EFFECT_OBSERVED');
assert.equal(p.observe(trial('R','RIGHT',{...before,x:130})),false,'duplicate trial cannot count');
assert.equal(p.observe(trial('Rbad','RIGHT',{...before,x:120})).kind,'COMPLETED_WITHOUT_EXPECTED_EFFECT');
assert.equal(p.observe(trial('L','LEFT',{...before,x:110})).changed,true);
assert.equal(p.observe(trial('A','A',{...before,palette:0x16})).changed,true);
assert.equal(p.observe(trial('B','B',{...before,palette:0x2a})).changed,true);
assert.equal(p.observe(trial('Awrong','A',{...before,palette:0x2a})).changed,false);
assert.equal(p.observe(trial('UP','UP',{...before,y:98})).changed,true);
assert.equal(p.observe(trial('DOWN','DOWN',{...before,y:118})).changed,true);
assert.equal(p.observe(trial('START','START',{...before,mode:1},{before:{...before,mode:0}})).changed,true);
assert.equal(p.observe(trial('MENU','RIGHT',{...before,x:120},{before:{...before,mode:0}})).kind,'OUTSIDE_PLAY');
assert.equal(p.observe(trial('fake','RIGHT',{...before,x:130},{source:'offered-action'})),false);
assert.equal(p.observe(trial('invalid','RIGHT',{...before,x:130},{endFrame:99})),false);
assert.equal(p.snapshot().rows.length,10);
console.log('AV-215 original NES completed input/observed-RAM effects policy passed; browser still unverified');
