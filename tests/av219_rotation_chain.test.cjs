'use strict';
const assert=require('node:assert/strict');
const {audit}=require('../dashboard/av219_rotation_chain.js');
const root='single-run',rom='homebrew';
const cycle=(n,from,to,defeat,receipt,resume)=>({
 defeatCount:n,defeatFrame:defeat,defeatId:'loss-'+n,ownerAtDefeat:from,
 transfer:{frame:defeat+1,from,to},
 startReceipt:{frame:receipt,actor:to,root,rom,evidenceId:'loss-'+n,
  trialId:'reused-local-id',source:'completed-original-nes-trial'},
 restart:{frame:receipt-2,actor:to},
 resumed:{frame:resume,actor:to,startReceiptFrame:receipt}
});
const a=cycle(1,'JANE','TOPH',200,210,273);
const b=cycle(2,'TOPH','PATRICIA',450,465,528);
const ok=audit([a,b],root,rom);
assert.equal(ok.complete,true);
assert.equal(ok.verifiedCycles,2);
assert.equal(ok.receipts.length,2);
assert.equal(ok.receipts[0].to,'TOPH');
assert.equal(ok.receipts[1].to,'PATRICIA');
assert.equal(audit([a],root,rom).firstFault.reason,'NEXT_CARTRIDGE_DEFEAT_NOT_YET_OBSERVED');
assert.equal(audit([a,{...b,ownerAtDefeat:'JANE'}],root,rom).firstFault.reason,
 'WRONG_LOSS_OWNER_OR_DUPLICATE_DEFEAT');
assert.equal(audit([a,{...b,transfer:{frame:451,from:'TOPH',to:'JANE'}}],root,rom).firstFault.reason,
 'WRONG_OR_MISSING_OWNER_TRANSFER');
assert.equal(audit([a,{...b,startReceipt:{...b.startReceipt,root:'different'}}],root,rom).firstFault.reason,
 'MISSING_OR_FOREIGN_COMPLETED_START');
assert.equal(audit([a,{...b,startReceipt:{...b.startReceipt,evidenceId:'loss-1'}}],root,rom).firstFault.reason,
 'MISSING_OR_FOREIGN_COMPLETED_START');
assert.equal(audit([a,{...b,resumed:{...b.resumed,frame:510}}],root,rom).firstFault.reason,
 'SUSTAINED_PLAY_NOT_OBSERVED');
assert.equal(audit([a,{...b,defeatFrame:230}],root,rom).firstFault.reason,
 'UNORDERED_OR_MISSING_NES_DEFEAT');
const repeat={...b,startReceipt:{...b.startReceipt,frame:a.startReceipt.frame,
 actor:'PATRICIA',evidenceId:b.defeatId}};
assert.equal(audit([a,repeat],root,rom).firstFault.reason,'MISSING_OR_FOREIGN_COMPLETED_START',
 'old frame cannot establish later life');
const fake={...b,startReceipt:{...b.startReceipt,source:'button-offered'}};
assert.equal(audit([a,fake],root,rom).firstFault.reason,'MISSING_OR_FOREIGN_COMPLETED_START');
console.log('AV-219 sequential NES Jane→Toph→Patricia evidence audit passed (controlled cycles)');
