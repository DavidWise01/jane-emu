'use strict';
const assert=require('node:assert/strict');
const {capture,qualify}=require('../dashboard/av218_restart_receipt.js');
const cycle={defeatCount:1,defeatFrame:200,defeatId:'loss-1',
 transfer:{frame:201,from:'JANE',to:'TOPH'},restart:null,resumed:null};
const t=(id,endFrame,actor='TOPH',rom='homebrew',root='one-root')=>({
 id,button:'START',endFrame,rom,arenaRoot:root,arenaActor:actor
});
assert.equal(capture(cycle,[t(1,205,'JANE')],'one-root','homebrew',210),null,'old owner cannot earn restart');
assert.equal(capture(cycle,[t(2,206,'TOPH','different-rom')],'one-root','homebrew',210),null,'cross ROM action rejected');
assert.equal(capture(cycle,[t(3,206,'TOPH','homebrew','other-root')],'one-root','homebrew',210),null);
assert.equal(capture(cycle,[t(4,199)],'one-root','homebrew',210),null,'pre-defeat START rejected');
assert.equal(capture(cycle,[{...t(5,208),button:'A'}],'one-root','homebrew',210),null);
const receipt=capture(cycle,[t(6,207),t(7,209)],'one-root','homebrew',215);
assert.equal(receipt.frame,207,'earliest matching completion retained');
assert.equal(receipt.actor,'TOPH');
cycle.restart={frame:212,actor:'TOPH'};
assert.equal(qualify(cycle,271,'TOPH'),null,'require 60 live resumed frames');
assert.equal(qualify(cycle,272,'JANE'),null,'old owner cannot qualify new one');
assert.equal(qualify(cycle,272,'TOPH').source,'NES-playing-60-frames-plus-matching-completed-START');
assert.equal(capture(cycle,[],'one-root','homebrew',280),receipt,'receipt survives rolling trial eviction');
assert.equal(qualify(cycle,300,'TOPH').startReceiptFrame,207,'no need to inspect evicted recentTrials');
cycle.resumed={frame:272,actor:'TOPH'};
assert.equal(qualify(cycle,340,'TOPH'),null,'cannot double certify same life');
const next={defeatCount:2,defeatFrame:500,defeatId:'loss-2',
 transfer:{frame:501,from:'TOPH',to:'PATRICIA'},restart:{frame:520,actor:'PATRICIA'},resumed:null};
assert.equal(qualify(next,590,'PATRICIA'),null,'new cycle requires distinct START receipt');
assert.equal(capture(next,[t(9,515,'TOPH')],'one-root','homebrew',522),null);
assert.equal(capture(next,[t(10,517,'PATRICIA')],'one-root','homebrew',522).actor,'PATRICIA');
assert.equal(qualify(next,580,'PATRICIA').startReceiptFrame,517);
console.log('AV-218 completed START receipt retention PASS: owner, ROM, root, two lives and 60-frame wait');
