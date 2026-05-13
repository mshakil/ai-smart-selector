export function toCamelCase(name: string): string {
  return name
    .replace(/[-_\s]+(.)/g, (_, c: string) => c.toUpperCase())
    .replace(/^(.)/, (c) => c.toLowerCase());
}

export function toPascalCase(name: string): string {
  const camel = toCamelCase(name);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}
