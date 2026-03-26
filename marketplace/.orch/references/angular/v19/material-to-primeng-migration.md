# Angular Material to PrimeNG Migration Guide
Source: Curated from Angular Material and PrimeNG documentation
Last refreshed: 2026-03-25

## Component Mapping

| Angular Material | Import | PrimeNG | Import |
|-----------------|--------|---------|--------|
| `MatButton` / `mat-button` | `MatButtonModule` | `p-button` | `ButtonModule` |
| `MatDialog` / `mat-dialog` | `MatDialogModule` | `p-dialog` | `DialogModule` |
| `MatTable` / `mat-table` | `MatTableModule` | `p-table` | `TableModule` |
| `MatSelect` / `mat-select` | `MatSelectModule` | `p-select` | `SelectModule` |
| `MatInput` / `matInput` | `MatInputModule` | `pInputText` | `InputTextModule` |
| `MatDatepicker` / `mat-datepicker` | `MatDatepickerModule` | `p-datepicker` | `DatePickerModule` |
| `MatSnackBar` | `MatSnackBarModule` | `p-toast` | `ToastModule` |
| `MatMenu` / `mat-menu` | `MatMenuModule` | `p-menu` | `MenuModule` |
| `MatTabGroup` / `mat-tab-group` | `MatTabsModule` | `p-tabs` | `TabsModule` |
| `MatExpansionPanel` | `MatExpansionModule` | `p-accordion` | `AccordionModule` |
| `MatStepper` / `mat-stepper` | `MatStepperModule` | `p-stepper` | `StepperModule` |
| `MatChipListbox` | `MatChipsModule` | `p-chips` | `ChipsModule` |
| `MatAutocomplete` | `MatAutocompleteModule` | `p-autocomplete` | `AutoCompleteModule` |
| `MatPaginator` | `MatPaginatorModule` | `p-paginator` | `PaginatorModule` |
| `MatProgressBar` | `MatProgressBarModule` | `p-progressbar` | `ProgressBarModule` |
| `MatTooltip` / `matTooltip` | `MatTooltipModule` | `pTooltip` | `TooltipModule` |
| `MatBadge` / `matBadge` | `MatBadgeModule` | `p-badge` | `BadgeModule` |
| `MatSlideToggle` | `MatSlideToggleModule` | `p-toggleswitch` | `ToggleSwitchModule` |
| `MatRadioButton` | `MatRadioModule` | `p-radiobutton` | `RadioButtonModule` |
| `MatCheckbox` | `MatCheckboxModule` | `p-checkbox` | `CheckboxModule` |
| `MatSlider` | `MatSliderModule` | `p-slider` | `SliderModule` |
| `MatSidenav` | `MatSidenavModule` | `p-drawer` | `DrawerModule` |
| `MatToolbar` | `MatToolbarModule` | `p-toolbar` | `ToolbarModule` |
| `MatTree` | `MatTreeModule` | `p-tree` | `TreeModule` |
| `MatDivider` | `MatDividerModule` | `p-divider` | `DividerModule` |
| `MatCard` | `MatCardModule` | `p-card` | `CardModule` |

## Module Import Changes

### Angular Material (NgModule-based)
```typescript
// app.module.ts (legacy NgModule approach)
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';

@NgModule({
  imports: [MatButtonModule, MatDialogModule, MatTableModule]
})
```

### PrimeNG (Standalone imports - recommended for Angular v19)
```typescript
// component.ts (standalone)
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';

@Component({
  standalone: true,
  imports: [ButtonModule, DialogModule, TableModule]
})
```

### Package Installation Change
```bash
# Remove Material
npm uninstall @angular/material @angular/cdk

# Install PrimeNG
npm install primeng primeicons
# Optional: install PrimeFlex for grid/utility classes
npm install primeflex
```

## Theming Migration

| Aspect | Angular Material | PrimeNG |
|--------|-----------------|---------|
| Theme system | Material Design (M3) | Preset-based (Aura, Lara, Nora) |
| CSS approach | `@angular/material/prebuilt-themes` | `providePrimeNG({ theme: { preset } })` |
| Customization | `@use '@angular/material' as mat; mat.define-theme()` | `definePreset(Aura, { ... })` |
| Dark mode | Separate theme or `color-scheme` | Built-in `darkModeSelector` option |
| Typography | `mat.define-typography-config()` | CSS variables / preset tokens |
| Density | `mat.define-theme({ density: ... })` | Not applicable (use CSS) |

### Material Theme Setup (before)
```typescript
// styles.scss
@use '@angular/material' as mat;
$theme: mat.define-theme((
  color: (theme-type: light, primary: mat.$azure-palette)
));
html { @include mat.all-component-themes($theme); }
```

### PrimeNG Theme Setup (after)
```typescript
// app.config.ts
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';

export const appConfig = {
  providers: [
    providePrimeNG({
      theme: {
        preset: Aura,
        options: {
          darkModeSelector: '.dark-mode'
        }
      }
    })
  ]
};
```

### Available PrimeNG Presets

| Preset | Description |
|--------|-------------|
| **Aura** | Modern, clean design; closest to Material Design feel |
| **Lara** | Bootstrap-inspired; familiar to Bootstrap users |
| **Nora** | Compact, enterprise-focused design |

