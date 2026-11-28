const F = {
  key: 'PRO-01', name: 'PRO-01 Mobile — Homepage → Register → Verification → Dashboard', flowName: 'PRO-01 (390) Homepage → Register → Verification → Dashboard',
  title: 'Mobile 390 — Homepage → Register → Email verification → Dashboard',
  desc: 'Mobile version of PRO-01 built from the 390 screens: guest taps Sign up in the mobile top bar, registers, enters the emailed code and lands on the empty new-user dashboard. 390 has no separate “check your inbox” or “code sent” screens, so Create account goes straight to code entry. Keys work when the prototype is played in a desktop browser. All values are DEMO.',
  stack: 'V', gap: 320, bgap: 420, boxOff: 210, subMax: 40, textW: 600, logoFb: [16, 40, 120, 40],
  pages: ['1:11'],
  steps: [
    { k: 'HOME', src: '33:225448', t: 'Mobile home — guest', sub: 'MOB-03 · logged out, round open', cta: 'Tap “Sign up”' },
    { k: 'REG', src: '34:336738', t: 'Register', sub: 'AUTH-01 · Default', cta: '“Create account”' },
    { k: 'VCODE', src: '34:420291', t: 'Email code entered', sub: 'AUTH-04 · Code entry', cta: '“Verify email”' },
    { k: 'VOK', src: '34:453454', t: 'Email verified', sub: 'AUTH-04 · Success', cta: '“Remind me later”' },
    { k: 'DASH', src: '33:216685', t: 'Dashboard — new user', sub: 'USR-01 · New user (empty)' }
  ],
  branches: [
    { k: 'REGVAL', src: '34:359317', from: 'REG', t: 'Validation errors', state: 'AUTH-01 · Validation', cond: 'email, password, country or date of birth is invalid', trig: 'tap the email field on step 2', ret: 'Fix the fields → “Create account” → step 3' },
    { k: 'VEXP', src: '34:436332', from: 'VCODE', t: 'Code expired', state: 'AUTH-04 · Expired', cond: 'the code entered has expired', trig: 'press 1 on step 3', ret: '“Send a new code” → step 3' }
  ],
  links: [
    ['HOME', 'Sign up', 251, 44, 83, 40, 'REG'], ['HOME', 'Participate', 36, 626, 154, 48, 'REG'], ['HOME', 'Enter round', 37, 1383, 316, 48, 'REG'],
    ['REG', 'Create account', 16, 1326, 358, 48, 'VCODE'], ['REG', 'Branch — email field (invalid input)', 16, 386, 358, 74, 'REGVAL'],
    ['REGVAL', 'Create account', 16, 1528, 358, 48, 'VCODE'],
    ['VCODE', 'Verify email', 16, 727, 358, 48, 'VOK'], ['VCODE', 'Change email address', 16, 598, 358, 48, 'REG'],
    ['VEXP', 'Send a new code', 16, 767, 358, 48, 'VCODE'], ['VEXP', 'Change email address', 16, 636, 358, 48, 'REG'],
    ['VOK', 'Remind me later', 16, 777, 358, 48, 'DASH']
  ],
  keys: [['VCODE', 1, 'VEXP']],
  timeouts: []
};
