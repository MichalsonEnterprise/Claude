# Assemble ready-to-run use_figma scripts: helpers.js (verbatim) + parts
import pathlib, subprocess
root = pathlib.Path(__file__).parent; H = (root.parent.parent / 'helpers.js').read_text()
S = lambda n: (root / 'src' / n).read_text()
jobs = {
  '01_mob_gp03_gp04.js': ['modals.js', 'msheet.js', 'mob_0304.js'],
  '02_d_restricted_1280_768.js': ['dlib.js', 'd_restricted.js'],
  '03_d_noround_1280_768.js': ['dlib.js', 'd_noround.js'],
}
for out, parts in jobs.items():
  code = H + '\n' + '\n'.join(S(p) for p in parts if (root / 'src' / p).exists())
  (root / 'out' / out).write_text(code)
  chk = root / 'out' / ('_chk_' + out); chk.write_text('(async () => {\n' + code + '\n})();')
  r = subprocess.run(['node', '--check', str(chk)], capture_output=True, text=True); chk.unlink()
  print(out, len(code), 'chars', 'OK' if r.returncode == 0 else r.stderr[:600])
