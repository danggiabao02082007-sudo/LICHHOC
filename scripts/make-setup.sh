#!/bin/bash
# Gộp các migration thành 1 file để dán vào Supabase → SQL Editor
cd "$(dirname "$0")/.." && { echo "-- LICHHOC: dán toàn bộ file này vào Supabase → SQL Editor → Run (chạy 1 lần trên project mới)"; echo; for f in supabase/migrations/*.sql; do echo "-- ===== $(basename "$f") ====="; cat "$f"; echo; done; } > supabase/setup.sql
