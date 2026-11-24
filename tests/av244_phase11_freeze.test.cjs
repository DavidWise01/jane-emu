'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const html=fs.readFileSync('dashboard/arena.html','utf8'),freeze=JSON.parse(fs.readFileSync('data/phase11-freeze.json','utf8'));
assert.equal((html.match(/<iframe\b/g)||[]).length,1);
assert.ok((html.match(/<script\b/g)||[]).length>=200);
for(const id of ["av234-winamp-neon","av235-live-eq-script","av238-lightning-monitoring","av240-plasma-binding","av241-routing-binding","av242-memory-binding","av243-resonance-binding"])assert.ok(html.includes('id="'+id+'"'),id);
for(const id of ['av235-live-eq-script','av240-plasma-binding','av241-routing-binding','av242-memory-binding','av243-resonance-binding']){
const start=html.indexOf('<script id="'+id+'">')+('<script id="'+id+'">').length;const source=html.slice(start,html.indexOf('</script>',start));new vm.Script(source);assert.ok(!/buttonDown|buttonUp|\.cpu\.mem|JANE_AV232_RESUME/.test(source),id);}
const blob=fs.readFileSync('docs/phase11-baseline-arena.html');assert.equal(crypto.createHash('sha1').update('blob '+blob.length+'\0').update(blob).digest('hex'),freeze.arenaBlob);
assert.equal(freeze.implementationClosed,true);assert.equal(freeze.fullGameplayAccepted,false);assert.equal(freeze.visualBrowserAccepted,false);
console.log('AV-244 Phase 11 immutable baseline and monitoring syntax PASS; no gameplay acceptance implied');
