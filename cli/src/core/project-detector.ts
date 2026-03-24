/**
 * ORCH CLI — Project Detector
 *
 * Detects project type, framework versions, workspace setup, and internal libs
 * by reading project files (package.json, pom.xml, pyproject.toml, etc.)
 *
 * Works from terminal (outside VS Code) or inside VS Code terminal.
 * Does not require VS Code — reads files directly.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface ProjectInfo {
  root: string;
  type: 'angular' | 'springboot' | 'fastapi' | 'unknown';
  workspace: 'nx' | 'angular-cli' | 'vanilla' | 'maven' | 'gradle' | 'poetry' | 'pip' | 'unknown';
  versions: Record<string, string>;
  internalLibs: string[];
  testStack: {
    unit: 'jest' | 'karma' | 'vitest' | 'junit' | 'pytest' | 'unknown';
    e2e: 'playwright' | 'cypress' | 'protractor' | 'none' | 'unknown';
  };
  recommendations: string[];
}

export function detectProject(projectPath: string = '.'): ProjectInfo {
  const root = path.resolve(projectPath);
  const info: ProjectInfo = {
    root,
    type: 'unknown',
    workspace: 'unknown',
    versions: {},
    internalLibs: [],
    testStack: { unit: 'unknown', e2e: 'unknown' },
    recommendations: [],
  };

  // Detect by project markers
  if (fileExists(root, 'package.json')) {
    detectNodeProject(root, info);
  }
  if (fileExists(root, 'pom.xml')) {
    info.type = 'springboot';
    info.workspace = 'maven';
    detectMavenProject(root, info);
  }
  if (fileExists(root, 'build.gradle') || fileExists(root, 'build.gradle.kts')) {
    info.type = 'springboot';
    info.workspace = 'gradle';
  }
  if (fileExists(root, 'pyproject.toml') || fileExists(root, 'requirements.txt')) {
    detectPythonProject(root, info);
  }

  return info;
}

function detectNodeProject(root: string, info: ProjectInfo): void {
  const pkg = readJson(root, 'package.json');
  if (!pkg) return;

  const deps = { ...pkg.dependencies, ...pkg.devDependencies };

  // Detect Angular
  if (deps['@angular/core']) {
    info.type = 'angular';
    info.versions['@angular/core'] = deps['@angular/core'];
    info.versions['@angular/cli'] = deps['@angular/cli'] || 'not installed';

    // Workspace type
    if (fileExists(root, 'nx.json')) {
      info.workspace = 'nx';
      info.versions['nx'] = deps['@nx/angular'] || deps['@nrwl/angular'] || 'detected';
    } else if (fileExists(root, 'angular.json')) {
      const angularJson = readJson(root, 'angular.json');
      const projectCount = Object.keys(angularJson?.projects || {}).length;
      info.workspace = projectCount > 1 ? 'angular-cli' : 'vanilla';
    }
  }

  // Core dependencies
  const track = [
    'typescript', 'rxjs', 'zone.js',
    '@angular/material', 'primeng', 'ag-grid-angular', 'angular-plotly.js',
    '@interopio/ng', '@glue42/ng',
  ];
  for (const dep of track) {
    if (deps[dep]) info.versions[dep] = deps[dep];
  }

  // Internal @yourorg libs
  for (const dep of Object.keys(deps)) {
    if (dep.startsWith('@yourorg/')) {
      info.internalLibs.push(dep);
      info.versions[dep] = deps[dep];
    }
  }

  // Test stack
  if (deps['jest'] || deps['jest-preset-angular']) {
    info.testStack.unit = 'jest';
  } else if (deps['karma']) {
    info.testStack.unit = 'karma';
    info.recommendations.push('Migrate from Karma to Jest. Run: @angular /angular-migrate-jest');
  } else if (deps['vitest']) {
    info.testStack.unit = 'vitest';
  }

  if (deps['@playwright/test']) {
    info.testStack.e2e = 'playwright';
  } else if (deps['cypress']) {
    info.testStack.e2e = 'cypress';
    info.recommendations.push('Consider migrating from Cypress to Playwright. Run: @angular /angular-migrate-playwright');
  } else if (deps['protractor']) {
    info.testStack.e2e = 'protractor';
    info.recommendations.push('Migrate from Protractor to Playwright (deprecated). Run: @angular /angular-migrate-playwright');
  }

  // Library recommendations
  if (info.type === 'angular') {
    const altUiLibs: Record<string, string> = {
      '@angular/material': 'Angular Material',
      '@ng-bootstrap/ng-bootstrap': 'ng-bootstrap',
      'ngx-bootstrap': 'ngx-bootstrap',
      'bootstrap': 'Bootstrap',
      'devextreme-angular': 'DevExtreme',
      '@coreui/angular': 'CoreUI',
      '@nebular/theme': 'Nebular',
    };

    const detectedAlts = Object.entries(altUiLibs)
      .filter(([dep]) => deps[dep])
      .map(([, name]) => name);

    // Only recommend PrimeNG if project has UI components but no component library
    // Don't recommend for brand new projects with no components yet
    const hasComponents = fs.existsSync(path.join(root, 'src', 'app')) &&
      fs.readdirSync(path.join(root, 'src', 'app'), { recursive: true })
        .some((f: any) => String(f).endsWith('.component.ts'));
    const hasNxApps = fs.existsSync(path.join(root, 'apps'));

    if (!deps['primeng'] && detectedAlts.length === 0 && (hasComponents || hasNxApps)) {
      info.recommendations.push('PrimeNG is the recommended component library. Run: npm install primeng');
    }
    if (deps['primeng'] && detectedAlts.length > 0) {
      info.recommendations.push(`Both PrimeNG and ${detectedAlts.join(', ')} detected — prefer PrimeNG for new components`);
    }
    if (!deps['primeng'] && detectedAlts.length > 0) {
      info.recommendations.push(`Consider migrating from ${detectedAlts.join(', ')} to PrimeNG for richer component support`);
    }
  }

  // Angular version-specific recommendations
  const angularVersion = parseMajorVersion(deps['@angular/core']);
  if (angularVersion) {
    if (angularVersion < 17) {
      info.recommendations.push(`Angular ${angularVersion} is below LTS-2. Run: @angular /angular-migrate-version`);
    }
    if (angularVersion >= 18 && deps['karma']) {
      info.recommendations.push('Karma is deprecated in Angular 18+. Run: @angular /angular-migrate-jest');
    }

    // Check TypeScript compatibility using major.minor
    const tsVersion = parseVersion(deps['typescript']);
    if (tsVersion) {
      const tsRequirements: Record<number, number> = {
        21: 5.9, 20: 5.8, 19: 5.5, 18: 5.4, 17: 5.2,
      };
      const requiredTs = tsRequirements[angularVersion];
      if (requiredTs && tsVersion < requiredTs) {
        info.recommendations.push(
          `Angular ${angularVersion} requires TypeScript >=${requiredTs}. You have ${deps['typescript']}. Run: npm install typescript@${requiredTs}`
        );
      }
    }
  }
}

function detectMavenProject(root: string, info: ProjectInfo): void {
  // Basic Maven detection — full XML parsing would be done with a proper parser
  const pomPath = path.join(root, 'pom.xml');
  if (!fs.existsSync(pomPath)) return;

  const pomContent = fs.readFileSync(pomPath, 'utf8');

  if (pomContent.includes('spring-boot')) {
    info.type = 'springboot';
    const versionMatch = pomContent.match(/<spring-boot.version>([^<]+)<\/spring-boot.version>/);
    if (versionMatch) info.versions['spring-boot'] = versionMatch[1];
  }

  // Detect Java version
  const javaMatch = pomContent.match(/<java.version>([^<]+)<\/java.version>/);
  if (javaMatch) info.versions['java'] = javaMatch[1];
}

function detectPythonProject(root: string, info: ProjectInfo): void {
  // Check pyproject.toml for FastAPI
  const pyprojectPath = path.join(root, 'pyproject.toml');
  if (fs.existsSync(pyprojectPath)) {
    const content = fs.readFileSync(pyprojectPath, 'utf8');
    if (content.includes('fastapi')) {
      info.type = 'fastapi';
      info.workspace = 'poetry';
    }
  }

  // Check requirements.txt
  const reqPath = path.join(root, 'requirements.txt');
  if (fs.existsSync(reqPath)) {
    const content = fs.readFileSync(reqPath, 'utf8');
    if (content.includes('fastapi')) {
      info.type = 'fastapi';
      info.workspace = 'pip';
    }
  }

  // Detect test stack
  const pyDeps = fs.existsSync(pyprojectPath)
    ? fs.readFileSync(pyprojectPath, 'utf8')
    : fs.existsSync(reqPath)
      ? fs.readFileSync(reqPath, 'utf8')
      : '';

  if (pyDeps.includes('pytest')) info.testStack.unit = 'pytest';
  if (pyDeps.includes('playwright')) info.testStack.e2e = 'playwright';
}

// ── Helpers ──

function fileExists(root: string, filename: string): boolean {
  return fs.existsSync(path.join(root, filename));
}

function readJson(root: string, filename: string): any | null {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, filename), 'utf8'));
  } catch {
    return null;
  }
}

function parseVersion(semver: string | undefined): number | null {
  if (!semver) return null;
  // Extract major.minor as a float (e.g., "~5.9.2" → 5.9, "^19.2.0" → 19.2)
  const match = semver.match(/(\d+)\.(\d+)/);
  if (!match) {
    const majorOnly = semver.match(/(\d+)/);
    return majorOnly ? parseInt(majorOnly[1]) : null;
  }
  return parseFloat(`${match[1]}.${match[2]}`);
}

function parseMajorVersion(semver: string | undefined): number | null {
  if (!semver) return null;
  const match = semver.match(/(\d+)/);
  return match ? parseInt(match[1]) : null;
}
