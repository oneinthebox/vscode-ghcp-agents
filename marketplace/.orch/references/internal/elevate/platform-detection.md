# Elevate Platform Detection — TEMPLATE

> **This is a placeholder template.** Replace the `<!-- ADD-HERE -->` markers
> with your organisation's actual TypeDoc/Storybook content. Keep under 500 lines.
>
> Populate from your org's doc server:
> `@docs /docs-fetch --source https://docs.internal.yourorg.com/elevate/platform-detection --target .orch/references/internal/elevate/platform-detection.md`

## Overview

The Platform Detection library provides browser/platform detection, feature flag
evaluation, and runtime capability checks. It enables conditional feature
enablement based on the user's environment (browser, OS, desktop container,
feature flags from the platform).

<!-- ADD-HERE: replace with your actual platform-detection overview -->

## Installation

```bash
npm install @yourorg/elevate/platform-detection
```

<!-- ADD-HERE: any additional install steps or peer dependencies -->

## Setup (Providers)

```typescript
import { provideElevatePlatformDetection } from '@yourorg/elevate/platform-detection';

export const appConfig: ApplicationConfig = {
  providers: [
    provideElevatePlatformDetection({
      featureFlagEndpoint: '/api/features',
      refreshInterval: 60000,
    }),
    // ... other providers
  ],
};
```

<!-- ADD-HERE: replace with your actual provider setup -->

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `provideElevatePlatformDetection()` | Provider | Register platform detection |
| `PlatformDetectionService` | Service | Browser, OS, feature flag checks |
| `FeatureFlagService` | Service | Feature flag evaluation |
| `PlatformInfo` | Interface | Detected platform information |
<!-- ADD-HERE: add remaining API surface -->

## Usage Examples

```typescript
import { PlatformDetectionService } from '@yourorg/elevate/platform-detection';
import { FeatureFlagService } from '@yourorg/elevate/platform-detection';

@Component({ /* ... */ })
export class DashboardComponent implements OnInit {
  private platform = inject(PlatformDetectionService);
  private features = inject(FeatureFlagService);

  readonly showDesktopFeatures = signal(false);
  readonly showBetaChart = signal(false);

  ngOnInit(): void {
    this.showDesktopFeatures.set(this.platform.isDesktopContainer());
    this.showBetaChart.set(this.features.isEnabled('beta-chart-v2'));
  }
}
```

<!-- ADD-HERE: replace with your actual usage examples -->

## Common Patterns

- Use platform detection to enable desktop-only features (interop, window management)
- Evaluate feature flags for gradual rollouts and A/B testing
- Feature flags refresh periodically — use signals for reactive updates
- Combine with Elevate auth for user-segment-based feature flags

<!-- ADD-HERE: add org-specific patterns and best practices -->
