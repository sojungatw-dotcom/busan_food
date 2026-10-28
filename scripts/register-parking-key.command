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
printf '\n  부산한끼 · 주차장 API 키 등록\n\n'
printf '  1. 공공데이터포털에서 전국주차장정보표준데이터 → 오픈 API → 활용신청\n'
printf '  2. 승인 후 마이페이지 → 활용신청 현황 → 일반 인증키 복사\n'
printf '  3. 아래에 키만 붙여넣고 Enter (입력 내용은 표시되지 않음)\n\n'
trap 'unset BUSAN_KEY_INPUT; printf "\n등록이 취소되었습니다.\n"; exit 130' INT TERM
IFS= read -r -s -p '  인증키 입력: ' BUSAN_KEY_INPUT
printf '\n\n'
if ! printf '%s' "$BUSAN_KEY_INPUT" | "$NODE_BIN" scripts/save-key.mjs PARKING_API_KEY; then
  unset BUSAN_KEY_INPUT
  printf '\n  위 오류 코드로 원인을 확인할 수 있습니다. 키 값은 공유하지 마세요.\n'
  if [ -t 0 ]; then
    read -r -p '  Enter를 누르면 창을 종료합니다.' _
  fi
  exit 1
fi
unset BUSAN_KEY_INPUT
printf '\n  음식점 추천 후 근처 주차장 영역에서 다시 조회를 누르세요.\n'
printf '  서버를 시작하려면: bash scripts/start.command\n\n'
