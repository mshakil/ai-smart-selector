import { Project } from 'ts-morph';

const COMPILER_OPTIONS = {
  skipAddingFilesFromTsConfig: true,
  compilerOptions: { allowJs: true, checkJs: false },
} as const;

// Shared Project instance for read-only operations (pom-parser, duplicate-checker).
// Avoids the cost of creating a new TypeScript compiler host per call.
let _shared: Project | null = null;

export function getReadOnlyProject(): Project {
  if (!_shared) _shared = new Project(COMPILER_OPTIONS);
  return _shared;
}

// Code-generator mutates the AST, so it gets a fresh isolated project per call.
export function makeFreshProject(): Project {
  return new Project(COMPILER_OPTIONS);
}
