# Nx and Angular Version Compatibility Matrix

Source: https://nx.dev/docs/technologies/angular/guides/angular-nx-version-matrix
Last refreshed: 2026-03-24

## Active Angular Versions (Nx latest)

| Angular Version | Recommended Nx | Nx Range |
|---|---|---|
| ~21.2.0 | latest | >=22.6.0 |
| ~21.1.0 | latest | >=22.4.0 |
| ~21.0.0 | latest | >=22.3.0 |
| ~20.3.0 | latest | >=21.6.1 |
| ~20.2.0 | latest | >=21.5.1 |
| ~20.1.0 | latest | >=21.3.0 |
| ~20.0.0 | latest | >=21.2.0 |
| ~19.2.0 | latest | >=20.5.0 |
| ~19.1.0 | latest | >=20.4.0 |
| ~19.0.0 | latest | >=20.2.0 |

## LTS Angular Versions

| Angular Version | Recommended Nx | Nx Range |
|---|---|---|
| ~18.2.0 | ~22.2.0 | >=19.6.0 <22.3.0 |
| ~18.1.0 | ~22.2.0 | >=19.5.0 <22.3.0 |
| ~18.0.0 | ~22.2.0 | >=19.1.0 <22.3.0 |
| ~17.3.0 | ~21.1.0 | >=18.2.0 <21.2.0 |
| ~17.0.0 | ~21.1.0 | >=17.1.0 <21.2.0 |

## Key Takeaways

- Nx latest (v22.6+) supports Angular 19, 20, and 21
- Angular 18 requires Nx <22.3.0
- Angular 17 requires Nx <21.2.0
- Always use the recommended Nx version for your Angular version
- `create-nx-workspace@latest` gives you the latest supported Angular
- Use `--angular-version` flag with `orch new` to specify a different version
