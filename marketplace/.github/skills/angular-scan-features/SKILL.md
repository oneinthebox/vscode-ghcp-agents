---
name: angular-scan-features
description: "Scan functional inventory: feature map, route-to-component mapping, and API surface"
---

## Context

Produces a functional map of the application — what features exist, how they are accessed (routes), which components implement them, and what external APIs they consume. This is a business-level view of the codebase, complementing the technical architecture scan. This is a read-only planner skill — it never modifies files.

## Inputs

- "Scan features" — full functional inventory
- "Map routes to components" — route-to-component mapping with feature grouping
- "What APIs does this app call?" — external API surface inventory
- "List all features" — feature map grouped by domain

## Steps

1. Scan route configuration files (`*.routes.ts`, `*routing*.ts`, `app.config.ts`):
   - Map every route path to its component
   - Identify lazy-loaded feature boundaries
   - Detect route guards, resolvers, and redirects
2. Group routes into feature areas:
   - By top-level route segment (e.g., `/dashboard/*`, `/settings/*`)
   - By lazy-loaded module/component boundary
   - By directory structure (`features/`, `pages/`, `modules/`)
3. Scan for external API calls:
   - Find all `HttpClient` usage (`get`, `post`, `put`, `delete`, `patch`)
   - Extract URL patterns and map to API endpoints
   - Identify which services make which API calls
4. Identify UI feature inventory:
   - Forms: reactive forms, template-driven forms, form groups
   - Data grids: AG Grid, PrimeNG Table, Material Table instances
   - Charts: Chart.js, Plotly, D3 instances
   - Dialogs/modals: Material Dialog, PrimeNG Dialog usage
5. Map feature-to-component relationships:
   - Which components belong to which feature area
   - Shared components used across multiple features
6. Detect feature flags or conditional features (environment-based, config-based).
7. Produce the output report.

## Output

```markdown
## Feature Scan — {project_name}

### Summary
- Feature areas: {n}
- Routes: {n}
- API endpoints consumed: {n}
- Shared components: {n}

### Feature Map
| Feature Area | Routes | Components | Services | API Endpoints |

### Route-to-Component Map
| Route | Component | Lazy? | Guards | Feature Area |

### External API Surface
| Endpoint | Method | Called By | Feature Area |

### UI Feature Inventory
| Type | Count | Locations |
|------|-------|-----------|
| Forms | {n} | {components} |
| Data grids | {n} | {components} |
| Charts | {n} | {components} |
| Dialogs | {n} | {components} |

### Shared Components
| Component | Used By Features | Usage Count |
```

## Validation

- Route map matches actual route configuration files
- API endpoints are extracted from real HttpClient calls, not guessed
- Feature groupings reflect actual directory and route structure
- Component counts match actual files on disk
- No files are modified during the scan
