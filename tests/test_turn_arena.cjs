const fs=require('node:fs');
const assert=require('node:assert/strict');
const html=fs.readFileSync('dashboard/arena.html','utf8');
function test(label,fn){fn();console.log('PASS '+label)}
test('exactly one shared NES iframe',()=>assert.equal((html.match(/<iframe\b/g)||[]).length,1));
test('rotates Jane Toph Patricia using a single active index',()=>{
 assert.match(html,/name:'JANE',mode:'fast'/);
 assert.match(html,/name:'TOPH',mode:'careful'/);
 assert.match(html,/name:'PATRICIA',mode:'balanced'/);
 assert.match(html,/active=\(active\+1\)%3/);
});
test('handoff never resets NES',()=>{
 const slice=html.slice(html.indexOf('function switchTurn('),html.indexOf('function readLife('));
 assert.match(slice,/setProfile\(\)/);
 assert.doesNotMatch(slice,/\.reset\(/);
 assert.doesNotMatch(slice,/romInput/);
});
test('all two nonplaying agents observe same frame stream',()=>{
 assert.match(html,/if\(i!==active\)people\[i\]\.watched\+=df/);
 assert.match(html,/observation_roots:1/);
});
test('life sensor requires stable one-life drop with cooldown',()=>{
 assert.match(html,/lifeLast-life===1/);
 assert.match(html,/lifeCandidate\.count>=3/);
 assert.match(html,/frame>=lifeHoldoff/);
});
test('manual confirm can hand off without pretending death was sensed',()=>{
 assert.match(html,/\$\('confirmDeath'\)\.onclick/);
 assert.match(html,/human-confirmed life loss/);
});
test('NES RAM is read-only and no proprietary cartridge is embedded',()=>{
 assert.match(html,/JANE_ARENA_RAM=\{read:/);
 assert.doesNotMatch(html,/data:application\/octet-stream;base64/);
});
test('volume controls shared one NES audio stream',()=>{
 assert.match(html,/id="volume"/);
 assert.match(html,/id="mute"/);
});
console.log('Shared NES rotation: 8 checks passed');
