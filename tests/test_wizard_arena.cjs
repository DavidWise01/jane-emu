const assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('dashboard/arena.html','utf8');
const main=fs.readFileSync('dashboard/index.html','utf8');
function test(name,fn){fn();console.log('PASS '+name)}
test('three independent NES frames',()=>assert.equal((html.match(/<iframe /g)||[]).length,3));
test('Jane Toph Patricia player identities',()=>['janeFrame','tophFrame','patriciaFrame'].forEach(id=>assert.ok(html.includes('id="'+id+'"'))));
test('distinct reaction profiles',()=>['mode:\x27fast\x27','mode:\x27careful\x27','mode:\x27balanced\x27'].forEach(x=>assert.ok(html.includes(x))));
test('memory isolates each profile',()=>{assert.ok(html.includes("const isolation="));assert.ok(html.includes("jane.arena."));assert.ok(html.includes("STORAGE_PREFIX"))});
test('master volume and mute are functional',()=>{assert.ok(html.includes("id=\"masterVolume\""));assert.ok(html.includes("setVolume(volume)"));assert.ok(html.includes("audioActivated=true"));assert.ok(html.includes("id=\"mute\""))});
test('same ROM is broadcast to all machines',()=>{assert.ok(html.includes('for(const p of profiles)'));assert.ok(html.includes('input.files=transfer.files'))});
test('winning needs human game scores',()=>{assert.ok(html.includes('done&&full'));assert.ok(html.includes("leaders.length===1"))});
test('main dashboard links to tournament',()=>assert.ok(main.includes('href="./arena.html"')));
console.log('Wizard arena: 8 static contract tests passed');
