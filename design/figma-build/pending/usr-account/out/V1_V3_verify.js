// Read-only verification (any page): screenshot desktop frames 5 at a time (a response shows at most ~5 images). Replace IDS per call.
// V1: '33:170381','33:199622','33:221847','33:244072','33:262703'  (A3 Enable, A3 Reset, A4 Not started, A4 Pending, A4 Approved)
// V2: '33:280974','33:302783','33:321559','34:344599','34:369746'  (A4 Rejected, A4 Expired, A5, A6, A7 Default)
// V3: '34:384921','34:404144','34:413465','34:430816','34:451588'  (A7 Revoke, A8 Default, A8 End all, A9, A10)
const IDS = ['33:170381', '33:199622', '33:221847', '33:244072', '33:262703'];
const out = [];
for (const id of IDS) { const f = await figma.getNodeByIdAsync(id); if (!f) { out.push('missing ' + id); continue; } await f.screenshot({ scale: 0.3 }); out.push(f.name + ' ' + Math.round(f.width) + 'x' + Math.round(f.height)); }
return out;
