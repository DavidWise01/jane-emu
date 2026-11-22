/* NES startup preflight: catch syntactically broken optional neural modules
 * before deployment can disable the playable emulator.
 */
'use strict';const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),page=fs.readFileSync(path.join(root,'dashboard/arena.html'),'utf8');
assert.match(page,/<iframe[^>]*id="game"/);
assert.match(page,/setInterval\(sample,500\);renderPlayers\(\);init\(\)/);
assert.match(page,/\\.srcdoc=html/);
assert.match(page,/pendingNESFile=file/,'Early ROM selection must queue');
assert.match(page,/setTimeout\\(\\(\\)=>load\\(cartridge\\),0\\)/,'Queued ROM must load after iframe init');
assert.match(page,/NES fallback cabinet/,'Broken injection must fall back to original playable cabinet');
assert.match(page,/Injected NES script invalid/,'Embedded game code must receive preflight syntax validation');
assert.match(page,/const shift172=window\.JaneShiftConfidence\?\.create\?\./);
assert.match(page,/Janes_Perception_v71_Mission_Control_Embedded_JPG_Story_NES\.html/);
const external=[...page.matchAll(/<script\b[^>]*\bsrc="(\.\/[^"]+\.js)"/gi)].map(x=>x[1]);assert.ok(external.length>=70,'Expected all neural instrument scripts');
let checked=0;for(const ref of external){const file=path.resolve(root,'dashboard',ref.slice(2));assert.ok(file.startsWith(path.join(root,'dashboard')+path.sep),'Unsafe script path');assert.ok(fs.existsSync(file),'Missing dashboard dependency '+ref);new vm.Script(fs.readFileSync(file,'utf8'),{filename:file});checked++}
for(const m of page.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){if(m[1].includes('src=')||/type=["']application\/(?:json|ld\+json)["']/i.test(m[1]))continue;new vm.Script(m[2],{filename:'dashboard/arena.html inline script '+(++checked)})}
require('../dashboard/av172_shift_confidence.js');assert.equal(typeof globalThis.JaneShiftConfidence?.create,'function');
console.log('NES boot preflight passed: '+external.length+' dependencies and inline scripts parsed');