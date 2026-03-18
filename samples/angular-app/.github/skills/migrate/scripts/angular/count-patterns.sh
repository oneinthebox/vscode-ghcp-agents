#!/bin/bash
# Count Angular patterns in a codebase for migration planning
# Usage: ./count-patterns.sh [src-path]

set -euo pipefail

SRC="${1:-src}"

if [ ! -d "$SRC" ]; then
  echo "Source directory not found: $SRC" >&2
  exit 1
fi

echo "## Pattern Inventory"
echo ""
echo "| Pattern (old) | Count | Pattern (new) | Migration |"
echo "|--------------|-------|---------------|-----------|"

count_pattern() {
  local label="$1"
  local pattern="$2"
  local glob="$3"
  local new_label="$4"
  local migration="$5"
  local count
  count=$(grep -rl "$pattern" "$SRC" --include="$glob" 2>/dev/null | wc -l | tr -d ' ')
  echo "| $label | $count | $new_label | $migration |"
}

# Component architecture
count_pattern "NgModule declarations" "@NgModule" "*.ts" "standalone: true" "/migrate standalone"
count_pattern "Constructor injection" "constructor(" "*.ts" "inject() function" "/migrate inject"

# Templates
count_pattern "*ngIf" "\\*ngIf" "*.html" "@if" "/migrate control-flow"
count_pattern "*ngFor" "\\*ngFor" "*.html" "@for" "/migrate control-flow"
count_pattern "*ngSwitch" "\\*ngSwitch" "*.html" "@switch" "/migrate control-flow"

# RxJS
count_pattern "Manual .subscribe()" "\\.subscribe(" "*.component.ts" "async pipe / signals" "/refactor"
count_pattern "Nested subscribes" "\\.subscribe(.*subscribe" "*.ts" "switchMap/concatMap" "/refactor"

# Signals
count_pattern "@Input() decorator" "@Input()" "*.ts" "input() signal" "/migrate signals"
count_pattern "@Output() decorator" "@Output()" "*.ts" "output() function" "/migrate signals"

# Testing
count_pattern "Karma config files" "karma" "karma.conf.*" "Jest config" "/migrate jest"
count_pattern "Cypress config files" "cypress" "cypress.config.*" "Playwright config" "/migrate playwright"

# Anti-patterns
echo ""
echo "## Anti-Patterns Found"
echo ""
echo "| Anti-pattern | Count | Severity |"
echo "|-------------|-------|----------|"

count_anti() {
  local label="$1"
  local pattern="$2"
  local glob="$3"
  local severity="$4"
  local count
  count=$(grep -rl "$pattern" "$SRC" --include="$glob" 2>/dev/null | wc -l | tr -d ' ')
  echo "| $label | $count | $severity |"
}

count_anti "any type" ": any" "*.ts" "Warning"
count_anti "console.log" "console.log" "*.ts" "Warning"
count_anti "Hardcoded URLs" "https://" "*.service.ts" "Warning"
count_anti "localStorage" "localStorage" "*.ts" "Warning"
count_anti "!important" "!important" "*.scss" "Warning"
count_anti "Hardcoded colors" "#[0-9a-fA-F]" "*.scss" "Warning"
