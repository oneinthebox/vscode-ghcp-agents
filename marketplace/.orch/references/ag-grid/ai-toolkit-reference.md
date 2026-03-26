# AG Grid AI Toolkit Reference
Source: https://www.ag-grid.com/angular-data-grid/ai-toolkit/
Last refreshed: 2026-03-25

## Overview

The AI Toolkit enables AG Grid integration with LLMs, allowing users to manipulate grid state through natural language queries. Uses Structured Outputs to ensure LLM responses conform to predefined JSON schemas.

## Supported Grid Features

| Feature | Description |
|---------|-------------|
| Filtering | Apply/remove column filters |
| Sorting | Sort by one or more columns |
| Aggregation | Aggregate values (sum, avg, min, max, count) |
| Pivoting | Pivot data by column values |
| Row Grouping | Group rows by column |
| Column Visibility | Show/hide columns |
| Column Sizing | Resize columns |

## Architecture / Workflow

| Step | Action | API |
|------|--------|-----|
| 1 | Capture user natural language query | App input |
| 2 | Get current grid state | `gridApi.getState()` |
| 3 | Get structured schema | `gridApi.getStructuredSchema()` |
| 4 | Send query + state + schema to LLM | LLM service call |
| 5 | Validate LLM JSON response | `ajv` or similar validator |
| 6 | Apply new state to grid | `gridApi.setState(newState, propertiesToIgnore)` |

## API Reference

### `gridApi.getStructuredSchema(options?)`

Returns JSON Schema representation of grid state for LLM structured output.

**Module:** `AiToolkitModule`

**Options:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `exclude` | `string[]` | Feature names to exclude: `'aggregation'`, `'filter'`, `'sort'`, `'pivot'`, `'columnVisibility'`, `'columnSizing'`, `'rowGroup'` |
| `columns` | `Record<string, ColumnContext>` | Per-column context for the LLM |

**ColumnContext:**

| Property | Type | Description |
|----------|------|-------------|
| `description` | `string` | Human-readable column description for LLM context |
| `includeSetValues` | `boolean` | Include actual unique values for this column in schema |

### `gridApi.getState()`

Returns current grid state object.

### `gridApi.setState(newState, propertiesToIgnore?)`

Applies new grid state. `propertiesToIgnore` is an array of feature keys to skip when applying.

## Schema Construction

```typescript
const gridStateStructuredSchema = gridApi.getStructuredSchema();

const schema = {
  type: 'object',
  properties: {
    gridState: gridStateStructuredSchema,
    propertiesToIgnore: {
      type: 'array',
      items: {
        type: 'string',
        enum: ['aggregation', 'filter', 'sort', 'pivot',
               'columnVisibility', 'columnSizing', 'rowGroup'],
      },
      description: 'Grid state properties to ignore when applying new state',
    },
    explanation: {
      type: 'string',
      description: 'Human-readable explanation of changes made',
    },
  },
  required: ['gridState', 'propertiesToIgnore', 'explanation'],
  additionalProperties: false,
};
```

## Excluding Features

```typescript
const schema = gridApi.getStructuredSchema({
  exclude: ['columnVisibility', 'sorting']
});
```

## Providing Column Context

```typescript
const schema = gridApi.getStructuredSchema({
  columns: {
    sport: {
      description: 'The sport the athlete won their medal in',
      includeSetValues: true   // includes unique values in schema
    },
    gold: {
      description: 'The number of gold medals won by this athlete'
    }
  }
});
```

## Response Validation and Application

```typescript
import Ajv from 'ajv';

const { newGridState, propertiesToIgnore } = llmResponse;
const ajv = new Ajv();
const validate = ajv.compile(schema);

if (!validate(newGridState)) {
  console.error('Invalid Schema', validate.errors);
  return;
}

gridApi.setState(newGridState, propertiesToIgnore);
```

## Prompting Best Practices

| Practice | Details |
|----------|---------|
| Include current state | Pass `gridApi.getState()` in prompt so LLM knows starting point |
| Request only grid state | Tell LLM to return only the grid state changes |
| Provide sample data | Include a few data rows for domain context |
| Domain terminology | Explain business terms the user might use |
| List available features | Explicitly state which grid features are available |
| Schema modification | Apply custom rules on top of `getStructuredSchema()` base |

## Schema Size Management

| Strategy | When to Use |
|----------|------------|
| Enable `includeSetValues` selectively | Only on low-cardinality columns |
| Truncate to top N values + "OTHER" | High-cardinality columns that need value hints |
| Monitor total prompt size | Stay within model context window |
| Use `exclude` option | Remove unused features from schema |

## Requirements

| Requirement | Details |
|-------------|---------|
| LLM API key | For chosen provider (OpenAI, Google, etc.) |
| AG Grid implementation | Existing grid with data |
| Input mechanism | Text input for user queries |
| LLM API access | Ability to make HTTP requests to LLM |
| JSON Schema knowledge | Understanding structured outputs |

## Compatible LLMs

| LLM | Structured Output Support |
|-----|--------------------------|
| OpenAI (ChatGPT) | Native structured outputs |
| Google Gemini | Native structured outputs |
| Other LLMs | Use `ajv` validation before applying state |
