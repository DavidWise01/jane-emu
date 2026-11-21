const fs=require('node:fs'),assert=require('node:assert/strict');
const html=fs.readFileSync('dashboard/arena.html','utf8');
function check(title,fn){fn();console.log('PASS '+title)}
check('minimal arena retains exactly one NES screen',()=>assert.equal(html.split('<iframe ').length-1,1));
check('speed selector has 1x 2x 4x 8x',()=>{
 for(const [v] of [['1'],['2'],['4'],['8']])assert.ok(html.includes('<option value="'+v+'">'));
});
check('speed factor modifies actual NES accumulator',()=>assert.ok(html.includes('accum+=delta*(window.JANE_ARENA_SPEED||1)')));
check('speed step budget expanded above 6 frame cap',()=>assert.ok(html.includes('steps++<32')));
check('speed updates iframe without cartridge reload',()=>{
 const at=html.indexOf("$('speed').onchange");
 const part=html.slice(at,at+245);
 assert.ok(part.includes('w().JANE_ARENA_SPEED=speed'));
 assert.ok(!part.includes('romInput'));
});
check('advanced death sensor stays collapsed',()=>assert.ok(html.includes('<details id="advancedSensor"')));
check('single shared-game rotation still preserved',()=>assert.ok(html.includes('const next=(active+1)%3')));
check('speaker volume and mute retained',()=>{assert.ok(html.includes('id="volume"'));assert.ok(html.includes('id="mute"'))});
console.log('AV-080 minimal speed arena source checks passed');