# Elevate Common Dialog Service API — TEMPLATE

> **This is a placeholder template.** Replace the `<!-- ADD-HERE -->` markers
> with your organisation's actual Common Dialog service API. Keep under 500 lines.

## Setup

```typescript
import { ElevateDialogModule } from '@yourorg/elevate-common/dialog';

@NgModule({
  imports: [
    ElevateDialogModule.forRoot({
      defaultWidth: '500px',
      closeOnBackdropClick: true,
    }),
  ],
})
export class AppModule {}
```

<!-- ADD-HERE: replace with your actual dialog module setup -->

## ElevateDialogService API

| Method | Params | Returns | Description |
|--------|--------|---------|-------------|
| `open(component, config)` | `component: Type<T>, config?: DialogConfig` | `DialogRef<T>` | Open a dialog with the given component |
| `confirm(message, options)` | `message: string, options?: ConfirmOptions` | `Observable<boolean>` | Show a confirmation dialog |
| `alert(message, options)` | `message: string, options?: AlertOptions` | `Observable<void>` | Show an alert dialog |
| `closeAll()` | — | `void` | Close all open dialogs |
<!-- ADD-HERE: add remaining methods -->

## Dialog Configuration

```typescript
// Open a custom dialog component
const ref = this.dialog.open(TradeConfirmDialogComponent, {
  data: { trade: selectedTrade },
  width: '600px',
  disableClose: true,
});

ref.afterClosed().subscribe(result => {
  if (result?.confirmed) {
    this.executeTrade(result.trade);
  }
});
```

<!-- ADD-HERE: replace with your actual dialog configuration and usage -->

## Built-in Dialogs

```typescript
// Confirmation dialog
this.dialog.confirm('Are you sure you want to cancel this trade?', {
  title: 'Cancel Trade',
  confirmText: 'Yes, Cancel',
  cancelText: 'No, Keep',
}).subscribe(confirmed => { /* handle result */ });
```

<!-- ADD-HERE: describe built-in dialog types, theming, accessibility features -->
