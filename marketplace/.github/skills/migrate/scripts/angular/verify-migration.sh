#!/bin/bash
# Verify migration step succeeded — build + test + lint
# Usage: ./verify-migration.sh [step-name]

set -euo pipefail

STEP="${1:-migration}"

echo "## Verification: $STEP"
echo ""

# Detect workspace type
if [ -f "nx.json" ]; then
  BUILD_CMD="npx nx run-many --target=build --all"
  TEST_CMD="npx nx run-many --target=test --all --passWithNoTests"
  LINT_CMD="npx nx run-many --target=lint --all"
elif [ -f "angular.json" ]; then
  BUILD_CMD="npx ng build"
  TEST_CMD="npx ng test --watch=false --browsers=ChromeHeadless"
  LINT_CMD="npx ng lint"
else
  echo "No Angular workspace detected" >&2
  exit 1
fi

run_check() {
  local name="$1"
  local cmd="$2"
  echo -n "| $name | "
  if eval "$cmd" > /tmp/orch-verify-$name.log 2>&1; then
    echo "PASS |"
    return 0
  else
    echo "FAIL |"
    echo ""
    echo "### $name failure output (last 20 lines):"
    echo '```'
    tail -20 /tmp/orch-verify-$name.log
    echo '```'
    return 1
  fi
}

echo "| Check | Result |"
echo "|-------|--------|"

FAILED=0
run_check "Build" "$BUILD_CMD" || FAILED=$((FAILED + 1))
run_check "Test" "$TEST_CMD" || FAILED=$((FAILED + 1))
run_check "Lint" "$LINT_CMD" || FAILED=$((FAILED + 1))

echo ""
if [ "$FAILED" -eq 0 ]; then
  echo "**Verification: PASSED** — all checks passed for $STEP"
else
  echo "**Verification: FAILED** — $FAILED check(s) failed for $STEP"
  exit 1
fi
