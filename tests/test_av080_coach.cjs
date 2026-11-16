const assert=require('node:assert/strict');
const {JaneTophCoach}=(()=>({JaneTophCoach:require('../dashboard/av080_coach.js')}))();
function test(name,fn){fn();console.log('PASS '+name)}
const ctx={rom:'game-1',hash:'screen-A',frame:500,title:'LEARNED'};
function make(){const c=JaneTophCoach.create();c.reset('game-1','session-1');return c}
function obs(c,id,button='A',hash='screen-A',delta=.02){return c.observe({id,rom:'game-1',preHash:hash,button,delta,startFrame:100+id,endFrame:110+id})}
test('fresh state never claims lesson',()=>{const c=make();assert.equal(c.recommend(ctx),null);assert.equal(c.status().teachings,0)});
test('two same-context trials authorize an experiment question only',()=>{
 const c=make();obs(c,1);obs(c,2);assert.equal(c.recommend(ctx),'B');assert.equal(c.status().latest.benefit,undefined);
});
test('menu screens and early frames never receive intervention',()=>{
 const c=make();obs(c,1);obs(c,2);assert.equal(c.recommend({...ctx,title:'WAIT'}),null);
 assert.equal(c.recommend({...ctx,frame:80}),null);
});
test('duplicate trial IDs cannot generate fake repeat count',()=>{
 const c=make();obs(c,1);obs(c,1);assert.equal(c.status().observed,1);assert.equal(c.recommend(ctx),null);
});
test('different screen contexts do not supply evidence',()=>{
 const c=make();obs(c,1,'A','screen-B');obs(c,2,'A','screen-C');assert.equal(c.recommend(ctx),null);
});
test('Toph recommends once and then waits for rooted Jane feedback',()=>{
 const c=make();obs(c,1);obs(c,2);assert.equal(c.recommend(ctx),'B');
 assert.equal(c.recommend({...ctx,frame:800}),null);
 const result=obs(c,3,'B','screen-A',.18);
 assert.equal(result.kind,'feedback');assert.equal(result.verdict,'PIXEL_RESPONSE_OBSERVED');
 assert.equal(result.benefit,'UNKNOWN');assert.equal(result.source_root,'session-1');
 assert.equal(c.status().feedback,1);
});
test('no beneficial learning inferred from pixel change',()=>{
 const c=make();obs(c,1);obs(c,2);c.recommend(ctx);obs(c,3,'B','screen-A',.45);
 assert.equal(c.status().lessons.at(-1).confidence,'UNPROVEN');
});
test('coaching off suppresses action choice',()=>{
 const c=make();obs(c,1);obs(c,2);c.setEnabled(false);assert.equal(c.recommend(ctx),null);
});
test('one game ancestry preserved when observers share frames',()=>{
 const c=make();obs(c,1);obs(c,2);c.recommend(ctx);
 assert.equal(c.status().source_root,'session-1');
});
console.log('AV-080: 9 coaching checks passed');