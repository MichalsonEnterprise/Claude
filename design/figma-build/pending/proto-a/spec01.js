const F = {
  key: 'PRO-01', name: 'PRO-01 Homepage → Register → Verification → Dashboard', flowName: 'PRO-01 Homepage → Register → Verification → Dashboard',
  title: 'Homepage → Register → Email verification → Dashboard',
  desc: 'A guest lands on the homepage while round #1,248 is open, signs up with email, enters the 6-digit verification code and arrives on an empty new-user dashboard. Play from the flow starting point “PRO-01 …” (step 1). 7 happy-path screens left → right; 4 branches stacked under the screen that triggers them. Every value on the screens is DEMO.',
  pages: ['1:4', '1:5', '1:6'],
  steps: [
    { k: 'HOME', src: '32:23348', t: 'Homepage — guest, round #1,248 open', cta: 'Click “Sign up”' },
    { k: 'REG', src: '32:29451', t: 'Register — create account', cta: '“Create account”' },
    { k: 'REGOK', src: '32:75071', t: 'Account created — check your inbox', cta: '“Enter verification code”' },
    { k: 'VSENT', src: '33:237908', t: 'Email verification — code sent', cta: 'Click the code field (enters 6 digits)' },
    { k: 'VCODE', src: '33:261299', t: 'Email verification — code entered', cta: '“Verify email”' },
    { k: 'VOK', src: '33:312337', t: 'Email verified', cta: '“Remind me later”' },
    { k: 'DASH', src: '32:57885', t: 'Dashboard — new user (empty state)' }
  ],
  branches: [
    { k: 'REGVAL', src: '32:36004', from: 'REG', t: 'Validation errors', cond: 'email, password, country or date of birth is invalid', trig: 'click the email field on step 2', ret: 'Fix the fields → “Create account” → step 3' },
    { k: 'REGERR', src: '32:59805', from: 'REG', t: 'Sign-up request failed', cond: 'the server rejects the sign-up request', trig: 'press 1 on step 2', ret: '“Try again” → step 3' },
    { k: 'VCOOL', src: '33:278409', from: 'VSENT', t: 'Resend cooldown', cond: 'a new code was just requested — resend is locked for a short cooldown', trig: 'press 1 on step 4', ret: 'Click the code field → step 5' },
    { k: 'VEXP', src: '33:300536', from: 'VCODE', t: 'Code expired', cond: 'the code entered has expired', trig: 'press 1 on step 5', ret: '“Send a new code” → step 4' }
  ],
  links: [
    ['HOME', 'Sign up', 1281, 48, 83, 40, 'REG'], ['HOME', 'Participate', 320, 386, 153, 48, 'REG'], ['HOME', 'Enter round', 1069, 1534, 318, 48, 'REG'],
    ['REG', 'Create account', 760, 807, 400, 48, 'REGOK'], ['REG', 'Branch — email field (invalid input)', 760, 259, 400, 74, 'REGVAL'],
    ['REGVAL', 'Create account', 760, 1141, 400, 48, 'REGOK'],
    ['REGERR', 'Try again', 760, 943, 400, 48, 'REGOK'],
    ['REGOK', 'Enter verification code', 760, 782, 400, 48, 'VSENT'], ['REGOK', 'Use a different email', 760, 854, 400, 48, 'REG'],
    ['VSENT', 'Code field — enter code', 760, 548, 400, 134, 'VCODE'], ['VSENT', 'Change email address', 760, 874, 400, 48, 'REG'],
    ['VCOOL', 'Code field — enter code', 760, 537, 400, 134, 'VCODE'], ['VCOOL', 'Change email address', 760, 863, 400, 48, 'REG'],
    ['VCODE', 'Verify email', 760, 686, 400, 48, 'VOK'], ['VCODE', 'Change email address', 760, 798, 400, 48, 'REG'],
    ['VEXP', 'Send a new code', 760, 712, 400, 48, 'VSENT'], ['VEXP', 'Change email address', 760, 840, 400, 48, 'REG'],
    ['VOK', 'Remind me later', 760, 835, 400, 48, 'DASH']
  ],
  keys: [['REG', 1, 'REGERR'], ['VSENT', 1, 'VCOOL'], ['VCODE', 1, 'VEXP']],
  timeouts: []
};
