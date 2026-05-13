import { Project } from 'ts-morph';
import { relative } from 'path';
import type { PageObjectEntry } from './repository-index';

export function parsePageObject(filePath: string, rootDir: string): PageObjectEntry[] {
  const project = new Project({
    skipAddingFilesFromTsConfig: true,
    compilerOptions: { allowJs: true, checkJs: false },
  });

  let sourceFile;
  try {
    sourceFile = project.addSourceFileAtPath(filePath);
  } catch {
    return [];
  }

  const entries: PageObjectEntry[] = [];

  for (const classDecl of sourceFile.getClasses()) {
    const className = classDecl.getName();
    if (!className) continue;

    // Collect names of existing locator properties (for duplicate prevention).
    const existingSelectors: string[] = [];
    for (const prop of classDecl.getProperties()) {
      const init = prop.getInitializer()?.getText() ?? '';
      if (
        init.includes('page.') ||
        init.includes('locator(') ||
        init.includes('getBy') ||
        init.includes('cy.get(') ||
        init.includes('cy.contains(')
      ) {
        existingSelectors.push(prop.getName());
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
