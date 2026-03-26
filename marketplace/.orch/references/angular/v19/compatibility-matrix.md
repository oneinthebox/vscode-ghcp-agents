# Compatibility Matrix
Source: Combined from angular.dev/reference/versions and nx.dev/docs/technologies/angular/guides/angular-nx-version-matrix
Last refreshed: 2026-03-24

## Core Angular Compatibility

| Angular | TypeScript | Node.js | RxJS | Nx (Recommended) | Nx Range |
|---|---|---|---|---|---|
| 21.0.x | >=5.9.0 <6.0.0 | 20.19+ / 22.12+ / 24.0+ | ^6.5.3 \|\| ^7.4.0 | latest | >=22.3.0 |
| 20.2-20.3 | >=5.8.0 <6.0.0 | 20.19+ / 22.12+ / 24.0+ | ^6.5.3 \|\| ^7.4.0 | latest | >=21.5.1 |
| 20.0-20.1 | >=5.8.0 <5.9.0 | 20.19+ / 22.12+ / 24.0+ | ^6.5.3 \|\| ^7.4.0 | latest | >=21.2.0 |
| 19.2.x | >=5.5.0 <5.9.0 | 18.19+ / 20.11+ / 22.0+ | ^6.5.3 \|\| ^7.4.0 | latest | >=20.5.0 |
| 19.0-19.1 | >=5.5.0 <5.8.0 | 18.19+ / 20.11+ / 22.0+ | ^6.5.3 \|\| ^7.4.0 | latest | >=20.2.0 |
| 18.0-18.2 | >=5.4.0 <5.6.0 | 18.13+ / 20.9+ | ^6.5.3 \|\| ^7.4.0 | ~22.2.0 | >=19.1.0 <22.3.0 |
| 17.0-17.3 | >=5.2.0 <5.5.0 | 18.13+ / 20.9+ | ^6.5.3 \|\| ^7.4.0 | ~21.1.0 | >=17.1.0 <21.2.0 |

## Version Status

| Angular | Status | Support Ends (approx.) |
|---|---|---|
| 21.x | Active | ~Dec 2027 |
| 20.x | Active | ~Jun 2027 |
| 19.x | LTS | ~Dec 2026 |
| 18.x | LTS | ~Jun 2026 |
| 17.x | End of Life | Dec 2025 |
| 16.x | End of Life | Jun 2025 |

Angular follows semver: major release every 6 months, 18 months total support (6 active + 12 LTS).

## Upgrade Dependency Map

| From -> To | TypeScript Change | Node.js Change | Breaking? |
|---|---|---|---|
| 17.x -> 18.x | 5.2 -> 5.4+ | No change | Low |
| 18.x -> 19.x | 5.4 -> 5.5+ | No change | Low |
| 19.x -> 20.x | 5.5 -> 5.8+ | **Node 18 dropped** (need 20+) | Medium |
| 20.x -> 21.x | 5.8 -> 5.9+ | No change | Low |

## Third-Party Library Compatibility

### Angular Material / CDK

| Angular | Material Version | Notes |
|---|---|---|
| 21.x | 21.x | Always match major version |
| 20.x | 20.x | Always match major version |
| 19.x | 19.x | Always match major version |
| 18.x | 18.x | MDC migration complete |
| 17.x | 17.x | MDC-based components default |

**Rule:** Angular Material major version always matches Angular major version.

### AG Grid

| AG Grid | Angular Support | Notes |
|---|---|---|
| 33.x | 17-21 | Current, standalone support |
| 32.x | 16-20 | Signals support added |
| 31.x | 15-19 | |
| 30.x | 14-18 | |

Check https://www.ag-grid.com/angular-data-grid/compatibility/ for latest.

### PrimeNG

| PrimeNG | Angular Support | Notes |
|---|---|---|
| 19.x | 19-21 | Standalone-first, signal inputs |
| 18.x | 18-20 | Standalone support |
| 17.x | 17-19 | |
| 16.x | 16-18 | |

**Rule:** PrimeNG major version roughly tracks Angular major version.

### NgRx

| NgRx | Angular Support | Notes |
|---|---|---|
| 19.x | 19-21 | SignalStore stable |
| 18.x | 18-20 | SignalStore introduced |
| 17.x | 17-19 | |
| 16.x | 16-18 | |

**Rule:** NgRx major version matches Angular major version.

### Plotly (angular-plotly.js)

| angular-plotly.js | Angular Support | Notes |
|---|---|---|
| 6.x | 18-21 | Standalone wrapper available |
| 5.x | 16-18 | |
| 4.x | 14-16 | |

Note: Plotly.js itself is framework-agnostic. The Angular wrapper version determines Angular compatibility.

### Other Common Libraries

| Library | Compatible With | Version Mapping |
|---|---|---|
| `@ngrx/store` | Angular N | Use NgRx N.x |
| `@angular/fire` | Angular N | Use major version matching N |
| `ngx-translate` | Angular 17-21 | v16+ for standalone |
| `@angular/cdk` | Angular N | Always matches Angular version |
| `tailwindcss` | Any Angular | Framework-agnostic |
| `eslint` (angular-eslint) | Angular N | Use matching major |

## Package Manager Compatibility

| Angular | npm | Yarn | pnpm |
|---|---|---|---|
| 19+ | >=9 | >=1.22 | >=8 |
| 17-18 | >=8 | >=1.22 | >=7 |

## Key Takeaways

- Always match Angular, Material, CDK, and NgRx major versions
- TypeScript version is pinned per Angular version; don't upgrade TS independently
- Node.js 18 dropped in Angular 20; plan Node upgrade accordingly
- Nx latest (v22.6+) supports Angular 19, 20, and 21
- Angular 18 requires Nx <22.3.0
- Use `ng update` for automated dependency resolution
- Third-party libs typically support current Angular +/- 2 major versions
