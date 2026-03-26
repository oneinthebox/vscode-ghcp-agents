# Angular Update Guide
Source: https://angular.dev/update-guide
Last refreshed: 2026-03-25

## Overview

The Angular Update Guide is an interactive tool at https://angular.dev/update-guide that generates personalized upgrade recommendations based on your configuration.

### Configuration Options

| Parameter | Options |
|---|---|
| Angular Versions | Select from/to version (e.g., v16 to v21) |
| App Complexity | Basic, Medium, Advanced |
| Dependencies | ngUpgrade, Angular Material, Windows platform |

> **Note:** Plans for releases after the current major release are not finalized and may change. Recommendations are based on scheduled deprecations.

## Version-by-Version Upgrade Commands

| Upgrade Path | Command |
|---|---|
| Any to latest | `ng update @angular/core @angular/cli` |
| To specific version | `ng update @angular/core@{VER} @angular/cli@{VER}` |
| With Angular Material | `ng update @angular/core @angular/cli @angular/material` |
| With Nx | `npx nx migrate latest && npx nx migrate --run-migrations` |

## Upgrade Matrix

| From | To | Node.js Min | TypeScript | Key Changes |
|---|---|---|---|---|
| v16 | v17 | 18.13+ | 5.2+ | Control flow syntax, deferrable views, standalone default |
| v17 | v18 | 18.13+ | 5.4+ | Signal inputs/outputs/queries, zoneless (experimental), M3 default |
| v18 | v19 | 18.19.1+ | 5.5-5.7 | linkedSignal, resource(), standalone implicit, HMR default |
| v19 | v20 | 20.19+ | 5.8 | Node 18 dropped, zoneless stable, Vitest, CanLoad removed |
| v20 | v21 | 20.19+ | 5.9 | httpResource stable, signal components, decorator deprecations |

## Automatic Migrations by Version

### v16 to v17

| Migration | Runs Automatically | Manual Command |
|---|---|---|
| Control flow syntax | No | `ng g @angular/core:control-flow` |

### v17 to v18

| Migration | Runs Automatically | Manual Command |
|---|---|---|
| Signal inputs | No | `ng g @angular/core:signal-input-migration` |
| Signal queries | No | `ng g @angular/core:signal-queries-migration` |
| Output migration | No | `ng g @angular/core:output-migration` |

### v18 to v19

| Migration | Runs Automatically | Manual Command |
|---|---|---|
| Remove explicit `standalone: true` | Yes | Included in `ng update` |
| Add `standalone: false` where needed | Yes | Included in `ng update` |

### v19 to v20

| Migration | Runs Automatically | Manual Command |
|---|---|---|
| CanLoad to canMatch | Yes | Included in `ng update` |
| Various signal migrations | Some | Run `ng migrate` commands individually |

### v20 to v21

| Migration | Runs Automatically | Manual Command |
|---|---|---|
| Signal migrations | Some | Run `ng migrate` commands individually |
| inject() migration | No | `ng migrate inject-function` |

## Step-by-Step Upgrade Process

### 1. Preparation

```bash
ng version              # Check current versions
git status              # Check state (dirty git is not a blocker — warn only)
ng build                # Verify build works
ng test --no-watch      # Verify tests pass
```

### 2. Update

```bash
ng update @angular/core @angular/cli
ng update @angular/material    # If using Material
ng update @angular/cdk         # If using CDK
```

### 3. Run Manual Migrations

```bash
ng migrate standalone
ng migrate control-flow
ng migrate inject-function
ng migrate signal-inputs
ng migrate signal-queries
ng migrate outputs
ng migrate route-lazy-loading
ng migrate cleanup-unused-imports
```

### 4. Verify

```bash
ng build
ng test --no-watch
ng lint
ng e2e
```

## Common Issues

| Issue | Solution |
|---|---|
| TS version mismatch | Install exact TS version required by target Angular version |
| Peer dependency conflicts | Use `--force` cautiously, or align all package versions |
| NgModule not found | May have been removed by standalone migration; check imports |
| Template parse errors | Run control-flow migration schematic |
| Missing imports in standalone | Standalone components need explicit imports for all dependencies |
| Zone.js errors after v20 | Ensure zone.js is in polyfills if not using zoneless |
| Test failures | Update TestBed: use `imports` instead of `declarations` |
