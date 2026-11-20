const assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('dashboard/arena.html','utf8');
const main=fs.readFileSync('dashboard/index.html','utf8');
function test(name,fn){fn();console.log('PASS '+name)}
test('ONE shared NES screen',()=>assert.equal((html.match(/<iframe /g)||[]).length,1));
test('Jane Toph Patricia each have a role',()=>{
 for(const name of ['JANE','TOPH','PATRICIA'])assert.ok(html.includes("name:'"+name+"'"));
});
test('Jane remains the default player and Toph watches',()=>{
 assert.match(html,/let active=0,/);assert.ok(html.includes("TOPH → JANE"));
});
test('Toph teaching follows the same cartridge and screen context',()=>{
 assert.ok(html.includes("av080_coach.js"));assert.ok(html.includes('av125_collective.js') && html.includes('window.JANE_NEURAL_RECEIVE'));
});
test('one real NES RAM death sensor retained',()=>{
 assert.ok(html.includes('JANE_ARENA_RAM'));assert.ok(html.includes('lifeCandidate.count>=3'));
});
test('master volume, mute and speed retained',()=>{
 assert.ok(html.includes('id="volume"'));assert.ok(html.includes('id="mute"'));
 assert.ok(html.includes('id="speed"'));assert.ok(html.includes('JANE_ARENA_SPEED'));
});
test('no false independent witness claims',()=>assert.ok(html.includes('observation_roots:1')));
test('main dashboard links to arena',()=>assert.ok(main.includes('href="./arena.html"')));
console.log('Jane Toph Patricia: 8 current arena contract tests passed');
