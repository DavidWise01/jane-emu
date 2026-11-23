'use strict';
/* AV-221 — Browser tests must return serializable NES state, not live DOM.
 * This is a regression for a real Playwright boundary error, not a claim that
 * browser gameplay has passed.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const names=['av218_browser_restart_receipt.test.cjs',
  'av219_browser_three_player_chain.test.cjs',
  'av220_browser_acceptance.test.cjs'];
for(const filename of names){
 const code=fs.readFileSync(path.join(root,'tests',filename),'utf8');
 assert.ok(!/canvas\s*:\s*document\.querySelector\('#game'\)\?\.contentWindow\?\.document\.getElementById\('nesCanvas'\)\s*[,}]/.test(code),
   filename+' must not return a non-serializable DOM node from page.evaluate');
 assert.match(code,/canvas\s*:\s*\{width:/,
   filename+' should serialize actual pixel width and height');
 assert.match(code,/height:\s*document\.querySelector\('#game'\)/,
   filename+' must read height as a plain number');
 assert.match(code,/assert\.equal\((?:after|result)\.canvas\?\.width,256\)/);
 assert.match(code,/assert\.equal\((?:after|result)\.canvas\?\.height,240\)/);
 new Function('require','module','__dirname',code);
}
const sample={width:256,height:240};
assert.deepEqual(JSON.parse(JSON.stringify(sample)),sample,
 'numeric NES dimensions remain meaningful across browser process boundary');
console.log('AV-221 browser NES canvas serialization regression PASS (static and JS shape; not Chromium gameplay)');
