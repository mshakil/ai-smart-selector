export type { ActionType } from '@smartlocator/shared';
import type { ActionType } from '@smartlocator/shared';

export interface GeneratedCode {
  locatorProperty: string;
  actionMethod: string;
  imports: string[];
}

export interface IFrameworkAdapter {
  readonly framework: string;
  generateCode(selector: string, elementName: string, action: ActionType): GeneratedCode;
}
