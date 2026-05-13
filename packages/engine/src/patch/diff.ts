import { createTwoFilesPatch } from 'diff';

export function generateUnifiedDiff(
  originalSource: string,
  newSource: string,
  filePath: string,
): string {
  return createTwoFilesPatch(
    filePath,
    filePath,
    originalSource,
    newSource,
    'original',
    'modified',
  );
}
