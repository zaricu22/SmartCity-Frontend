/*
 * ============================================================
 * DDD ARCHITECTURE RULES — ts-arch enforcement
 * ============================================================
 * Run:    npm run test:arch   (ts-node, NOT Karma/ChromeHeadless)
 * Mirrors: DddArchitectureTest.java + backend ADR-0002
 * Scoped to: src/app/asset  (single bounded context)
 *
 * CAN be enforced (import-graph visible):
 *  1.  domain must not import from application
 *  2.  domain must not import from infrastructure
 *  3.  domain must not import from presentation
 *  4.  application must not import from infrastructure
 *  5.  application must not import from presentation
 *  6.  infrastructure must not import from presentation
 *  7.  presentation must not import from domain directly (except domain/shared/enums — ADR-0011)
 *  8.  presentation must not import from infrastructure directly
 *  9.  presentation must not import from application/service (facade only — ADR-0008)
 * 10.  presentation must not import from application/mapper  (facade only — ADR-0008)
 * 11.  domain must not import from @angular/core (no decorators in domain)
 * 12.  domain must not import from rxjs (domain stays pure TypeScript)
 * 13.  application must not import HttpClient (goes through repository — ADR-0007)
 * 14.  *Repository lives only in domain/repository or infrastructure
 * 15.  *Specification lives only in domain/specification
 * 16.  *Exception lives only in domain/exception or application/exception
 * 17.  *Command lives only in application/command
 * 18.  *Dto lives only in application/dto
 * 19.  domain events (*Event classes and interfaces) live only in domain/event
 * 20.  classes in application/service must end with Service
 * 21.  classes in domain/specification must end with Specification
 * 22.  infrastructure must not import from application
 * 23.  *Facade lives only in application/facade
 * 24.  *Mapper lives only in application/mapper or infrastructure
 * 25.  *Service lives only in application/service or infrastructure
 * 26.  classes in application/facade must end with "Facade"
 * 27.  shared kernel must not import from any bounded-context layer
 * 28.  application services must not call each other
 * 29.  classes in domain/exception must extend DomainException
 * 30.  classes in application/exception must extend ApplicationException
 * 31.  interfaces in domain/event must extend DomainEvent
 *
 * Deliberate exceptions (mirrors backend ignoreDependency):
 *  A.  import type — skipped entirely; type-only imports are erased at compile time
 *      and create no runtime dependency (equivalent to ArchUnit bytecode-only analysis)
 *  D.  getDeclaredNames() matches both `class` and `interface` declarations — rules that
 *      previously only caught classes (e.g. rule 19 Event placement) now correctly enforce
 *      interface-based types such as Commands, DTOs, and domain events.
 *
 *  B.  presentation → domain/shared/enums — EnergyUnit and DeviceType are vocabulary types
 *      (pure value types, no behavior) used across all four layers. Importing types from
 *      an inner layer is standard DDD; what is prohibited is calling domain logic from
 *      presentation. The application/shared/enums re-export workaround was eliminated
 *      in favour of this explicit exception (ADR-0011).
 *  C.  domain/repository → rxjs — Observable is Angular's async contract for repository
 *      method signatures; no domain logic depends on rxjs (same rationale as backend
 *      webapi→domain.shared exception for shared-kernel enums)
 *
 * CANNOT be enforced (not import-visible):
 *  1.  No public set*() methods in domain (requires AST method analysis)
 *  2.  readonly fields on value objects (requires AST field modifier check)
 *  3.  Composition over inheritance — extends vs uses is ambiguous from imports
 * ============================================================
 */

import * as fs   from 'fs';
import * as path from 'path';

// ----------------------------------------------------------------
// Project paths
// ----------------------------------------------------------------
const ROOT         = path.resolve(__dirname, '../../..');
const ASSET        = path.join(ROOT, 'src/app/asset');
const SHARED       = path.join(ASSET, 'shared');       // shared kernel — Page<T>, PageRequest
const DOMAIN       = path.join(ASSET, 'domain');
const APPLICATION  = path.join(ASSET, 'application');
const INFRASTRUCTURE = path.join(ASSET, 'infrastructure');
const PRESENTATION = path.join(ASSET, 'presentation');

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

function getFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const result: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory())                                      result.push(...getFiles(full));
    else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts')) result.push(full);
  }
  return result;
}

function getImports(file: string): string[] {
  const content = fs.readFileSync(file, 'utf8');
  // Skip "import type" — type-only imports are erased at compile time, creating no runtime dependency.
  // ArchUnit works on bytecode and never sees type-level references; this aligns the behaviour.
  return [...content.matchAll(/^import\s+(?!type\s).+?\s+from\s+['"]([^'"]+)['"]/gm)].map(m => m[1]);
}

/** Returns names of all declared classes AND interfaces in a file. */
function getDeclaredNames(file: string): string[] {
  const content = fs.readFileSync(file, 'utf8');
  return [...content.matchAll(/(?:export\s+)?(?:abstract\s+)?(?:class|interface)\s+(\w+)/g)].map(m => m[1]);
}

