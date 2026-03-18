#!/bin/bash
# Detect Angular and related library versions from package.json
# Usage: ./detect-version.sh [path-to-package.json]

set -euo pipefail

PKG="${1:-package.json}"

if [ ! -f "$PKG" ]; then
  echo "package.json not found at: $PKG" >&2
  exit 1
fi

echo "## Version Detection"
echo ""
echo "| Package | Version |"
echo "|---------|---------|"

extract_version() {
  local pkg="$1"
  local version
  version=$(jq -r ".dependencies[\"$pkg\"] // .devDependencies[\"$pkg\"] // \"not installed\"" "$PKG" 2>/dev/null)
  echo "| $pkg | $version |"
}

# Core
extract_version "@angular/core"
extract_version "@angular/cli"
extract_version "typescript"
extract_version "rxjs"
extract_version "zone.js"

# UI Libraries
extract_version "@angular/material"
extract_version "primeng"
extract_version "ag-grid-angular"
extract_version "angular-plotly.js"

# Internal
extract_version "@yourorg/elevate"
extract_version "@yourorg/elevate-common"
extract_version "@yourorg/hds"

# Interop
extract_version "@interopio/ng"
extract_version "@glue42/ng"

# Build/Test
extract_version "@nx/angular"
extract_version "jest"
extract_version "jest-preset-angular"
extract_version "@playwright/test"
extract_version "cypress"
extract_version "karma"

# Node
echo ""
echo "| Runtime | Version |"
echo "|---------|---------|"
echo "| Node.js | $(node --version 2>/dev/null || echo 'not found') |"
echo "| npm | $(npm --version 2>/dev/null || echo 'not found') |"
echo "| nx | $(npx nx --version 2>/dev/null || echo 'not found') |"
