# AG Grid — Angular Version Compatibility

Source: https://www.ag-grid.com/angular-data-grid/compatibility/
Last refreshed: 2026-03-27

---

## AG Grid ↔ Angular Compatibility Matrix

| Angular Version | Compatible AG Grid Versions |
|-----------------|----------------------------|
| 19–21 | 28–35+ |
| 18 | 28–35 |
| 17 | 28–34 |
| 16 | 28–32 |
| 14–15 | 25–31 |
| 12–13 | 25–30 |
| 10–11 | 24–27 |
| 9 | 23–27 |
| 8 | 18–27 |
| 6–7 | 18–22 |

## TypeScript Compatibility

| AG Grid Version | Minimum TypeScript |
|-----------------|--------------------|
| 35+ | >= 5.4.5 |
| 33–34 | >= 5.2.0 |
| 32 | >= 5.1.6 |
| 31 | >= 4.7.4 |
| 30 | >= 4.3.5 |
| 29 | >= 4.0.8 |
| 27–28 | >= 3.7.7 |
| 25–26 | >= 3.6.5 |

## Key Migration Notes

### v34 → v35
- TypeScript minimum bumped to 5.4.5
- Full compatibility with Angular 19–21
- Zoneless Angular support with no additional configuration
- Custom components must meet zoneless requirements

### v32 → v33
- TypeScript minimum bumped to 5.2.0
- Angular 17 upper bound
- Improved tree data and server-side row model

### v31 → v32
- TypeScript minimum bumped to 5.1.6
- Angular 16 upper bound
- Integrated Charts v10

### v28+ Breaking Changes
- `AgGridModule.withComponents()` removed — remove from module imports
- Ivy distribution only — View Engine no longer supported
- Zoneless Angular fully compatible (no extra config)

## Installation

```bash
npm install ag-grid-angular ag-grid-community
# For enterprise features:
npm install ag-grid-enterprise
```

## Angular Module Setup

```typescript
import { AgGridAngular } from 'ag-grid-angular';

@Component({
  standalone: true,
  imports: [AgGridAngular],
  template: `<ag-grid-angular [rowData]="rowData" [columnDefs]="columnDefs" />`
})
```
