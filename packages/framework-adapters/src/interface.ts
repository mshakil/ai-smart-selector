export type ActionType = 'click' | 'fill' | 'check' | 'select' | 'hover' | 'focus' | 'clear';

export interface GeneratedCode {
  locatorProperty: string;
  actionMethod: string;
  imports: string[];
}

export interface IFrameworkAdapter {
  readonly framework: string;
  generateCode(selector: string, elementName: string, action: ActionType): GeneratedCode;
}
