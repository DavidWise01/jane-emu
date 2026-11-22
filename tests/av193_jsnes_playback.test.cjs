'use strict';
/* AV-193: actual JSNES 2.1 emulator execution of original homebrew cartridge.
 * This is a headless real-emulator test, not visual browser acceptance.
 */
const assert=require('node:assert/strict');
const {buildROM}=require('../dashboard/av193_test_rom.js');
const {pathToFileURL}=require('node:url');
async function main(){
 // JSNES 2.1.0 is a native ESM package. Its UMD CommonJS entry can return
 // an empty namespace in Node 24; load the package's actual ESM source.
 const packageEntry=require.resolve('jsnes');
 const sourceEntry=packageEntry.replace(/dist[\\/]jsnes\\.js$/,'src/index.js');
 assert.notEqual(sourceEntry,packageEntry,'JSNES package ESM source must exist');
 const jsnes=await import(pathToFileURL(sourceEntry).href);
 assert.equal(typeof jsnes.NES,'function','JSNES ESM NES constructor absent');
 const emulator=new jsnes.NES({emulateSound:false,onFrame:()=>{}});
emulator.loadROM(Buffer.from(buildROM()).toString('binary'));
assert.ok(emulator.rom&&emulator.rom.valid,'valid NROM recognized by JSNES');
function frames(count){for(let i=0;i<count;i++)emulator.frame();}
const press=(name,count=12)=>{
 const button=jsnes.Controller['BUTTON_'+name];
 assert.notEqual(button,undefined,'JSNES button '+name+' exists');
 emulator.buttonDown(1,button);frames(count);emulator.buttonUp(1,button);frames(2);
};
frames(5);
assert.equal(emulator.cpu.mem[0x05],0,'test game awaits START');
press('START',5);
assert.equal(emulator.cpu.mem[0x05],1,'START changed game mode inside JSNES');
let x=emulator.cpu.mem[0x02],y=emulator.cpu.mem[0x03];
press('RIGHT',5);
assert.notEqual(emulator.cpu.mem[0x02],x,'D-pad RIGHT moves sprite in real emulator');
press('DOWN',5);
assert.notEqual(emulator.cpu.mem[0x03],y,'D-pad DOWN moves sprite in real emulator');
press('A',3);
assert.equal(emulator.cpu.mem[0x04],0x16,'A changed sprite palette through controller port');
press('B',3);
assert.equal(emulator.cpu.mem[0x04],0x2A,'B changed palette differently');
press('SELECT',3);
assert.equal(emulator.cpu.mem[0x02],120,'SELECT centered sprite');
assert.equal(emulator.cpu.mem[0x03],108);
console.log('AV-193 original homebrew cartridge executed in JSNES: START D-pad A B SELECT passed');

}
main().catch(error=>{console.error(error);process.exitCode=1});
