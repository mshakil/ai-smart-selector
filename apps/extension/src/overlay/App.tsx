import { useState, useEffect } from 'react';
import type {
  SelectorCandidatesEvent,
  SelectorCandidate,
  PatchPreviewEvent,
  PatchAppliedEvent,
  ActionType,
} from '@smartlocator/shared';
import type { OverlayState } from './store';

export interface OverlayCallbacks {
  onRequestPatch: (candidate: SelectorCandidate, targetFile: string, elementName: string, action: ActionType) => void;
  onApprovePatch: (patchId: string) => void;
  onRejectPatch: (patchId: string) => void;
  onRollbackPatch: (patchId: string) => void;
  onClose: () => void;
}

interface Props {
  state: OverlayState;
  callbacks: OverlayCallbacks;
}

const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

export function OverlayApp({ state, callbacks }: Props) {
  if (state.type === 'idle') return null;

  return (
    <div style={{
      position: 'fixed',
      top: '16px',
      right: '16px',
      zIndex: 2147483647,
      width: '420px',
      pointerEvents: 'auto',
      fontFamily: FONT,
    }}>
      {state.type === 'capture-ready'  && <CaptureReadyToast />}
      {state.type === 'disconnected'   && <DisconnectedToast message={state.message} />}
      {state.type === 'error'          && <ErrorToast message={state.message} />}
      {state.type === 'candidates'     && <CandidatesPanel payload={state.candidates} callbacks={callbacks} />}
      {state.type === 'patch-preview'  && <PatchPreviewPanel patch={state.patch} callbacks={callbacks} />}
      {state.type === 'patch-applied'  && (
        <PatchAppliedToast applied={state.applied} onUndo={() => callbacks.onRollbackPatch(state.applied.patchId)} />
      )}
    </div>
  );
}

// ── Status toasts ─────────────────────────────────────────────────────────────

function StatusCard({ accent, icon, title, body }: { accent: string; icon: string; title: string; body?: string }) {
  return (
    <div style={{
      background: '#1e1e2e',
      border: `1px solid ${accent}40`,
      borderLeft: `3px solid ${accent}`,
      borderRadius: '12px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      padding: '14px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    }}>
      <span style={{ fontSize: '18px', flexShrink: 0 }}>{icon}</span>
      <div>
        <div style={{ color: accent, fontSize: '12px', fontWeight: 700 }}>{title}</div>
        {body && <div style={{ color: '#7f849c', fontSize: '11px', marginTop: '2px' }}>{body}</div>}
      </div>
    </div>
  );
}

function CaptureReadyToast() {
  return <StatusCard accent="#89b4fa" icon="⊕" title="Click any element to capture" body="Press ESC to cancel" />;
}
function DisconnectedToast({ message }: { message?: string }) {
  return <StatusCard accent="#f38ba8" icon="!" title="Agent not connected" body={message ?? 'Run: smartlocator start'} />;
}
function ErrorToast({ message }: { message?: string }) {
  return <StatusCard accent="#f9e2af" icon="⚠" title="Error" body={message ?? 'Something went wrong'} />;
}

// ── Step indicator ────────────────────────────────────────────────────────────

function Steps({ current }: { current: 1 | 2 | 3 }) {
  const steps = ['Select', 'Configure', 'Preview'];
  return (
    <div className="flex items-center gap-1 text-[10px]">
      {steps.map((s, i) => {
        const n = i + 1;
        const active = n === current;
        const done   = n < current;
        return (
          <div key={s} className="flex items-center gap-1">
            <span className={`
              w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0
              ${active ? 'bg-blue text-crust' : done ? 'bg-green/30 text-green' : 'bg-border text-muted'}
            `}>
              {done ? '✓' : n}
            </span>
            <span className={active ? 'text-text font-semibold' : done ? 'text-green' : 'text-muted'}>
              {s}
            </span>
            {i < steps.length - 1 && <span className="text-border mx-0.5">›</span>}
          </div>
        );
      })}
    </div>
  );
}

// ── Action type pills ─────────────────────────────────────────────────────────

