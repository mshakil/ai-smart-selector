import type { IFrameworkAdapter, ActionType, GeneratedCode } from '../interface';
import { toPascalCase } from '../utils/naming';

export class CypressAdapter implements IFrameworkAdapter {
  readonly framework = 'cypress';

  generateCode(selector: string, elementName: string, action: ActionType): GeneratedCode {
    const locatorProperty = this.buildGetterMethod(selector, elementName);
    const actionMethod = this.buildActionMethod(elementName, action);
    return { locatorProperty, actionMethod, imports: [] };
  }

  private buildGetterMethod(selector: string, elementName: string): string {
    const methodName = `get${toPascalCase(elementName)}`;
    const chainable = selector.startsWith('text=')
      ? `cy.contains('${selector.slice(5)}')`
      : `cy.get('${selector}')`;
    return [
      `  ${methodName}() {`,
      `    return ${chainable};`,
      `  }`,
    ].join('\n');
  }

  private buildActionMethod(elementName: string, action: ActionType): string {
    const methodName = `${action}${toPascalCase(elementName)}`;
    const getterName = `get${toPascalCase(elementName)}`;
    const params = this.needsValueParam(action) ? 'value: string' : '';
    const chain = this.buildActionChain(action);
    return [
      `  ${methodName}(${params}) {`,
      `    return this.${getterName}()${chain};`,
      `  }`,
    ].join('\n');
  }

  private buildActionChain(action: ActionType): string {
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

  private needsValueParam(action: ActionType): boolean {
    return action === 'fill' || action === 'select';
  }
}
