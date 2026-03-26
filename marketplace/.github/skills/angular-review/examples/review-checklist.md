<!-- Example output from /angular-review — see SKILL.md for usage -->
# Code Review: Trade Dashboard Feature

**PR:** #247 — Add trade dashboard with real-time price streaming
**Files reviewed:** 12 changed files (+480, -38)
**Review date:** 2026-03-25

---

## Security

- **[PASS]** `trade-form.component.ts:42` — User input is sanitized before interpolation into API URL.
- **[WARN]** `price-display.component.html:18` — Raw `innerHTML` binding detected. Use `[textContent]` or Angular's `DomSanitizer` if HTML is truly required.
- **[PASS]** No hardcoded tokens or credentials found in changeset.

## Performance

- **[FAIL]** `holdings-table.component.html:31` — `@for` loop missing `track` expression. Add `track holding.id` to prevent unnecessary DOM re-creation.
- **[PASS]** `fund-screener.component.ts:12` — Uses `ChangeDetectionStrategy.OnPush` correctly.
- **[WARN]** `market-data.service.ts:55` — `subscribePrices()` creates a new HTTP poll per call. Verify `shareReplay` is in the pipe to prevent duplicate streams when multiple components subscribe.
- **[PASS]** No new third-party dependencies added — bundle size unaffected.

## Angular Patterns

- **[PASS]** All new components are `standalone: true` with explicit `imports` arrays.
- **[PASS]** Signal-based state used throughout (`signal()`, `computed()`). No legacy `BehaviorSubject` patterns.
- **[FAIL]** `order.service.ts:8` — Uses constructor injection. Migrate to `inject()` function per ORCH conventions.
- **[PASS]** All services use `providedIn: 'root'`.
- **[WARN]** `portfolio.component.ts:29` — `@Input()` decorator found. Prefer `input()` signal function for consistency with the rest of the codebase.

## Testing

- **[FAIL]** `trade-execution.service.spec.ts` — No test for the retry behavior in `submitOrder()`. Add a test that verifies retry fires once on 500 before propagating the error.
- **[WARN]** `fund-screener.component.spec.ts` — Missing edge case: empty fund list. Add a test asserting the empty-state message renders.
- **[PASS]** `market-data.service.spec.ts` — Good coverage of success, error, and polling interval paths.

## Accessibility

- **[PASS]** `holdings-table.component.html:5` — Table uses `role="grid"` and `scope="col"` on headers.
- **[FAIL]** `trade-form.component.html:22` — Submit button has no `aria-label`. Screen readers will only see "Submit" — add context like `aria-label="Submit trade order"`.
- **[WARN]** `price-display.component.html:9` — Live price updates should use `aria-live="polite"` so assistive technology announces changes.

---

## Summary

| Category          | Pass | Warn | Fail |
|-------------------|------|------|------|
| Security          | 2    | 1    | 0    |
| Performance       | 2    | 1    | 1    |
| Angular Patterns  | 3    | 1    | 1    |
| Testing           | 1    | 1    | 1    |
| Accessibility     | 1    | 1    | 1    |
| **Total**         | **9**| **5**| **4**|

**Recommendation:** Request changes — 4 items must be resolved before merge.
