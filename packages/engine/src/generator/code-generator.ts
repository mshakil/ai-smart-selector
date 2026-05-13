import { Project, type ClassDeclaration, type ConstructorDeclaration } from 'ts-morph';
import type { Framework } from '../analyzer/framework-detector';
import type { ActionType } from '@smartlocator/shared';

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
  action: ActionType;
}

type SelectorConvention = 'property' | 'constructor';

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

  const convention = detectConvention(classDecl);

  if (convention === 'constructor') {
    const ctor = classDecl.getConstructors()[0];
    if (!ctor) return null;

    const pageParam = detectPageParam(ctor);
    const locatorText = buildLocatorExpression(
      input.selector, input.selectorStrategy, input.framework, pageParam
    );

    // Add property declaration with type annotation (no initializer)
    const lastProp = classDecl.getProperties().at(-1);
    if (lastProp) lastProp.appendWhitespace('\n  ');
    classDecl.addProperty({ name: input.propertyName, type: 'Locator' });

    // Add assignment at the end of the constructor body
    ctor.addStatements(`this.${input.propertyName} = ${locatorText};`);

    // Ensure Locator is imported from @playwright/test
    if (input.framework === 'playwright') {
      const pwImport = sourceFile.getImportDeclaration(d =>
        d.getModuleSpecifierValue().includes('@playwright/test')
      );
      if (pwImport) {
        const already = pwImport.getNamedImports().some(n => n.getName() === 'Locator');
        if (!already) pwImport.addNamedImport('Locator');
      } else {
        sourceFile.insertImportDeclaration(0, {
          moduleSpecifier: '@playwright/test',
          namedImports: ['Locator'],
        });
      }
    }
  } else {
    // property-style: readonly initializer on the class body
    const locatorText = buildLocatorExpression(
      input.selector, input.selectorStrategy, input.framework, 'this.page'
    );

    const lastProp = classDecl.getProperties().at(-1);
    if (lastProp) {
      lastProp.appendWhitespace('\n  ');
      classDecl.addProperty({
        name: input.propertyName,
        initializer: locatorText,
        isReadonly: input.framework === 'playwright',
      });
    } else {
      const firstMember = classDecl.getMembers()[0];
      if (firstMember) {
        firstMember.prependWhitespace('  ');
        classDecl.insertProperty(0, {
          name: input.propertyName,
          initializer: locatorText,
          isReadonly: input.framework === 'playwright',
        });
      } else {
        classDecl.addProperty({
          name: input.propertyName,
          initializer: locatorText,
          isReadonly: input.framework === 'playwright',
        });
      }
    }
  }

  // Always add the action method regardless of locator convention
  addActionMethod(classDecl, input.propertyName, input.action, input.framework);

  return {
    filePath: input.filePath,
    className: input.className,
    propertyName: input.propertyName,
    newSource: sourceFile.getFullText(),
  };
}

// ── Convention detection ──────────────────────────────────────────────────────

function detectConvention(classDecl: ClassDeclaration): SelectorConvention {
  // Property-style: class has properties with locator initializers
  const hasPropertyLocators = classDecl.getProperties().some(prop => {
    const init = prop.getInitializer()?.getText() ?? '';
    return isLocatorExpression(init);
  });
  if (hasPropertyLocators) return 'property';

  // Constructor-style: constructor body has this.x = <locator> assignments
  const ctor = classDecl.getConstructors()[0];
  if (ctor) {
    const hasCtorLocators = ctor.getStatements().some(stmt => {
      const text = stmt.getText();
      return text.startsWith('this.') && isLocatorExpression(text);
    });
    if (hasCtorLocators) return 'constructor';
  }

  return 'property'; // default to modern property-style
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

// Detect the Page parameter name from the constructor signature (e.g. "page", "p", "browserPage")
function detectPageParam(ctor: ConstructorDeclaration): string {
  for (const param of ctor.getParameters()) {
    const name = param.getName();
    const typeText = param.getTypeNode()?.getText() ?? '';
    if (typeText === 'Page' || name === 'page') return name;
  }
  // Fall back: first parameter, or literal 'page'
  return ctor.getParameters()[0]?.getName() ?? 'page';
}

// ── Action method insertion ───────────────────────────────────────────────────

function addActionMethod(
  classDecl: ClassDeclaration,
  propName: string,
  action: ActionType,
  framework: Framework,
): void {
  const pascal = toPascalCase(propName);
  const needsValue = action === 'fill' || action === 'select';

  if (framework === 'playwright') {
    const body = buildPlaywrightActionBody(propName, action);
    classDecl.addMethod({
      isAsync: true,
      name: `${action}${pascal}`,
      parameters: needsValue ? [{ name: 'value', type: 'string' }] : [],
      statements: [body],
    });
  } else {
    // Cypress: getter method + action method
    const getterName = `get${pascal}`;
    const chainable = buildCypressChainable(action);

    // Only add the getter if it doesn't already exist
    const hasGetter = classDecl.getMethods().some(m => m.getName() === getterName);
    if (!hasGetter) {
      classDecl.addMethod({
        name: getterName,
        statements: [`return this.${propName};`],
      });
    }

    classDecl.addMethod({
      name: `${action}${pascal}`,
      parameters: needsValue ? [{ name: 'value', type: 'string' }] : [],
      statements: [`return this.${getterName}()${chainable};`],
    });
  }
}

function buildPlaywrightActionBody(propName: string, action: ActionType): string {
  switch (action) {
    case 'click':  return `await this.${propName}.click();`;
    case 'fill':   return `await this.${propName}.fill(value);`;
    case 'check':  return `await this.${propName}.check();`;
    case 'select': return `await this.${propName}.selectOption(value);`;
    case 'hover':  return `await this.${propName}.hover();`;
    case 'focus':  return `await this.${propName}.focus();`;
    case 'clear':  return `await this.${propName}.clear();`;
  }
}

function buildCypressChainable(action: ActionType): string {
  switch (action) {
    case 'click':  return `.click()`;
    case 'fill':   return `.clear().type(value)`;
    case 'check':  return `.check()`;
    case 'select': return `.select(value)`;
    case 'hover':  return `.trigger('mouseover')`;
    case 'focus':  return `.focus()`;
    case 'clear':  return `.clear()`;
  }
}

function toPascalCase(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

// ── Locator expression builder ────────────────────────────────────────────────

function buildLocatorExpression(
  selector: string,
  strategy: string,
  framework: Framework,
  pageRef: string,
): string {
  if (framework === 'playwright') {
    switch (strategy) {
      case 'data-testid':
        return `${pageRef}.getByTestId(${JSON.stringify(selector.replace(/^\[data-testid=["']?|["']?\]$/g, ''))})`;
      case 'aria-label':
        return `${pageRef}.getByLabel(${JSON.stringify(selector.replace(/^\[aria-label=["']?|["']?\]$/g, ''))})`;
      case 'role':
        return `${pageRef}.getByRole(${JSON.stringify(selector.replace(/^\[role=["']?|["']?\]$/g, ''))})`;
      case 'text':
        return `${pageRef}.getByText(${JSON.stringify(selector)})`;
      default:
        return `${pageRef}.locator(${JSON.stringify(selector)})`;
    }
  } else {
    if (strategy === 'text') return `cy.contains(${JSON.stringify(selector)})`;
    return `cy.get(${JSON.stringify(selector)})`;
  }
}
