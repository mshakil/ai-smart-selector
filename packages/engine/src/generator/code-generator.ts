import { Project } from 'ts-morph';
import type { Framework } from '../analyzer/framework-detector';

export interface GeneratedInsertion {
  filePath: string;
  className: string;
  propertyName: string;
  newSource: string;
}

export interface CodeGenerationInput {
  filePath: string;
  className: string;
  propertyName: string;
  selector: string;
  selectorStrategy: string;
  framework: Framework;
}

export function generateInsertion(input: CodeGenerationInput): GeneratedInsertion | null {
  const project = new Project({
    skipAddingFilesFromTsConfig: true,
    compilerOptions: { allowJs: true, checkJs: false },
  });

  let sourceFile;
  try {
    sourceFile = project.addSourceFileAtPath(input.filePath);
  } catch {
    return null;
  }

  const classDecl = sourceFile.getClass(input.className);
  if (!classDecl) return null;

  const locatorText = buildLocatorExpression(input.selector, input.selectorStrategy, input.framework);

  const lastProp = classDecl.getProperties().at(-1);
  if (lastProp) {
    lastProp.appendWhitespace('\n  ');
    classDecl.addProperty({ name: input.propertyName, initializer: locatorText, isReadonly: input.framework === 'playwright' });
  } else {
    // No existing properties — insert before first method or at start of class body
    const firstMember = classDecl.getMembers()[0];
    if (firstMember) {
      firstMember.prependWhitespace('  ');
      classDecl.insertProperty(0, { name: input.propertyName, initializer: locatorText, isReadonly: input.framework === 'playwright' });
    } else {
      classDecl.addProperty({ name: input.propertyName, initializer: locatorText, isReadonly: input.framework === 'playwright' });
    }
  }

  return {
    filePath: input.filePath,
    className: input.className,
    propertyName: input.propertyName,
    newSource: sourceFile.getFullText(),
  };
}

function buildLocatorExpression(selector: string, strategy: string, framework: Framework): string {
  if (framework === 'playwright') {
    switch (strategy) {
      case 'data-testid': return `this.page.getByTestId(${JSON.stringify(selector.replace(/^\[data-testid=["']?|["']?\]$/g, ''))})`;
      case 'aria-label': return `this.page.getByLabel(${JSON.stringify(selector.replace(/^\[aria-label=["']?|["']?\]$/g, ''))})`;
      case 'role': return `this.page.getByRole(${JSON.stringify(selector.replace(/^\[role=["']?|["']?\]$/g, ''))})`;
      case 'text': return `this.page.getByText(${JSON.stringify(selector)})`;
      default: return `this.page.locator(${JSON.stringify(selector)})`;
    }
  } else {
    // cypress
    if (strategy === 'text') return `cy.contains(${JSON.stringify(selector)})`;
    return `cy.get(${JSON.stringify(selector)})`;
  }
}