function rel(file: string): string {
  return path.relative(ROOT, file).replace(/\\/g, '/');
}

function resolveImport(file: string, imp: string): string {
  return imp.startsWith('.') ? path.resolve(path.dirname(file), imp) : imp;
}

/** Files in sourceDir that import anything from targetDir (resolved absolute paths).
 *  excludeDirs: resolved absolute paths that are exempted from the rule. */
function layerImports(sourceDir: string, targetDir: string, excludeDirs: string[] = []): string[] {
  const violations: string[] = [];
  for (const file of getFiles(sourceDir)) {
    for (const imp of getImports(file)) {
      const resolved = resolveImport(file, imp);
      if (resolved.startsWith(targetDir) && !excludeDirs.some(e => resolved.startsWith(e))) {
        violations.push(`${rel(file)}  →  ${imp}`);
      }
    }
  }
  return violations;
}

/** Files in sourceDir that import a specific sub-path within asset/. */
function subpathImports(sourceDir: string, assetSubpath: string): string[] {
  return layerImports(sourceDir, path.join(ASSET, assetSubpath));
}

/** Files in sourceDir that import an npm package (exact name or name/ prefix). */
function packageImports(sourceDir: string, pkg: string): string[] {
  const violations: string[] = [];
  for (const file of getFiles(sourceDir)) {
    const bad = getImports(file).filter(i => i === pkg || i.startsWith(`${pkg}/`));
    bad.forEach(i => violations.push(`${rel(file)}  →  ${i}`));
  }
  return violations;
}

/** Classes (by suffix) found outside their allowed directories within asset/. */
function classesOutsideAllowed(suffix: string, allowedDirs: string[]): string[] {
  const violations: string[] = [];
  for (const file of [...getFiles(DOMAIN), ...getFiles(APPLICATION), ...getFiles(INFRASTRUCTURE), ...getFiles(PRESENTATION)]) {
    if (allowedDirs.some(d => file.startsWith(d))) continue;
    getDeclaredNames(file)
      .filter(c => c.endsWith(suffix))
      .forEach(c => violations.push(
        `${rel(file)}: ${c} must be in ${allowedDirs.map(d => path.relative(ASSET, d)).join(' or ')}`
      ));
  }
  return violations;
}

/** Classes in dir that do NOT end with the required suffix. */
function namingViolations(dir: string, suffix: string): string[] {
  const violations: string[] = [];
  for (const file of getFiles(dir)) {
    getDeclaredNames(file)
      .filter(c => !c.endsWith(suffix))
      .forEach(c => violations.push(`${rel(file)}: ${c} must end with "${suffix}"`));
  }
  return violations;
}

