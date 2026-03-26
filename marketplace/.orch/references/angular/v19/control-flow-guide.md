# Control Flow Guide
Source: https://angular.dev/guide/templates/control-flow
Last refreshed: 2026-03-24

## @if / @else if / @else

```html
@if (isLoggedIn()) {
  <app-dashboard />
} @else if (isLoading()) {
  <app-spinner />
} @else {
  <app-login />
}
```

### Saving expression result with `as`

```html
@if (user$ | async; as user) {
  <h1>{{ user.name }}</h1>
  <p>{{ user.email }}</p>
}

@if (computeExpensiveValue(); as value) {
  <p>Result: {{ value }}</p>
}
```

## @for with track

```html
@for (item of items(); track item.id) {
  <app-card [item]="item" />
} @empty {
  <p>No items found.</p>
}
```

### track Expression (Required)

| Expression | Use When | Performance |
|---|---|---|
| `track item.id` | Items have unique ID | Best |
| `track item.uuid` | Items have unique key | Best |
| `track $index` | Static/append-only lists | Good |
| `track item` | No unique key available | Poor (last resort) |

### Context Variables

| Variable | Type | Description |
|---|---|---|
| `$index` | `number` | Current iteration index |
| `$count` | `number` | Total collection length |
| `$first` | `boolean` | True for first item |
| `$last` | `boolean` | True for last item |
| `$even` | `boolean` | True for even indices |
| `$odd` | `boolean` | True for odd indices |

```html
@for (user of users(); track user.id; let i = $index, isLast = $last) {
  <div [class.border-bottom]="!isLast">
    {{ i + 1 }}. {{ user.name }}
  </div>
}
```

### @empty

Renders when the collection is empty:

```html
@for (result of searchResults(); track result.id) {
  <app-result-card [result]="result" />
} @empty {
  <div class="no-results">
    <p>No results match your search.</p>
  </div>
}
```

## @switch / @case / @default

```html
@switch (status()) {
  @case ('idle') {
    <p>Ready</p>
  }
  @case ('loading') {
    <app-spinner />
  }
  @case ('success') {
    <app-data [data]="data()" />
  }
  @case ('error') {
    <app-error [message]="error()" />
  }
  @default {
    <p>Unknown state</p>
  }
}
```

- Uses strict equality (`===`)
- No fallthrough (no `break` needed)
- Multiple `@case` can share a body:

```html
@switch (role()) {
  @case ('editor')
  @case ('reviewer') {
    <app-editor-view />
  }
  @case ('admin') {
    <app-admin-view />
  }
}
```

### Exhaustive type checking

```html
@switch (state()) {
  @case ('loggedIn') { <app-home /> }
  @case ('loggedOut') { <app-login /> }
  @default never;
}
```

`@default never;` causes compile error if a union type case is unhandled.

## @defer (Deferrable Views)

### Basic

```html
@defer {
  <heavy-component />
}
```

### With all blocks

```html
@defer (on viewport; prefetch on idle) {
  <heavy-chart [data]="chartData()" />
} @placeholder (minimum 200ms) {
  <div class="skeleton" style="height: 400px"></div>
} @loading (after 100ms; minimum 500ms) {
  <app-spinner />
} @error {
  <p>Failed to load component</p>
}
```

### Trigger Types

| Trigger | Fires When | Example |
|---|---|---|
| `on idle` | Browser idle (default) | `@defer (on idle)` |
| `on viewport` | Element enters viewport | `@defer (on viewport)` |
| `on viewport(ref)` | Referenced element enters viewport | `@defer (on viewport(myRef))` |
| `on interaction` | Click/keydown on placeholder | `@defer (on interaction)` |
| `on interaction(ref)` | Click/keydown on referenced element | `@defer (on interaction(btn))` |
| `on hover` | Mouseover/focusin on placeholder | `@defer (on hover)` |
| `on immediate` | After non-deferred content renders | `@defer (on immediate)` |
| `on timer(Xms)` | After duration | `@defer (on timer(2000ms))` |
| `when condition` | Expression becomes truthy | `@defer (when isVisible())` |

### Combining Triggers (OR logic)

```html
@defer (on viewport; on timer(5000ms)) {
  <lazy-section />
}
```

### Prefetching

```html
@defer (on interaction; prefetch on idle) {
  <heavy-form />
} @placeholder {
  <button>Open Form</button>
}
```

Prefetching downloads JS but doesn't render until trigger fires.

### Block Parameters

| Block | Parameter | Purpose |
|---|---|---|
| `@placeholder` | `minimum` | Min time to show placeholder |
| `@loading` | `after` | Delay before showing loading state |
| `@loading` | `minimum` | Min time to show loading state |

### Testing @defer

```typescript
TestBed.configureTestingModule({
  deferBlockBehavior: DeferBlockBehavior.Manual,
});

const fixture = TestBed.createComponent(MyComponent);
const deferBlock = (await fixture.getDeferBlocks())[0];

await deferBlock.render(DeferBlockState.Placeholder);
// assert placeholder content

await deferBlock.render(DeferBlockState.Loading);
// assert loading content

await deferBlock.render(DeferBlockState.Complete);
// assert loaded content
```

## Migration from Legacy Directives

| Legacy | Modern | Notes |
|---|---|---|
| `*ngIf="cond"` | `@if (cond) { }` | Cleaner, no import needed |
| `*ngIf="x; else tmpl"` | `@if (x) { } @else { }` | No ng-template needed |
| `*ngIf="obs$ \| async as val"` | `@if (obs$ \| async; as val) { }` | Same async pipe support |
| `*ngFor="let x of items; trackBy: fn"` | `@for (x of items; track x.id) { }` | track is inline, required |
| `[ngSwitch]` + `*ngSwitchCase` | `@switch` + `@case` | No host element needed |
| `<ng-template>` for else | `@else { }` | Inline, no separate template |

### Automated Migration

```bash
ng generate @angular/core:control-flow
```

This schematic converts `*ngIf`, `*ngFor`, and `ngSwitch` to the new syntax.

## Key Differences from Legacy

- No need to import `CommonModule`, `NgIf`, `NgFor`, `NgSwitch`
- `@for` requires `track` (performance enforced)
- `@for` provides `@empty` block (no equivalent in `*ngFor`)
- `@switch` uses strict equality, no fallthrough
- `@defer` has no legacy equivalent
- Control flow blocks don't create extra DOM elements
