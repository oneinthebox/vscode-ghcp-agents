---
name: angular-scan-arch
description: "Scan architecture: module graph, component tree, route map, service dependencies, Nx graph if available"
references: []
allowed-tools:
  - codebase
  - terminal
---

## Context

Reads the codebase directly to map the full Angular architecture — modules, components, routes, services, and their relationships. Detects standalone vs NgModule patterns, lazy-loaded routes, and service injection graphs. If the project is an Nx workspace, reads the Nx project graph for cross-project dependencies. This is a read-only planner skill — it never modifies files.

## Inputs

- "Scan architecture" — full architecture map of the project
- "Show me the component tree" — component hierarchy with parent-child relationships
- "Map the routes" — complete route configuration with lazy loading analysis
- "Show service dependencies" — injection graph for all services

## Steps

1. Read `angular.json` or `nx.json` to identify projects, apps, and libraries.
2. Scan `src/` (or app paths) for all `.component.ts`, `.module.ts`, `.service.ts`, `.directive.ts`, `.pipe.ts` files.
3. Parse component metadata: standalone flag, imports, providers, selector, changeDetection strategy.
4. Parse route configurations from `*routing*.ts`, `*.routes.ts`, and `app.config.ts` files.
5. Build the component tree: which components render which child components (from template selectors).
6. Build the service injection graph: which services inject which other services.
7. Identify module boundaries: which components belong to which modules (or are standalone).
8. If `nx.json` exists, read `nx graph --file=output.json` output or parse `project.json` files to map cross-project dependencies. Note: This command generates a temporary file. It is a read-only analysis step — the output file can be deleted after reading.
9. Generate Mermaid diagrams for module graph, component tree, and route map.
10. Produce the output report.

## Output

```markdown
## Architecture Scan — {project_name}

### Summary
- Components: {n} ({standalone_count} standalone, {module_count} in NgModules)
- Services: {n}
- Modules: {n}
- Routes: {n} ({lazy_count} lazy-loaded)
- Nx projects: {n} (if applicable)

### System Context (C4 Level 1)
Who uses this system and what external systems does it interact with?
```mermaid
graph TD
    User["{persona}"] -->|uses| App["{app_name}"]
    App -->|REST| API1["{backend_api}"]
    App -->|WebSocket| API2["{realtime_feed}"]
    App -->|auth| IDP["{identity_provider}"]
```

### Container Diagram (C4 Level 2)
What are the major containers (apps, services, databases, message queues)?
```mermaid
graph TD
    subgraph Frontend
        App1["{app1_name}\nAngular {version}"]
        App2["{app2_name}\nAngular {version}"]
    end
    subgraph Backend
        API["{api_name}\n{tech}"]
        WS["{realtime_name}\nWebSocket"]
    end
    subgraph Data
        DB[("{database}\n{type}")]
        Cache[("{cache}\n{type}")]
    end
    App1 --> API
    App1 --> WS
    App2 --> API
    API --> DB
    API --> Cache
    WS --> DB
```
Note: Infer containers from package.json scripts, proxy configs, environment files, docker-compose, and API call patterns in services.

### Module/Library Graph (Mermaid)
### Component Tree (Mermaid)
### Route Map
| Route | Component | Lazy? | Guards | Resolvers |

### Service Injection Graph
| Service | Injected In | Dependencies |

### Nx Project Graph (if applicable)
| Project | Type | Depends On |
```

## Validation

- All scanned files exist on disk
- Component counts match filesystem file counts
- Route map matches actual route configuration files
- Mermaid diagrams are syntactically valid
- No files are modified during the scan
