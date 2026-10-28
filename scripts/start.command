#!/bin/bash
set -eu
cd -- "$(dirname -- "$0")/.."
NODE_BIN="$(command -v node || true)"
if [ -z "$NODE_BIN" ]; then
  NODE_BIN="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
fi
if [ ! -x "$NODE_BIN" ]; then
  echo 'Node.js 22.13 이상 설치 후 다시 실행해 주세요.'
  exit 1
fi
export PATH="$(dirname -- "$NODE_BIN"):$PATH"
if [ ! -f node_modules/next/dist/bin/next ]; then
  echo '먼저 npm install로 의존성을 설치해 주세요.'
  exit 1
fi
printf '\n부산한끼 시작 · http://127.0.0.1:3000\n종료하려면 Ctrl+C\n\n'
exec "$NODE_BIN" node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3000
