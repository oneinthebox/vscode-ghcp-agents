# Elevate Common Search — TEMPLATE

> **This is a placeholder template.** Replace the `<!-- ADD-HERE -->` markers
> with your organisation's actual TypeDoc/Storybook content. Keep under 500 lines.
>
> Populate from your org's doc server:
> `@docs /docs-fetch --source https://docs.internal.yourorg.com/elevate/common-search --target .orch/references/internal/elevate/common-search.md`

## Overview

The Common Search component provides a unified search experience across Elevate
applications. It wraps search input, query API, result rendering, and filtering
into a single reusable component with platform integration.

<!-- ADD-HERE: replace with your actual common-search overview -->

## Installation

```bash
npm install @yourorg/elevate-components/common-search
```

<!-- ADD-HERE: any additional install steps or peer dependencies -->

## Setup (Providers)

```typescript
import { ElevateSearchModule } from '@yourorg/elevate-components/common-search';

@Component({
  standalone: true,
  imports: [ElevateSearchModule],
  // ...
})
export class MyComponent {}
```

<!-- ADD-HERE: replace with your actual setup -->

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `ElevateSearchModule` | Module | Search component and directives |
| `ElevateSearchComponent` | Component | `<elevate-search>` element |
| `SearchService` | Service | Programmatic search API |
| `SearchResultEvent` | Interface | Emitted on result selection |
<!-- ADD-HERE: add remaining API surface -->

## Usage Examples

```html
<elevate-search
  [placeholder]="'Search trades...'"
  [sources]="['trades', 'positions', 'orders']"
  [debounceMs]="300"
  (resultSelect)="onResultSelect($event)"
  data-testid="global-search">
</elevate-search>
```

```typescript
@Component({ /* ... */ })
export class HeaderComponent {
  onResultSelect(event: SearchResultEvent): void {
    this.router.navigate([event.route]);
  }
}
```

<!-- ADD-HERE: replace with your actual usage examples -->

## Common Patterns

- Configure search sources to scope results per application context
- Use `debounceMs` to control API call frequency
- Handle `resultSelect` to navigate or display detail views
- Integrate with Elevate logging for search analytics

<!-- ADD-HERE: add org-specific patterns and best practices -->
