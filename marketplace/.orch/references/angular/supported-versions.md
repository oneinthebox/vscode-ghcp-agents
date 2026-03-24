# Angular Actively Supported Versions

Source: https://angular.dev/reference/versions
Last refreshed: 2026-03-24

## Currently Supported Versions

| Angular | Status | TypeScript | Node.js | RxJS |
|---|---|---|---|---|
| 21.0.x | Active | >=5.9.0 <6.0.0 | ^20.19.0 \|\| ^22.12.0 \|\| ^24.0.0 | ^6.5.3 \|\| ^7.4.0 |
| 20.2-20.3 | Active | >=5.8.0 <6.0.0 | ^20.19.0 \|\| ^22.12.0 \|\| ^24.0.0 | ^6.5.3 \|\| ^7.4.0 |
| 20.0-20.1 | Active | >=5.8.0 <5.9.0 | ^20.19.0 \|\| ^22.12.0 \|\| ^24.0.0 | ^6.5.3 \|\| ^7.4.0 |
| 19.2.x | Active | >=5.5.0 <5.9.0 | ^18.19.1 \|\| ^20.11.1 \|\| ^22.0.0 | ^6.5.3 \|\| ^7.4.0 |
| 19.0-19.1 | Active | >=5.5.0 <5.8.0 | ^18.19.1 \|\| ^20.11.1 \|\| ^22.0.0 | ^6.5.3 \|\| ^7.4.0 |

## TypeScript Compatibility Summary

| Angular | Min TypeScript | Max TypeScript |
|---|---|---|
| 21.x | 5.9.0 | <6.0.0 |
| 20.x | 5.8.0 | <6.0.0 |
| 19.x | 5.5.0 | <5.9.0 |
| 18.x | 5.4.0 | <5.6.0 |
| 17.x | 5.2.0 | <5.5.0 |

## Node.js Compatibility Summary

| Angular | Supported Node.js |
|---|---|
| 21.x, 20.x | 20.19+, 22.12+, 24.0+ |
| 19.x | 18.19+, 20.11+, 22.0+ |
| 18.x | 18.13+, 20.9+ |
| 17.x | 18.13+, 20.9+ |

## Upgrade Decision Guide

| Current | Target | TypeScript Change | Node.js Change | Risk |
|---|---|---|---|---|
| 19.x → 20.x | 20.3 | 5.5 → 5.8+ | 18.x → 20.x+ (Node 18 dropped) | Medium — Node upgrade required |
| 20.x → 21.x | 21.0 | 5.8 → 5.9+ | No change | Low — minor TS bump |
| 18.x → 19.x | 19.2 | 5.4 → 5.5+ | No change | Low |
| 17.x → 18.x | 18.2 | 5.2 → 5.4+ | No change | Low |

## Key Facts

- Angular follows semver: major releases every 6 months
- Each major version is supported for 18 months (6 active + 12 LTS)
- LTS only receives critical fixes and security patches
- TypeScript support is pinned per Angular version — check before upgrading TS independently
