#!/bin/sh
set -eu
cd "$(dirname "$0")"

PUBLIC_PORT="${PORT:-8080}"

if command -v ffmpeg >/dev/null 2>&1; then
  case "${FFMPEG_PATH:-}" in
    [A-Za-z]:\\*|[A-Za-z]:/*|*\\*) ;;
    *) export FFMPEG_PATH="${FFMPEG_PATH:-$(command -v ffmpeg)}" ;;
  esac
fi
if command -v ffprobe >/dev/null 2>&1; then
  case "${FFPROBE_PATH:-}" in
    [A-Za-z]:\\*|[A-Za-z]:/*|*\\*) ;;
    *) export FFPROBE_PATH="${FFPROBE_PATH:-$(command -v ffprobe)}" ;;
  esac
fi

# Railway static/Nixpacks images include Caddy and bind it to $PORT.
# Start HYNBET Node internally, then let Caddy own the public port.
if command -v caddy >/dev/null 2>&1; then
  echo "{\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"msg\":\"Caddy detected; Node on 127.0.0.1:8787, Caddy on 0.0.0.0:${PUBLIC_PORT}\"}"
  PORT=8787 HYNBET_BIND_PORT=8787 HOST=0.0.0.0 node server/src/index.js &
  NODE_PID=$!

  i=0
  while [ "$i" -lt 80 ]; do
    if wget -qO- "http://127.0.0.1:8787/api/health" >/dev/null 2>&1 \
      || curl -sf "http://127.0.0.1:8787/api/health" >/dev/null 2>&1; then
      break
    fi
    if ! kill -0 "$NODE_PID" 2>/dev/null; then
      echo "HYNBET Node process exited before becoming healthy" >&2
      exit 1
    fi
    i=$((i + 1))
    sleep 0.25
  done

  trap 'kill "$NODE_PID" 2>/dev/null || true' INT TERM EXIT
  PORT="$PUBLIC_PORT" exec caddy run --config ./Caddyfile --adapter caddyfile
fi

echo "{\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"msg\":\"No Caddy; Node binding 0.0.0.0:${PUBLIC_PORT}\"}"
HOST=0.0.0.0 exec node server/src/index.js
