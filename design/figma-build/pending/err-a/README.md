# pending/err-a — ERR-01/02/03 (page 12) + ERR mobile examples (page 10)
Build: `node build.cjs` → out/<name>.js = helpers.js + src/lib.js (ERR KIT) + src/<name>.js. Each out file is < 50k chars; pass its full content as use_figma code.
Run order: err01 → err02a → err02b → err03a → err03b → mob. Idempotent: rows are rebuilt by name inside the existing board; boards are found by name; mobile frames are rebuilt in place (same x/y).
DONE 28 Nov 2026 (all verified with in-script screenshots):
  page 12 section 'ERR-01/02/03 Empty, error & loading matrices' 272:962 (X 0, Y 0, 1680 × 21292)
    [ERR-01] Empty-state matrix / 1440 / Board 272:963 (E-01…E-12, 8 rows)
    [ERR-02] Error matrix / 1440 / Board 273:1292 (X-01…X-13, 8 rows)
    [ERR-03] Loading matrix / 1440 / Board 277:2501 (L-01…L-13, 8 rows)
  page 10 section 'ERR — Mobile' 281:97573 (X 253000 — 'PRO — Mobile' ends at 252670)
    281:97574 transactions empty · 281:97695 withdraw validation · 281:97831 WD-20931 failed sheet · 281:98012 wallet loading
Post-run patches already folded into src: X-02 toast labels use setByChars (the toast's first 'Label' text layer belongs to its nested DEMO badge); 4xx row 422 references X-06; L-07 copy/dev rewritten in place (chart Loading variant = previous data + Updating chip); src/err03b.js and src/mob.js now carry the final wording and 3 skeleton activity cards.
