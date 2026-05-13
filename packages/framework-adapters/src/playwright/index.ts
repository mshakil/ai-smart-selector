import type { IFrameworkAdapter, ActionType, GeneratedCode } from '../interface';
import { toCamelCase, toPascalCase } from '../utils/naming';

export class PlaywrightAdapter implements IFrameworkAdapter {
  readonly framework = 'playwright';

  generateCode(selector: string, elementName: string, action: ActionType): GeneratedCode {
    const propName = toCamelCase(elementName);
    const locator = this.buildLocator(selector);

    const locatorProperty = `  readonly ${propName} = ${locator};`;
    const actionMethod = this.buildActionMethod(propName, elementName, action);

    return { locatorProperty, actionMethod, imports: [] };
  }

  private buildLocator(selector: string): string {
    if (selector.startsWith('[data-testid="') && selector.endsWith('"]')) {
      return `this.page.getByTestId('${selector.slice(14, -2)}')`;
    }
    if (selector.startsWith('[aria-label="') && selector.endsWith('"]')) {
      return `this.page.getByLabel('${selector.slice(13, -2)}')`;
    }
    if (selector.startsWith('text=')) {
      return `this.page.getByText('${selector.slice(5)}')`;
    }
    if (selector.startsWith('[role="') && selector.endsWith('"]')) {
      return `this.page.getByRole('${selector.slice(7, -2)}')`;
    }
    return `this.page.locator('${selector}')`;
  }

  private buildActionMethod(propName: string, elementName: string, action: ActionType): string {
    const methodName = `${action}${toPascalCase(elementName)}`;
    const params = this.needsValueParam(action) ? 'value: string' : '';
    const body = this.buildActionBody(propName, action);
    return [
      `  async ${methodName}(${params}) {`,
      `    ${body}`,
      `  }`,
    ].join('\n');
  }

  private buildActionBody(propName: string, action: ActionType): string {
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

  private needsValueParam(action: ActionType): boolean {
    return action === 'fill' || action === 'select';
  }
}
