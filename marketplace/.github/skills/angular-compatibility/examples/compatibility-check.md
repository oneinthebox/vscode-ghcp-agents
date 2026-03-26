<!-- Example output from /angular-compatibility — see SKILL.md for usage -->
# Compatibility Check: Acme Trading Platform

**Generated:** 2026-03-25T14:30:00Z
**Target upgrade:** Angular 19.2.x

---

## Current Versions vs Compatibility Matrix

| Package              | Current  | Required     | Compatible | Notes                            |
|----------------------|----------|--------------|------------|----------------------------------|
| @angular/core        | 19.1.4   | 19.2.x       | YES        | Minor update only                |
| @angular/cli         | 19.1.4   | 19.2.x       | YES        | Minor update only                |
| typescript           | 5.6.3    | >= 5.6, < 5.8| YES        | Within supported range           |
| rxjs                 | 7.8.1    | >= 7.5        | YES        |                                  |
| zone.js              | 0.15.0   | >= 0.14       | YES        |                                  |
| @ngrx/store          | 18.1.1   | >= 18.0       | YES        |                                  |
| primeng              | 18.1.2   | >= 18.0       | YES        | PrimeNG 18.2 available with fixes|
| ag-grid-angular      | 32.3.2   | >= 32.0       | YES        | 32.4 available                   |
| @nx/angular          | 20.2.1   | >= 20.0       | YES        |                                  |
| jest                 | 29.7.0   | >= 29.5       | YES        |                                  |
| playwright           | 1.48.2   | >= 1.45       | YES        | 1.49 available                   |

---

## Incompatibilities Found

| Severity | Package           | Issue                                              | Resolution              |
|----------|-------------------|----------------------------------------------------|-------------------------|
| HIGH     | @angular-eslint   | v18.4.0 has peer dep on `@angular/core@^19.0.0 <19.2.0` | Upgrade to @angular-eslint v18.5.0+ |
| MEDIUM   | karma             | 6.4.4 — Angular 19.2 drops built-in Karma support | Already migrated to Jest; remove karma from devDependencies |
| LOW      | @types/jasmine    | 5.1.4 — Jasmine types conflict with Jest types     | Remove @types/jasmine (leftover from Karma migration) |

---

## Resolution Commands

```bash
# Fix HIGH: Upgrade angular-eslint to compatible version
npm install @angular-eslint/builder@18.5.0 @angular-eslint/eslint-plugin@18.5.0 @angular-eslint/eslint-plugin-template@18.5.0 @angular-eslint/schematics@18.5.0 @angular-eslint/template-parser@18.5.0 --save-dev

# Fix MEDIUM: Remove unused Karma packages
npm uninstall karma karma-chrome-launcher karma-coverage karma-jasmine karma-jasmine-html-reporter --save-dev

# Fix LOW: Remove conflicting Jasmine types
npm uninstall @types/jasmine --save-dev

# Then update Angular to 19.2
npx ng update @angular/core@19.2 @angular/cli@19.2
```

---

## Post-Update Verification

After running the resolution commands, verify compatibility:

```bash
npm run build          # Ensure production build succeeds
npm test               # Run full unit test suite
npm run lint           # Check for new ESLint violations
npm run e2e            # Run Playwright end-to-end suite
```

---

## Summary

- **11 of 11 core packages** are compatible with Angular 19.2.
- **3 issues found** (1 high, 1 medium, 1 low) — all resolvable with the commands above.
- Estimated upgrade effort: **15 minutes** including verification.
