# Elevate Document Renderer — TEMPLATE

> **This is a placeholder template.** Replace the `<!-- ADD-HERE -->` markers
> with your organisation's actual TypeDoc/Storybook content. Keep under 500 lines.
>
> Populate from your org's doc server:
> `@docs /docs-fetch --source https://docs.internal.yourorg.com/elevate/document-renderer --target .orch/references/internal/elevate/document-renderer.md`

## Overview

The Document Renderer provides Angular components for rendering documents inline,
including PDF viewing, HTML content rendering, and document preview. It integrates
with Elevate auth for secure document access and logging for usage analytics.

<!-- ADD-HERE: replace with your actual document-renderer overview -->

## Installation

```bash
npm install @yourorg/elevate/document-renderer
```

<!-- ADD-HERE: any additional install steps or peer dependencies -->

## Setup (Providers)

```typescript
import { provideElevateDocumentRenderer } from '@yourorg/elevate/document-renderer';

export const appConfig: ApplicationConfig = {
  providers: [
    provideElevateDocumentRenderer({
      pdfWorkerUrl: '/assets/pdf.worker.min.js',
      maxCacheSize: 50, // MB
    }),
    // ... other providers
  ],
};
```

<!-- ADD-HERE: replace with your actual provider setup -->

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `provideElevateDocumentRenderer()` | Provider | Register document renderer |
| `ElevateDocViewerComponent` | Component | `<elevate-doc-viewer>` element |
| `DocumentService` | Service | Programmatic document loading |
| `DocumentType` | Enum | `PDF`, `HTML`, `Image`, `Markdown` |
<!-- ADD-HERE: add remaining API surface -->

## Usage Examples

```html
<elevate-doc-viewer
  [src]="documentUrl"
  [type]="'PDF'"
  [zoom]="1.0"
  [showToolbar]="true"
  (pageChange)="onPageChange($event)"
  data-testid="doc-viewer">
</elevate-doc-viewer>
```

```typescript
@Component({ /* ... */ })
export class TradeConfirmationComponent {
  documentUrl = signal<string>('');

  loadConfirmation(tradeId: string): void {
    this.documentUrl.set(`/api/trades/${tradeId}/confirmation.pdf`);
  }
}
```

<!-- ADD-HERE: replace with your actual usage examples -->

## Common Patterns

- Use for trade confirmations, regulatory documents, and reports
- PDF rendering uses a web worker for performance (configure `pdfWorkerUrl`)
- Documents are fetched with auth tokens injected automatically
- Support for zoom, page navigation, and print via the toolbar

<!-- ADD-HERE: add org-specific patterns and best practices -->
