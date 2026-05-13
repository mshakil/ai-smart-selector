export { detectFramework, type Framework } from './analyzer/framework-detector';
export { findPOMFiles } from './analyzer/pom-finder';
export { parsePageObject } from './analyzer/pom-parser';
export {
  createIndex,
  scanRepository,
  watchRepository,
  type PageObjectEntry,
  type RepositoryIndex,
} from './analyzer/repository-index';
export { findTargetFiles, type PageMapResult } from './mapper/page-mapper';
export { isDuplicateProperty } from './generator/duplicate-checker';
export { generateInsertion, type GeneratedInsertion, type CodeGenerationInput } from './generator/code-generator';
export { generateUnifiedDiff } from './patch/diff';
export { PatchManager, type StagedPatch } from './patch/patch-manager';
export { loadProjectConfig, type SmartLocatorProjectConfig } from './config/project-config';
