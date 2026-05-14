import { relative } from 'path';
import type { PageObjectEntry } from './repository-index';
import { getReadOnlyProject } from '../generator/ts-project';

export function parsePageObject(filePath: string, rootDir: string): PageObjectEntry[] {
  const project = getReadOnlyProject();

  let sourceFile;
  try {
    const existing = project.getSourceFile(filePath);
    if (existing) {
      existing.refreshFromFileSystemSync();
      sourceFile = existing;
    } else {
      sourceFile = project.addSourceFileAtPath(filePath);
    }
  } catch {
    return [];
  }

  const entries: PageObjectEntry[] = [];

  for (const classDecl of sourceFile.getClasses()) {
    const className = classDecl.getName();
    if (!className) continue;

    const existingSelectors: string[] = [];

    // Property-style: readonly submitBtn = this.page.locator(...)
    for (const prop of classDecl.getProperties()) {
      const init = prop.getInitializer()?.getText() ?? '';
      if (isLocatorExpression(init)) {
        existingSelectors.push(prop.getName());
      }
    }

    // Constructor-style: this.submitBtn = page.locator(...)
    for (const ctor of classDecl.getConstructors()) {
      for (const stmt of ctor.getStatements()) {
        const text = stmt.getText();
        // Match: this.<name> = <locator expression>
        const match = text.match(/^this\.(\w+)\s*=/);
        if (match && isLocatorExpression(text)) {
          const name = match[1];
          if (!existingSelectors.includes(name)) {
            existingSelectors.push(name);
          }
        }
      }
    }

    entries.push({
      filePath,
      relativePath: relative(rootDir, filePath).replace(/\\/g, '/'),
      className,
      routeHints: extractRouteHints(className, filePath, rootDir),
      existingSelectors,
    });
  }

  return entries;
}

function isLocatorExpression(text: string): boolean {
  return (
    text.includes('locator(') ||
    text.includes('getByTestId(') ||
    text.includes('getByLabel(') ||
    text.includes('getByRole(') ||
    text.includes('getByText(') ||
    text.includes('getByPlaceholder(') ||
    text.includes('cy.get(') ||
    text.includes('cy.contains(')
  );
}

function extractRouteHints(className: string, filePath: string, rootDir: string): string[] {
  const hints = new Set<string>();

  // From class name: LoginPage → ['login'], CheckoutConfirmPage → ['checkout', 'confirm']
  const words = className
    .replace(/Page$|PageObject$|POM$/, '')
    .split(/(?=[A-Z])/)
    .map(w => w.toLowerCase())
    .filter(w => w.length > 2);
  words.forEach(w => hints.add(w));

  // From file path segments: pages/auth/login-page.ts → ['auth', 'login']
  const relPath = relative(rootDir, filePath).replace(/\\/g, '/');
  const segments = relPath.split('/').flatMap(seg =>
    seg.replace(/\.(ts|js|tsx|jsx)$/, '').split(/[-_]/)
  );
  const skip = new Set(['src', 'test', 'tests', 'e2e', 'pages', 'spec', 'specs', 'support', 'page', 'object', 'pom']);
  for (const seg of segments) {
    const clean = seg.toLowerCase().replace(/page$|object$/, '').trim();
    if (clean.length > 2 && !skip.has(clean)) hints.add(clean);
  }

  return [...hints];
}
