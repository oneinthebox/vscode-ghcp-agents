<!-- Example output from /angular-migrate-version — see SKILL.md for usage -->
<!-- Upgrade plan: Angular 17 to 19 for a fintech trading platform -->

# Angular Upgrade Plan: v17 -> v19

**Project:** FX Trading Platform
**Current:** Angular 17.3.0 | TypeScript 5.2.2 | RxJS 7.8.1 | Zone.js 0.14.2
**Target:** Angular 19.x | TypeScript 5.6.x | RxJS 7.8.x | Zone.js 0.15.x

---

## Step 1: Angular 17 -> 18

### 1a. Pre-step dependency updates

| Package    | Current | Target | Command                          |
|------------|---------|--------|----------------------------------|
| TypeScript | 5.2.2   | 5.4.5  | `npm install typescript@5.4 -D`  |
| Zone.js    | 0.14.2  | 0.14.8 | `npm install zone.js@0.14`       |

```bash
npm install typescript@5.4 -D
npm install zone.js@0.14
ng build && ng test
git commit -m "migrate: pre-step — TypeScript 5.4, Zone.js 0.14.8"
```

### 1b. Angular core update

```bash
ng update @angular/core@18 @angular/cli@18
ng update @angular/cdk@18 @angular/material@18
ng build && ng test
git commit -m "migrate: Angular 18 core update"
```

### 1c. Third-party packages

| Package       | Current | Target | Notes                           |
|---------------|---------|--------|---------------------------------|
| @ngrx/store   | 17.1.0  | 18.0.0 | `ng update @ngrx/store@18`      |
| ag-grid       | 31.0.0  | 31.3.0 | Compatible with Angular 18      |
| primeng       | 17.6.0  | 17.18.0| Compatible, v18 available later |

### 1d. Breaking changes to address

- **Signal inputs/outputs now stable** — start adopting `input()` / `output()` in new code
- **Route redirects** — can now use functions instead of string-only redirects
- **Fallback content** — `<ng-content>` now supports default content
- Verify: no uses of removed `@angular/http` (removed in v15, but check transitive deps)

---

## Step 2: Angular 18 -> 19

### 2a. Pre-step dependency updates

| Package    | Current | Target | Command                          |
|------------|---------|--------|----------------------------------|
| TypeScript | 5.4.5   | 5.6.3  | `npm install typescript@5.6 -D`  |
| Zone.js    | 0.14.8  | 0.15.0 | `npm install zone.js@0.15`       |

```bash
npm install typescript@5.6 -D
npm install zone.js@0.15
ng build && ng test
git commit -m "migrate: pre-step — TypeScript 5.6, Zone.js 0.15"
```

### 2b. Angular core update

```bash
ng update @angular/core@19 @angular/cli@19
ng update @angular/cdk@19 @angular/material@19
ng build && ng test
git commit -m "migrate: Angular 19 core update"
```

### 2c. Third-party packages

| Package       | Current | Target | Notes                           |
|---------------|---------|--------|---------------------------------|
| @ngrx/store   | 18.0.0  | 19.0.0 | `ng update @ngrx/store@19`      |
| ag-grid       | 31.3.0  | 32.0.0 | Major bump, check changelog     |
| primeng       | 17.18.0 | 19.0.0 | Major bump, UI review needed    |

### 2d. Breaking changes to address

- **Standalone defaults everywhere** — new schematics generate standalone by default
- **Signal-based queries stable** — `viewChild()`, `viewChildren()`, `contentChild()`
- **linkedSignal()** — new primitive for derived-but-writable state
- **Incremental hydration** — experimental, opt-in only
- **Resource API** — experimental, for async data loading with signals

---

## Final verification checklist

- [ ] `ng build --configuration=production` passes
- [ ] All `ng test` specs pass (count >= pre-migration count)
- [ ] All e2e tests pass (`npx playwright test`)
- [ ] `ng version` shows Angular 19.x across all packages
- [ ] TypeScript 5.6.x confirmed
- [ ] No deprecated API warnings for APIs removed in v19
- [ ] CI pipeline green on migration branch
- [ ] Performance benchmarks within acceptable range