const ACTION_OPTIONS: { value: ActionType; label: string; hint: string }[] = [
  { value: 'click',  label: 'Click',  hint: 'buttons, links' },
  { value: 'fill',   label: 'Fill',   hint: 'text inputs' },
  { value: 'check',  label: 'Check',  hint: 'checkboxes' },
  { value: 'select', label: 'Select', hint: 'dropdowns' },
  { value: 'hover',  label: 'Hover',  hint: 'menus' },
  { value: 'focus',  label: 'Focus',  hint: 'fields' },
  { value: 'clear',  label: 'Clear',  hint: 'inputs' },
];

function ActionPicker({ value, onChange }: { value: ActionType; onChange: (a: ActionType) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {ACTION_OPTIONS.map(opt => (
        <button
          key={opt.value}
          type="button"
          title={opt.hint}
          onClick={() => onChange(opt.value)}
          className={`
            px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all
            ${value === opt.value
              ? 'bg-blue text-crust border-blue'
              : 'bg-surface border-border text-muted hover:border-blue/50 hover:text-text'}
          `}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ── Candidates panel ──────────────────────────────────────────────────────────

function CandidatesPanel({
  payload,
  callbacks,
}: {
  payload: SelectorCandidatesEvent['payload'];
  callbacks: OverlayCallbacks;
}) {
  const [showForm, setShowForm]       = useState(false);
  const [elementName, setElementName] = useState('');
  const [action, setAction]           = useState<ActionType>('click');
  const [targetFile, setTargetFile]   = useState(
    payload.targetFileRecommendation || payload.availableFiles[0] || ''
  );
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [copiedIdx, setCopied]        = useState<number | null>(null);

  const all = [payload.primary, ...payload.fallbacks];
  const selected = all[selectedIdx];

  function copy(sel: string, i: number) {
    void navigator.clipboard.writeText(sel).then(() => {
      setCopied(i);
      setTimeout(() => setCopied(c => c === i ? null : c), 2000);
    });
  }

  function submit() {
    const name = elementName.trim();
    const file = targetFile.trim();
    if (!name || !file) return;
    callbacks.onRequestPatch(selected, file, name, action);
  }

  const canSubmit = elementName.trim().length > 0 && targetFile.trim().length > 0;

  return (
    <div className="bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden text-[13px] flex flex-col">

      {/* ── Header ── */}
      <div className="bg-crust border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-text font-bold text-sm tracking-tight">SmartLocator</span>
          {payload.aiUsed && (
            <span className="bg-blue/20 text-blue rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wide">AI</span>
          )}
          <div className="w-px h-3.5 bg-border" />
          <Steps current={showForm ? 2 : 1} />
        </div>
        <button
          onClick={callbacks.onClose}
          className="text-muted hover:text-text transition-colors w-6 h-6 flex items-center justify-center rounded hover:bg-overlay text-sm"
          title="Close"
        >✕</button>
      </div>

      {/* ── Selected selector preview ── */}
      <div className="px-4 pt-3 pb-2">
        <div className="text-muted text-[10px] font-semibold uppercase tracking-wider mb-1.5">
          Best selector
        </div>
        <div className="bg-crust rounded-lg px-3 py-2 flex items-center gap-2 border border-border">
          <span className="bg-blue/15 text-blue rounded px-1.5 py-0.5 text-[9px] font-bold shrink-0">
            {selected.strategy}
          </span>
          <code className="text-green text-xs flex-1 truncate">{selected.selector}</code>
          <span className={`text-[11px] font-semibold tabular-nums shrink-0 ${
            selected.confidence >= 80 ? 'text-green' : selected.confidence >= 60 ? 'text-yellow' : 'text-red'
          }`}>{selected.confidence}%</span>
          <button
            onClick={() => copy(selected.selector, selectedIdx)}
            className="text-muted hover:text-text text-[10px] shrink-0 transition-colors"
          >
            {copiedIdx === selectedIdx ? '✓' : 'Copy'}
          </button>
        </div>
      </div>

      {/* ── Candidate list (collapsed when form open) ── */}
      {!showForm && (
        <div className="px-4 pb-2">
          <div className="text-muted text-[10px] font-semibold uppercase tracking-wider mb-1.5">
            {all.length} candidate{all.length !== 1 ? 's' : ''} — click to switch
          </div>
          <div className="rounded-lg border border-border overflow-hidden">
            {all.map((c, i) => {
              const isSelected = selectedIdx === i;
              const barColor = c.confidence >= 80 ? 'bg-green' : c.confidence >= 60 ? 'bg-yellow' : 'bg-red';
              return (
                <div
                  key={i}
                  onClick={() => setSelectedIdx(i)}
                  className={`flex items-center gap-2 px-3 py-2 cursor-pointer border-b border-border last:border-b-0 transition-colors
                    ${isSelected ? 'bg-blue/10' : 'hover:bg-overlay/50'}`}
                >
                  {isSelected && <span className="text-blue text-[10px] shrink-0">›</span>}
                  <span className="bg-border/60 text-subtext rounded px-1.5 py-0.5 text-[9px] shrink-0">{c.strategy}</span>
                  <code className="text-text text-[11px] flex-1 truncate">{c.selector}</code>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="h-1 w-10 rounded-full bg-border overflow-hidden">
                      <div className={`h-full rounded-full ${barColor}`} style={{ width: `${c.confidence}%` }} />
                    </div>
                    <span className="text-muted text-[10px] tabular-nums w-7 text-right">{c.confidence}%</span>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); copy(c.selector, i); }}
                    className="text-muted hover:text-text text-[10px] shrink-0"
                  >{copiedIdx === i ? '✓' : 'Copy'}</button>
                </div>
              );
            })}
          </div>

          {/* File recommendation */}
          {payload.targetFileRecommendation && (
            <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted">
              <span>Suggested file:</span>
              <code className="text-blue truncate">{payload.targetFileRecommendation}</code>
              <span className="text-border">({payload.targetFileConfidence}% match)</span>
            </div>
          )}
        </div>
      )}

      {/* ── Divider ── */}
      <div className="border-t border-border" />

      {/* ── Configure form ── */}
      {!showForm ? (
        <div className="px-4 py-3">
          <button
            onClick={() => setShowForm(true)}
            className="w-full bg-blue text-crust text-[12px] font-bold rounded-lg py-2.5 hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            Configure & Generate Code
            <span className="opacity-70">›</span>
          </button>
        </div>
      ) : (
        <div className="px-4 pt-3 pb-4 flex flex-col gap-3">

          {/* Property name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-muted text-[10px] font-bold uppercase tracking-wider">
              Property name <span className="text-red">*</span>
            </label>
            <input
              autoFocus
              className="bg-crust border border-border rounded-lg px-3 py-2 text-text text-xs outline-none focus:border-blue transition-colors placeholder:text-muted/60"
              placeholder="e.g. submitButton, loginInput"
              value={elementName}
              onChange={e => setElementName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && canSubmit) submit(); }}
            />
          </div>

          {/* Action type */}
          <div className="flex flex-col gap-1.5">
            <label className="text-muted text-[10px] font-bold uppercase tracking-wider">
              Action method
            </label>
            <ActionPicker value={action} onChange={setAction} />
            <div className="text-muted/60 text-[10px]">
              Generates: <code className="text-subtext">{action}{elementName ? elementName.charAt(0).toUpperCase() + elementName.slice(1) : 'Element'}()</code>
            </div>
          </div>

          {/* Target file */}
          <div className="flex flex-col gap-1.5">
            <label className="text-muted text-[10px] font-bold uppercase tracking-wider">
              Target file <span className="text-red">*</span>
            </label>
            {payload.availableFiles.length > 0 ? (
              <select
                className="bg-crust border border-border rounded-lg px-3 py-2 text-text text-xs outline-none focus:border-blue transition-colors"
                value={targetFile}
                onChange={e => setTargetFile(e.target.value)}
              >
                {!payload.availableFiles.includes(targetFile) && targetFile && (
                  <option value={targetFile}>{targetFile}</option>
                )}
                {payload.availableFiles.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            ) : (
              <input
                className="bg-crust border border-border rounded-lg px-3 py-2 text-text text-xs outline-none focus:border-blue transition-colors placeholder:text-muted/60"
                placeholder="path/to/page-object.ts"
                value={targetFile}
                onChange={e => setTargetFile(e.target.value)}
              />
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 border border-border text-muted text-[11px] font-semibold rounded-lg py-2 hover:text-text hover:border-overlay transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={submit}
              disabled={!canSubmit}
              className="flex-[2] bg-blue text-crust text-[12px] font-bold rounded-lg py-2 hover:opacity-90 transition-opacity disabled:opacity-30"
            >
              Preview Changes →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Patch preview panel ───────────────────────────────────────────────────────

function PatchPreviewPanel({ patch, callbacks }: { patch: PatchPreviewEvent['payload']; callbacks: OverlayCallbacks }) {
  const filename = patch.targetFile.split(/[\\/]/).pop() ?? patch.targetFile;

  return (
    <div className="bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden text-[13px] flex flex-col">

      {/* Header */}
      <div className="bg-crust border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-text font-bold text-sm tracking-tight">SmartLocator</span>
          <div className="w-px h-3.5 bg-border" />
          <Steps current={3} />
        </div>
        <button
          onClick={callbacks.onClose}
          className="text-muted hover:text-text transition-colors w-6 h-6 flex items-center justify-center rounded hover:bg-overlay text-sm"
          title="Close"
        >✕</button>
      </div>

      {/* File + stats bar */}
      <div className="px-4 pt-3 pb-2 flex items-center gap-2">
        <span className="text-muted text-[10px] font-bold uppercase tracking-wider">File</span>
        <code className="bg-crust border border-border rounded-md px-2 py-0.5 text-blue text-[10px] flex-1 truncate">{filename}</code>
        <span className="bg-green/15 text-green text-[10px] font-bold rounded px-1.5 py-0.5">+{patch.additions}</span>
        <span className="bg-red/15 text-red text-[10px] font-bold rounded px-1.5 py-0.5">-{patch.deletions}</span>
      </div>

      {/* Diff viewer */}
      <div className="mx-4 mb-3 rounded-lg border border-border overflow-hidden">
        <div className="max-h-64 overflow-y-auto bg-crust">
          <pre className="text-[11px] leading-relaxed p-3 font-mono">
            {patch.diff.split('\n').map((line, i) => {
              const isAdd = line.startsWith('+') && !line.startsWith('+++');
              const isDel = line.startsWith('-') && !line.startsWith('---');
              const isHunk = line.startsWith('@@');
              return (
                <div
                  key={i}
                  className={`-mx-3 px-3 ${isAdd ? 'bg-green/10 text-green' : isDel ? 'bg-red/10 text-red' : isHunk ? 'text-blue' : 'text-muted'}`}
                >
                  {line || ' '}
                </div>
              );
            })}
          </pre>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 pb-4 flex gap-2">
        <button
          onClick={() => callbacks.onRejectPatch(patch.patchId)}
          className="flex-1 border border-border text-muted text-[11px] font-semibold rounded-lg py-2.5 hover:border-red/50 hover:text-red transition-colors"
        >
          Discard
        </button>
        <button
          onClick={() => callbacks.onApprovePatch(patch.patchId)}
          className="flex-[2] bg-green text-crust text-[12px] font-bold rounded-lg py-2.5 hover:opacity-90 transition-opacity"
        >
          Apply to file ✓
        </button>
      </div>
    </div>
  );
}

// ── Patch applied toast ───────────────────────────────────────────────────────

function PatchAppliedToast({ applied, onUndo }: { applied: PatchAppliedEvent['payload']; onUndo: () => void }) {
  const [progress, setProgress] = useState(100);
  const DURATION = 8000;

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      setProgress(Math.max(0, 100 - (elapsed / DURATION) * 100));
      if (elapsed >= DURATION) clearInterval(interval);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  if (progress <= 0) return null;

  const filename = applied.targetFile.split(/[\\/]/).pop() ?? applied.targetFile;

  return (
    <div className="bg-surface border border-green/30 rounded-2xl shadow-2xl overflow-hidden">
      {/* Progress bar */}
      <div className="h-0.5 bg-border">
        <div className="h-full bg-green transition-all" style={{ width: `${progress}%` }} />
      </div>
      <div className="px-4 py-3 flex items-center gap-3">
        <div className="w-7 h-7 rounded-full bg-green/20 flex items-center justify-center shrink-0">
          <span className="text-green text-sm font-bold">✓</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-text text-[12px] font-semibold">Changes applied</div>
          <div className="text-muted text-[10px] truncate">{filename}</div>
        </div>
        <button
          onClick={onUndo}
          className="text-muted text-[11px] hover:text-text border border-border rounded-md px-2.5 py-1 transition-colors shrink-0"
        >
          Undo
        </button>
      </div>
    </div>
  );
}
