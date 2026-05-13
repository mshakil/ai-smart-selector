export interface DOMNodeContext {
  tagName: string;
  id?: string;
  classList: string[];
  attributes: Record<string, string>;
  textContent?: string;
}

export interface ElementCapturePayload {
  url: string;
  tagName: string;
  id?: string;
  classList: string[];
  textContent?: string;
  attributes: Record<string, string>;
  hierarchy: DOMNodeContext[];
  iframeContext?: string;
  shadowHost?: string;
}