/** Classes in dir that do NOT extend the required base class (exclude: names exempt from the rule). */
function classesNotExtending(dir: string, base: string, exclude: string[] = []): string[] {
  const violations: string[] = [];
  for (const file of getFiles(dir)) {
    const content = fs.readFileSync(file, 'utf8');
    for (const m of content.matchAll(/(?:export\s+)?(?:abstract\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?/g)) {
      const [, name, ext] = m;
      if (!exclude.includes(name) && ext !== base)
        violations.push(`${rel(file)}: ${name} must extend ${base}`);
    }
  }
  return violations;
}

/** Interfaces in dir that do NOT extend the required base interface (exclude: names exempt from the rule). */
function interfacesNotExtending(dir: string, base: string, exclude: string[] = []): string[] {
  const violations: string[] = [];
  for (const file of getFiles(dir)) {
    const content = fs.readFileSync(file, 'utf8');
    for (const m of content.matchAll(/(?:export\s+)?interface\s+(\w+)(?:\s+extends\s+(\w+))?/g)) {
      const [, name, ext] = m;
      if (!exclude.includes(name) && ext !== base)
        violations.push(`${rel(file)}: ${name} must extend ${base}`);
    }
  }
  return violations;
}

// ----------------------------------------------------------------
// Rule runner
// ----------------------------------------------------------------
let passed = 0;
let failed = 0;

function describe(group: string, fn: () => void): void {
  console.log(`\n  ${group}`);
  fn();
}

function rule(description: string, violations: string[]): void {
  if (violations.length === 0) {
    console.log(`    ✓  ${description}`);
    passed++;
  } else {
    console.error(`    ✗  ${description}`);
    violations.forEach(v => console.error(`         ${v}`));
    failed++;
  }
}

// ----------------------------------------------------------------
// Rules
// ----------------------------------------------------------------
console.log('\nDDD Architecture Tests — asset bounded context');
console.log('='.repeat(54));

describe('Layer Dependencies', () => {
  rule('domain must not import from application',             layerImports(DOMAIN,         APPLICATION));
  rule('domain must not import from infrastructure',          layerImports(DOMAIN,         INFRASTRUCTURE));
  rule('domain must not import from presentation',            layerImports(DOMAIN,         PRESENTATION));
  rule('application must not import from infrastructure',     layerImports(APPLICATION,    INFRASTRUCTURE));
  rule('application must not import from presentation',       layerImports(APPLICATION,    PRESENTATION));
  rule('infrastructure must not import from application',      layerImports(INFRASTRUCTURE, APPLICATION));
  rule('infrastructure must not import from presentation',    layerImports(INFRASTRUCTURE, PRESENTATION));
  rule('presentation must not import from domain (except domain/shared/enums — ADR-0011)',
    layerImports(PRESENTATION, DOMAIN, [path.join(DOMAIN, 'shared', 'enums')]));
  rule('presentation must not import from infrastructure',    layerImports(PRESENTATION,   INFRASTRUCTURE));
});

describe('Facade as Presentation Entry Point  (ADR-0008)', () => {
  rule('presentation must not import from application/service', subpathImports(PRESENTATION, 'application/service'));
  rule('presentation must not import from application/mapper',  subpathImports(PRESENTATION, 'application/mapper'));
});

describe('Domain Purity', () => {
  rule('domain must not import from @angular/core', packageImports(DOMAIN, '@angular/core'));
  // domain/repository is an explicit exception — Observable is Angular's async contract for repository
  // method signatures (same pattern as backend ignoreDependency for webapi→domain.shared enums).
  rule('domain (except domain/repository) must not import from rxjs',
    packageImports(DOMAIN, 'rxjs').filter(v => !v.includes('/domain/repository/')));
});

describe('Application Layer Isolation  (ADR-0007)', () => {
  rule('application must not import HttpClient directly', packageImports(APPLICATION, '@angular/common/http'));
  rule('application services must not call each other',
    layerImports(path.join(APPLICATION, 'service'), path.join(APPLICATION, 'service')));
});

describe('Placement Rules', () => {
  rule('*Repository lives only in domain/repository or infrastructure',
    classesOutsideAllowed('Repository', [path.join(DOMAIN, 'repository'), INFRASTRUCTURE]));
  rule('*Specification lives only in domain/specification',
    classesOutsideAllowed('Specification', [path.join(DOMAIN, 'specification')]));
  rule('*Exception lives only in domain/exception or application/exception',
    classesOutsideAllowed('Exception', [path.join(DOMAIN, 'exception'), path.join(APPLICATION, 'exception')]));
  rule('*Command lives only in application/command',
    classesOutsideAllowed('Command', [path.join(APPLICATION, 'command')]));
  rule('*Dto lives only in application/dto',
    classesOutsideAllowed('Dto', [path.join(APPLICATION, 'dto')]));
  rule('domain events (*Event) live only in domain/event',
    classesOutsideAllowed('Event', [path.join(DOMAIN, 'event')]));
  rule('*Facade lives only in application/facade',
    classesOutsideAllowed('Facade', [path.join(APPLICATION, 'facade')]));
  rule('*Mapper lives only in application/mapper or infrastructure',
    classesOutsideAllowed('Mapper', [path.join(APPLICATION, 'mapper'), INFRASTRUCTURE]));
  rule('*Service lives only in application/service or infrastructure',
    classesOutsideAllowed('Service', [path.join(APPLICATION, 'service'), INFRASTRUCTURE]));
});

describe('Inheritance Rules', () => {
  rule('classes in domain/exception must extend DomainException',
    classesNotExtending(path.join(DOMAIN, 'exception'), 'DomainException', ['DomainException']));
  rule('classes in application/exception must extend ApplicationException',
    classesNotExtending(path.join(APPLICATION, 'exception'), 'ApplicationException', ['ApplicationException']));
  rule('interfaces in domain/event must extend DomainEvent',
    interfacesNotExtending(path.join(DOMAIN, 'event'), 'DomainEvent', ['DomainEvent']));
});

describe('Shared Kernel', () => {
  rule('shared kernel must not import from any bounded-context layer',
    [...layerImports(SHARED, DOMAIN), ...layerImports(SHARED, APPLICATION),
     ...layerImports(SHARED, INFRASTRUCTURE), ...layerImports(SHARED, PRESENTATION)]);
});

describe('Naming Conventions', () => {
  rule('classes in application/facade must end with "Facade"',
    namingViolations(path.join(APPLICATION, 'facade'), 'Facade'));
  rule('classes in application/service must end with "Service"',
    namingViolations(path.join(APPLICATION, 'service'), 'Service'));
  rule('classes in domain/specification must end with "Specification"',
    namingViolations(path.join(DOMAIN, 'specification'), 'Specification'));
});

// ----------------------------------------------------------------
// Summary
// ----------------------------------------------------------------
const total = passed + failed;
console.log('\n' + '='.repeat(54));
console.log(`  ${total} rules checked — ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.error('\n  Architecture violations detected. Fix the imports above before merging.\n');
  process.exit(1);
}

console.log('\n');
