// Example output from /angular-migrate-jest — see SKILL.md for usage
// setup-jest.ts — replaces src/test.ts (Karma bootstrap) after migration
import 'jest-preset-angular/setup-jest';

// Global test utilities — add custom matchers or global mocks here
// Example: import '@testing-library/jest-dom';

// Suppress specific Angular warnings in test output
const originalWarn = console.warn;
console.warn = (...args: unknown[]) => {
  if (typeof args[0] === 'string' && args[0].includes('NG0')) return;
  originalWarn(...args);
};