## Form Integration Differences

| Feature | Angular Material | PrimeNG |
|---------|-----------------|---------|
| Reactive Forms | `matInput` + `MatFormField` wrapping | Direct `formControlName` on PrimeNG component |
| Form field wrapper | `<mat-form-field>` required | Not required; use `<p-floatlabel>` optionally |
| Error messages | `<mat-error>` inside `mat-form-field` | Manual `*ngIf` or PrimeNG `<small class="p-error">` |
| Hint text | `<mat-hint>` | Manual `<small>` element |
| Prefix/suffix | `matPrefix` / `matSuffix` | `<p-inputgroup>` with `<p-inputgroup-addon>` |
| Label | `<mat-label>` | `<label>` or `<p-floatlabel>` |

### Form Field Before (Material)
```html
<mat-form-field>
  <mat-label>Name</mat-label>
  <input matInput formControlName="name">
  <mat-error *ngIf="form.get('name')?.hasError('required')">Required</mat-error>
</mat-form-field>
```

### Form Field After (PrimeNG)
```html
<p-floatlabel>
  <input pInputText id="name" formControlName="name" />
  <label for="name">Name</label>
</p-floatlabel>
<small class="p-error" *ngIf="form.get('name')?.hasError('required')">Required</small>
```

## Dialog / Snackbar Migration

### MatDialog to p-dialog

| MatDialog | PrimeNG Dialog |
|-----------|---------------|
| `MatDialog.open(Component, config)` | Template-based: `<p-dialog [(visible)]="show">` |
| `MatDialogRef.close(result)` | `(onHide)` event or two-way `visible` binding |
| `MAT_DIALOG_DATA` injection | `@Input()` properties on dialog component |
| Dynamic component loading | Use `DynamicDialogModule` + `DialogService` for dynamic |

### MatSnackBar to p-toast

| MatSnackBar | PrimeNG Toast |
|-------------|--------------|
| `snackBar.open(message, action)` | `messageService.add({ severity, summary, detail })` |
| Duration via `duration` option | Duration via `life` property (ms) |
| Position: limited | Position: `top-right`, `top-left`, `bottom-right`, `bottom-left`, `top-center`, `bottom-center`, `center` |

```typescript
// Before (Material)
this.snackBar.open('Saved!', 'Close', { duration: 3000 });

// After (PrimeNG)
this.messageService.add({
  severity: 'success', summary: 'Success', detail: 'Saved!', life: 3000
});
```

## Table Migration

| Feature | MatTable | PrimeNG Table |
|---------|----------|---------------|
| Data binding | `[dataSource]` | `[value]` |
| Column def | `matColumnDef` + `mat-header-cell` / `mat-cell` | `<ng-template pTemplate="header/body">` |
| Sorting | `matSort` + `mat-sort-header` | `pSortableColumn` + `<p-sortIcon>` |
| Pagination | Separate `<mat-paginator>` | Built-in `[paginator]="true"` + `[rows]` |
| Filtering | Manual | Built-in global/column filters |
| Selection | Manual with checkbox column | `selectionMode="single|multiple"` |
| Virtual scroll | `CdkVirtualScrollViewport` | `[virtualScroll]="true"` |
| Row expansion | Manual | Built-in `<ng-template pTemplate="rowexpansion">` |

## Common Gotchas and Breaking Changes

| Issue | Details |
|-------|---------|
| **No `mat-form-field` equivalent** | PrimeNG does not have a single form-field wrapper. Use `<p-floatlabel>`, `<p-iftalabel>`, or `<p-inputgroup>` as needed. Error display is manual. |
| **CDK dependency removed** | Angular Material relies on `@angular/cdk`. PrimeNG has no CDK dependency. Remove CDK imports if no longer needed. |
| **Overlay strategy differs** | Material uses CDK overlay. PrimeNG uses its own Overlay API (`providePrimeNG` config). Z-index and positioning may need adjustment. |
| **Animation system** | Material uses `@angular/animations`. PrimeNG uses CSS animations by default. Remove `BrowserAnimationsModule` if no other library needs it, or keep it -- PrimeNG ignores it. |
| **Icon migration** | Material uses `<mat-icon>` with Material Icons font. PrimeNG uses `<i class="pi pi-*">` with PrimeIcons. Add `primeicons/primeicons.css` to styles. |
| **Theming CSS variables** | Material M3 uses `--mat-*` tokens. PrimeNG uses `--p-*` tokens. Custom styles referencing Material tokens must be updated. |
| **Dialog return values** | Material `MatDialogRef.afterClosed()` returns observable. PrimeNG `DynamicDialogRef.onClose` is also observable but API differs. Template-based dialogs use event binding. |
| **Snackbar to Toast** | Toast requires `<p-toast>` in the template AND `MessageService` provided. Easy to forget one of these. |
| **Table column definition** | Material uses structural directives (`matColumnDef`). PrimeNG uses `ng-template` with `pTemplate`. Complete rewrite of table templates required. |
| **DatePicker locale** | Material uses `MAT_DATE_LOCALE` + adapters. PrimeNG uses `providePrimeNG({ locale: {...} })` configuration. |
| **Standalone imports** | In Angular v19 with standalone components, import PrimeNG modules directly in `@Component.imports`. No need for a shared module. |
