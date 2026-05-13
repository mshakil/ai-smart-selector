import { readFileSync, writeFileSync } from 'fs';
import { generateUnifiedDiff } from './diff';
import { generateInsertion, type CodeGenerationInput } from '../generator/code-generator';
import { isDuplicateProperty } from '../generator/duplicate-checker';

export interface StagedPatch {
  id: string;
  filePath: string;
  className: string;
  propertyName: string;
  originalSource: string;
  newSource: string;
  diff: string;
}

const HISTORY_LIMIT = 20;

export class PatchManager {
  private staged = new Map<string, StagedPatch>();
  private history: StagedPatch[] = [];

  stage(input: CodeGenerationInput): StagedPatch | { error: string } {
    if (isDuplicateProperty(input.filePath, input.className, input.propertyName)) {
      return { error: `Property "${input.propertyName}" already exists in ${input.className}` };
    }

    let originalSource: string;
    try {
      originalSource = readFileSync(input.filePath, 'utf8');
    } catch {
      return { error: `Cannot read file: ${input.filePath}` };
    }

    const insertion = generateInsertion(input);
    if (!insertion) {
      return { error: `Failed to generate code for class "${input.className}" in ${input.filePath}` };
    }

    const diff = generateUnifiedDiff(originalSource, insertion.newSource, input.filePath);
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const patch: StagedPatch = {
      id,
      filePath: input.filePath,
      className: input.className,
      propertyName: input.propertyName,
      originalSource,
      newSource: insertion.newSource,
      diff,
    };

    this.staged.set(id, patch);
    return patch;
  }

  apply(id: string): boolean {
    const patch = this.staged.get(id);
    if (!patch) return false;
    try {
      writeFileSync(patch.filePath, patch.newSource, 'utf8');
      this.staged.delete(id);
      this.history.push(patch);
      if (this.history.length > HISTORY_LIMIT) this.history.shift();
      return true;
    } catch {
      return false;
    }
  }

  reject(id: string): boolean {
    return this.staged.delete(id);
  }

  rollback(id: string): boolean {
    const idx = this.history.findIndex(p => p.id === id);
    if (idx === -1) return false;
    const patch = this.history[idx];
    try {
      writeFileSync(patch.filePath, patch.originalSource, 'utf8');
      this.history.splice(idx, 1);
      return true;
    } catch {
      return false;
    }
  }

  get(id: string): StagedPatch | undefined {
    return this.staged.get(id) ?? this.history.find(p => p.id === id);
  }

  getHistory(): readonly StagedPatch[] {
    return this.history;
  }
}
