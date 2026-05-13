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

  // Check property-style declarations
  const hasProperty = classDecl.getProperties().some(p => p.getName() === propertyName);
  if (hasProperty) return true;

  // Check constructor-style: this.<propertyName> = ...
  for (const ctor of classDecl.getConstructors()) {
    const hasAssignment = ctor.getStatements().some(stmt => {
      return stmt.getText().match(new RegExp(`^this\\.${propertyName}\\s*=`));
    });
    if (hasAssignment) return true;
  }

  return false;
}
