# PrimeNG Angular Guide
Source: https://primeng.org/installation
Last refreshed: 2026-03-24

## Installation

```bash
npm install primeng @primeng/themes
npm install primeicons        # icon library
npm install primeflex         # optional CSS utility
```

## App Configuration (Standalone)

```typescript
// app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';

export const appConfig: ApplicationConfig = {
  providers: [
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset: Aura,
        options: {
          darkModeSelector: '.dark-mode',
        },
      },
    }),
  ],
};
```

## Global Styles (styles.scss)

```scss
@import "primeicons/primeicons.css";
@import "primeflex/primeflex.css";   // optional grid utility
```

## Theming

### Built-in Theme Presets

| Preset | Import | Style |
|--------|--------|-------|
| Aura | `@primeng/themes/aura` | Modern, default |
| Lara | `@primeng/themes/lara` | Clean, Bootstrap-like |
| Nora | `@primeng/themes/nora` | Enterprise |
| Material | `@primeng/themes/material` | Material Design |

### Custom Theme

```typescript
import { definePreset } from '@primeng/themes';
import Aura from '@primeng/themes/aura';

const MyPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#f0f9ff',
      100: '#e0f2fe',
      // ...50-950 palette
      500: '#0ea5e9',
      900: '#0c4a6e',
      950: '#082f49',
    },
  },
});

providePrimeNG({
  theme: {
    preset: MyPreset,
  },
});
```

## Component Reference

### Table (p-table)

```typescript
import { TableModule } from 'primeng/table';

@Component({
  standalone: true,
  imports: [TableModule],
  template: `
    <p-table
      [value]="products"
      [paginator]="true"
      [rows]="10"
      [rowsPerPageOptions]="[10, 25, 50]"
      [sortField]="'name'"
      [sortOrder]="1"
      [globalFilterFields]="['name', 'category']"
      [tableStyle]="{ 'min-width': '50rem' }"
    >
      <ng-template #header>
        <tr>
          <th pSortableColumn="name">Name <p-sortIcon field="name" /></th>
          <th pSortableColumn="price">Price <p-sortIcon field="price" /></th>
          <th>Category</th>
          <th>Actions</th>
        </tr>
        <tr>
          <th><p-columnFilter type="text" field="name" /></th>
          <th><p-columnFilter type="numeric" field="price" /></th>
          <th><p-columnFilter type="text" field="category" /></th>
          <th></th>
        </tr>
      </ng-template>
      <ng-template #body let-product>
        <tr>
          <td>{{ product.name }}</td>
          <td>{{ product.price | currency }}</td>
          <td>{{ product.category }}</td>
          <td><button pButton label="Edit" (click)="edit(product)"></button></td>
        </tr>
      </ng-template>
    </p-table>
  `,
})
```

### Dialog

```typescript
import { DialogModule } from 'primeng/dialog';

@Component({
  standalone: true,
  imports: [DialogModule, ButtonModule],
  template: `
    <p-button label="Open" (click)="visible = true" />
    <p-dialog
      header="Edit Item"
      [(visible)]="visible"
      [modal]="true"
      [style]="{ width: '450px' }"
      [draggable]="false"
    >
      <p>Dialog content here</p>
      <ng-template #footer>
        <p-button label="Cancel" severity="secondary" (click)="visible = false" />
        <p-button label="Save" (click)="save()" />
      </ng-template>
    </p-dialog>
  `,
})
export class MyComponent {
  visible = false;
}
```

### Dropdown (Select)

```typescript
import { SelectModule } from 'primeng/select';

@Component({
  standalone: true,
  imports: [SelectModule, ReactiveFormsModule],
  template: `
    <p-select
      [options]="cities"
      [formControl]="selectedCity"
      optionLabel="name"
      optionValue="code"
      placeholder="Select a City"
      [showClear]="true"
      [filter]="true"
    />
  `,
})
export class MyComponent {
  selectedCity = new FormControl('');
  cities = [
    { name: 'New York', code: 'NY' },
    { name: 'London', code: 'LDN' },
    { name: 'Tokyo', code: 'TKY' },
  ];
}
```

### Calendar (DatePicker)

```typescript
import { DatePickerModule } from 'primeng/datepicker';

@Component({
  standalone: true,
  imports: [DatePickerModule, ReactiveFormsModule],
  template: `
    <p-datepicker
      [formControl]="date"
      [showIcon]="true"
      [showButtonBar]="true"
      dateFormat="mm/dd/yy"
      [minDate]="minDate"
      [maxDate]="maxDate"
      [selectionMode]="'range'"
    />
  `,
})
export class MyComponent {
  date = new FormControl<Date | null>(null);
  minDate = new Date(2024, 0, 1);
  maxDate = new Date(2026, 11, 31);
}
```

### InputText

```typescript
import { InputTextModule } from 'primeng/inputtext';
import { FloatLabelModule } from 'primeng/floatlabel';

@Component({
  standalone: true,
  imports: [InputTextModule, FloatLabelModule, ReactiveFormsModule],
  template: `
    <p-floatlabel>
      <input pInputText id="name" [formControl]="name" />
      <label for="name">Full Name</label>
    </p-floatlabel>
  `,
})
```

### Button

