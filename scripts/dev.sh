#!/bin/bash
set -e
cd "$(dirname "$0")/.."

# Load .env
set -a; source .env 2>/dev/null; set +a

# Start translation server
npx tsx tests/fixtures/simple-app/serve.ts &
SERVER_PID=$!
sleep 2

# Start vite from the fixture directory
cd tests/fixtures/simple-app
npx vite dev --port 5180

# Cleanup
kill $SERVER_PID 2>/dev/null
