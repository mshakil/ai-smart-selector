import { Project } from 'ts-morph';

export function isDuplicateProperty(filePath: string, className: string, propertyName: string): boolean {
  const project = new Project({
    skipAddingFilesFromTsConfig: true,
    compilerOptions: { allowJs: true, checkJs: false },
  });

  let sourceFile;
  try {
    sourceFile = project.addSourceFileAtPath(filePath);
  } catch {
    return false;
  }

  const classDecl = sourceFile.getClass(className);
  if (!classDecl) return false;

  return classDecl.getProperties().some(p => p.getName() === propertyName);
}
