# pending/mob-patterns — MOB-01/02/10/12 (page 10, section 'MOB-01/02/10/12 Mobile patterns' 188:158877 at X=224000, Y=0)
Run order: mob-01 → mob-10 (each = helpers.js verbatim + MOB KIT + body; idempotent: same-name frames are rebuilt in place).
Kit patched 28 Nov 2026: 390 frames use the short DEMO notice (decision #29); hero coin stack sits at the banner's lower-right edge.
Data patched to demo-data/decisions: WD-20931 18:44, DP-77412 18:39, #1,248 entries 18:05, DP-77380 09:12, refund #1,245 20:00, 212 tx rows,
Double Side 48 / Neon Koi 57 / Pool Roulette 128 / Twenty-One 92 players; filter chips without icons; no ⌘K shortcut on phones/tablets.
DONE (continuation run 28 Nov 2026, scripts in out/): mob-01 … mob-07
  MOB-01: 188:158881 188:159315 188:159806 188:160218 188:160530 board 188:160887
  MOB-02: 190:74734 190:75438 190:75598 192:144096 192:144357 board 192:144563
  MOB-10: 193:144654 193:145037 194:77008 194:77291 board 196:77250
  MOB-12: board 199:77678 (part A: header + Navigation + Grids)
STOPPED 28 Nov 2026 after 3 consecutive Figma MCP limit errors on mob-08.
REMAINING: mob-08 (board part B: Tables, Modals, breakpoint strip), mob-09 (768 Navigation drawer closed/open), mob-10 (768 Tables pinned column, 768 centred modal).
Next agent: run mob-08.js, then mob-09.js (needs nothing else), then mob-10.js (its centred-modal frame clones the 'Drawer closed (lobby)' frame from mob-09). All three already carry the data patches above.
