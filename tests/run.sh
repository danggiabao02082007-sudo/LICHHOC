#!/bin/bash
# Chạy lại từ CSDL trống rồi kiểm thử
cd "$(dirname "$0")/.." && npx supabase db reset >/dev/null 2>&1 || exit 1
eval "$(npx supabase status -o env 2>/dev/null | grep -E '^(ANON_KEY|SERVICE_ROLE_KEY)=' | sed 's/^/export /')"
node tests/portal.test.mjs | tail -1 && SB_ANON=$ANON_KEY SB_SERVICE=$SERVICE_ROLE_KEY node tests/db.test.mjs | tail -1
NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=${NODE_EXTRA_CA_CERTS:-/root/.ccr/ca-bundle.crt} SB_ANON=$ANON_KEY SB_SERVICE=$SERVICE_ROLE_KEY node tests/cron.test.mjs 2>&1 | grep -v -i "experimental\|trace-warnings"