```typescript
import { ButtonModule } from 'primeng/button';

// Severities: primary, secondary, success, info, warn, danger, help, contrast
// Variants: text, outlined, link
@Component({
  standalone: true,
  imports: [ButtonModule],
  template: `
    <p-button label="Submit" icon="pi pi-check" (click)="submit()" />
    <p-button label="Cancel" severity="secondary" [outlined]="true" />
    <p-button icon="pi pi-trash" severity="danger" [rounded]="true" [text]="true" />
    <p-button label="Loading" [loading]="isLoading" />
  `,
})
```

### Toast

```typescript
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

@Component({
  standalone: true,
  imports: [ToastModule],
  providers: [MessageService],
  template: `
    <p-toast position="top-right" />
    <p-button label="Show" (click)="showToast()" />
  `,
})
export class MyComponent {
  constructor(private messageService: MessageService) {}

  showToast() {
    this.messageService.add({
      severity: 'success',  // success | info | warn | error
      summary: 'Success',
      detail: 'Record saved',
      life: 3000,
    });
  }
}
```

### ConfirmDialog

```typescript
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';

@Component({
  standalone: true,
  imports: [ConfirmDialogModule, ButtonModule],
  providers: [ConfirmationService],
  template: `
    <p-confirmDialog />
    <p-button label="Delete" severity="danger" (click)="confirmDelete()" />
  `,
})
export class MyComponent {
  constructor(private confirmationService: ConfirmationService) {}

  confirmDelete() {
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete?',
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.delete(),
      reject: () => {},
    });
  }
}
```

## Reactive Forms Integration

```typescript
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';

@Component({
  standalone: true,
  imports: [
    ReactiveFormsModule,
    InputTextModule,
    SelectModule,
    DatePickerModule,
    InputNumberModule,
    ButtonModule,
  ],
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()">
      <div class="field">
        <label for="name">Name</label>
        <input pInputText id="name" formControlName="name" />
        @if (form.get('name')?.invalid && form.get('name')?.touched) {
          <small class="p-error">Name is required</small>
        }
      </div>

      <div class="field">
        <label for="category">Category</label>
        <p-select
          id="category"
          formControlName="category"
          [options]="categories"
          optionLabel="label"
          optionValue="value"
        />
      </div>

      <div class="field">
        <label for="price">Price</label>
        <p-inputnumber
          id="price"
          formControlName="price"
          mode="currency"
          currency="USD"
        />
      </div>

      <div class="field">
        <label for="date">Date</label>
        <p-datepicker id="date" formControlName="date" />
      </div>

      <p-button type="submit" label="Save" [disabled]="form.invalid" />
    </form>
  `,
})
export class FormComponent {
  categories = [
    { label: 'Electronics', value: 'electronics' },
    { label: 'Clothing', value: 'clothing' },
  ];

  form = new FormGroup({
    name: new FormControl('', Validators.required),
    category: new FormControl('', Validators.required),
    price: new FormControl<number | null>(null, [Validators.required, Validators.min(0)]),
    date: new FormControl<Date | null>(null),
  });

  onSubmit() {
    if (this.form.valid) {
      console.log(this.form.value);
    }
  }
}
```

## PrimeFlex Grid System

```html
<!-- 12-column responsive grid -->
<div class="grid">
  <div class="col-12 md:col-6 lg:col-4">Column 1</div>
  <div class="col-12 md:col-6 lg:col-4">Column 2</div>
  <div class="col-12 md:col-12 lg:col-4">Column 3</div>
</div>

<!-- Flex utilities -->
<div class="flex justify-content-between align-items-center">
  <span>Left</span>
  <span>Right</span>
</div>

<!-- Spacing: p-{size}, m-{size}, gap-{size} -->
<div class="p-4 m-2 gap-3 flex">
  <p-button label="A" />
  <p-button label="B" />
</div>
```

### Common PrimeFlex Classes

| Category | Classes |
|----------|---------|
| Display | `flex`, `block`, `hidden`, `inline-flex` |
| Direction | `flex-row`, `flex-column`, `flex-wrap` |
| Justify | `justify-content-start`, `-center`, `-between`, `-end`, `-around` |
| Align | `align-items-start`, `-center`, `-end`, `-stretch` |
| Grid | `grid`, `col-{1-12}`, `md:col-{n}`, `lg:col-{n}` |
| Spacing | `p-{0-6}`, `m-{0-6}`, `gap-{0-6}`, `pt-{n}`, `mb-{n}` |
| Text | `text-center`, `text-right`, `font-bold`, `text-xl` |
| Colors | `text-primary`, `bg-primary`, `surface-ground` |

## Commonly Used PrimeIcons

| Icon | Class | Usage |
|------|-------|-------|
| Check | `pi pi-check` | Confirm/save |
| Times | `pi pi-times` | Close/cancel |
| Pencil | `pi pi-pencil` | Edit |
| Trash | `pi pi-trash` | Delete |
| Plus | `pi pi-plus` | Add |
| Search | `pi pi-search` | Search |
| Filter | `pi pi-filter` | Filter |
| Download | `pi pi-download` | Export |
| Upload | `pi pi-upload` | Import |
| Spinner | `pi pi-spin pi-spinner` | Loading |
