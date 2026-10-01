#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
gulou_action="${1:-dev}"
if command -v node >/dev/null 2>&1; then
  gulou_node="$(command -v node)"
else
  gulou_node="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
fi
if [ ! -x "$gulou_node" ]; then
  echo '请安装 Node.js 22 或更新版本，然后运行 npm install 与 npm run dev。'
  exit 1
fi
export PATH="$(dirname "$gulou_node"):$PATH"
if [ ! -d node_modules ]; then
  if command -v npm >/dev/null 2>&1; then npm install
  else "$gulou_node" "$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pnpm/bin/pnpm.cjs" install
  fi
fi
case "$gulou_action" in
  dev) exec "$gulou_node" node_modules/vite/bin/vite.js --host 0.0.0.0 ;;
  build) "$gulou_node" node_modules/typescript/bin/tsc --noEmit; exec "$gulou_node" node_modules/vite/bin/vite.js build ;;
  preview) exec "$gulou_node" node_modules/vite/bin/vite.js preview --host 0.0.0.0 ;;
  test) exec "$gulou_node" scripts/smoke.mjs ;;
  *) echo '用法：./scripts/run.sh dev|build|preview|test'; exit 1 ;;
esac
