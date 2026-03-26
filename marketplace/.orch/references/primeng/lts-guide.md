# PrimeNG — LTS & Version Compatibility

Source: https://primeng.org/lts
Last refreshed: 2026-03-27

---

## Version Matrix

| PrimeNG | Angular | Status | Support Until |
|---------|---------|--------|--------------|
| 21.x | 21 | Current | Active |
| 20.x | 20 | LTS | Dec 2027 |
| 19.x | 19 | LTS | Jun 2027 |
| 18.x | 18 | LTS | Dec 2026 |
| 17.x | 17 | LTS | Jun 2026 |
| 16.x | 16 | EOL | Dec 2025 |

## Key Notes

- PrimeNG major versions align with Angular major versions
- Each major version receives 18 months of LTS support
- LTS includes security patches and critical bug fixes only
- No new features in LTS — only in the current version

## Migration Between Versions

### v18 → v19
- New Aura theme (replaces Material/Bootstrap themes)
- Component API changes (see migration guide)
- Removed deprecated components

### v19 → v20
- Signal-based components
- Improved accessibility
- New DataView component

### v20 → v21
- Full signal support
- New Form components
- Improved TreeTable

## Installation

```bash
npm install primeng @primeng/themes
```

## Angular Setup

```typescript
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';

export const appConfig: ApplicationConfig = {
  providers: [
    providePrimeNG({ theme: { preset: Aura } })
  ]
};
```
