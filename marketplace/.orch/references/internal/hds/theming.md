# HDS Theming (Light / Dark Mode) — TEMPLATE

> **This is a placeholder template.** Replace the `<!-- ADD-HERE -->` markers
> with your organisation's actual theming setup. Keep under 500 lines.

## Theme Provider Setup

```typescript
// Example: how to wrap your app with the HDS theme provider
import { HdsThemeModule } from '@yourorg/hds';

@NgModule({
  imports: [HdsThemeModule.forRoot({ defaultTheme: 'light' })],
})
export class AppModule {}
```

<!-- ADD-HERE: replace with your actual theme provider setup -->

## Switching Themes at Runtime

```typescript
// Example: toggling between light and dark
import { HdsThemeService } from '@yourorg/hds';

constructor(private theme: HdsThemeService) {}

toggleTheme() {
  this.theme.setTheme(this.theme.current() === 'light' ? 'dark' : 'light');
}
```

<!-- ADD-HERE: replace with your actual theme switching API -->

## CSS Custom Properties Override

```scss
// Override HDS tokens per-theme
:root[data-theme='dark'] {
  --hds-color-primary: #4DA3FF;
  --hds-color-surface: #1E1E1E;
}
```

<!-- ADD-HERE: add your theme-specific token overrides -->

## Tokens That Change by Theme

| Token | Light | Dark |
|-------|-------|------|
| `--hds-color-primary` | `#0057B8` | `#4DA3FF` |
| `--hds-color-surface` | `#FFFFFF` | `#1E1E1E` |
<!-- ADD-HERE: list all theme-sensitive tokens -->
