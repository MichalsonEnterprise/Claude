#!/bin/sh
# Runs Foundry's `forge` from PATH, falling back to the default foundryup install location,
# so `pnpm --filter @gp/contracts <script>` works in non-login shells.
if command -v forge >/dev/null 2>&1; then
  exec forge "$@"
fi
if [ -x "$HOME/.foundry/bin/forge" ]; then
  exec "$HOME/.foundry/bin/forge" "$@"
fi
echo "forge not found: install Foundry (see packages/contracts/README.md#toolchain)" >&2
exit 127
