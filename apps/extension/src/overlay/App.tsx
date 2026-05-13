import { useState, useEffect } from 'react';
import type { SelectorCandidatesEvent, SelectorCandidate, PatchPreviewEvent, PatchAppliedEvent, ActionType } from '@smartlocator/shared';
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
    <div
      style={{
        position: 'fixed',
        top: '16px',
        right: '16px',
        zIndex: 2147483647,
        maxWidth: '400px',
        width: '100%',
        pointerEvents: 'auto',
        fontFamily: FONT,
      }}
    >
      {state.type === 'capture-ready' && <CaptureReadyToast />}
      {state.type === 'disconnected' && <DisconnectedToast message={state.message} />}
      {state.type === 'error' && <ErrorToast message={state.message} />}
      {state.type === 'candidates' && (
        <CandidatesPanel payload={state.candidates} callbacks={callbacks} />
      )}
      {state.type === 'patch-preview' && (
        <PatchPreviewPanel patch={state.patch} callbacks={callbacks} />
      )}
      {state.type === 'patch-applied' && (
        <PatchAppliedToast applied={state.applied} onUndo={() => callbacks.onRollbackPatch(state.applied.patchId)} />
      )}
    </div>
  );
}

// ── Status toasts ─────────────────────────────────────────────────────────────

function StatusCard({
  accent,
  icon,
  title,
  body,
}: {
  accent: string;
  icon: string;
  title: string;
  body?: string;
}) {
  return (
    <div style={{
      background: '#1e1e2e',
      border: `1px solid ${accent}`,
      borderLeft: `4px solid ${accent}`,
      borderRadius: '10px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.55)',
      padding: '12px 16px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '10px',
    }}>
      <span style={{ fontSize: '16px', lineHeight: 1, marginTop: '1px', flexShrink: 0 }}>{icon}</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: accent, fontSize: '12px', fontWeight: 700, letterSpacing: '0.02em' }}>
          {title}
        </div>
        {body && (
          <div style={{ color: '#a6adc8', fontSize: '11px', marginTop: '3px', lineHeight: 1.5 }}>
            {body}
          </div>
        )}
      </div>
    </div>
  );
}

function CaptureReadyToast() {
  return (
    <StatusCard
      accent="#89b4fa"
      icon="⊕"
      title="Click any element to capture"
      body="Press ESC to cancel"
    />
  );
}

function DisconnectedToast({ message }: { message?: string }) {
  return (
    <StatusCard
      accent="#f38ba8"
      icon="⚠"
      title="Agent not connected"
      body={message ?? 'Run:  node apps/cli/dist/index.js start'}
    />
  );
}

function ErrorToast({ message }: { message?: string }) {
  return (
    <StatusCard
      accent="#f9e2af"
      icon="✕"
      title="Error"
      body={message ?? 'Something went wrong'}
    />
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
  const [copiedIdx, setCopied] = useState<number | null>(null);
  const [expandedIdx, setExpanded] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [elementName, setElementName] = useState('');
  const [action, setAction] = useState<ActionType>('click');
  const [targetFile, setTargetFile] = useState(
    payload.targetFileRecommendation || payload.availableFiles[0] || ''
  );
  const [selectedIdx, setSelectedIdx] = useState(0);

  const all = [payload.primary, ...payload.fallbacks];

  function copy(sel: string, i: number) {
    void navigator.clipboard.writeText(sel).then(() => {
      setCopied(i);
      setTimeout(() => setCopied(c => (c === i ? null : c)), 2000);
    });
  }

  function submitGenerate() {
    const name = elementName.trim();
    const file = targetFile.trim();
    if (!name || !file) return;
    callbacks.onRequestPatch(all[selectedIdx], file, name, action);
    setShowForm(false);
  }

  return (
    <div className="bg-surface border border-border rounded-xl shadow-2xl overflow-hidden text-[13px]">

      {/* Header */}
      <div className="bg-crust border-b border-border px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-text font-semibold text-sm">SmartLocator</span>
          {payload.aiUsed && (
            <span className="bg-blue/20 text-blue rounded px-1.5 py-0.5 text-[10px] font-bold">AI</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted text-xs">{all.length} candidates</span>
          <button
            className="text-muted hover:text-text transition-colors text-sm leading-none"
            onClick={callbacks.onClose}
            title="Close"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Candidate rows */}
      <div>
        {all.map((c, i) => (
          <CandidateRow
            key={i}
            candidate={c}
            primary={i === 0}
            selected={selectedIdx === i}
            copied={copiedIdx === i}
            expanded={expandedIdx === i}
            onCopy={() => copy(c.selector, i)}
            onToggle={() => setExpanded(expandedIdx === i ? null : i)}
            onSelect={() => setSelectedIdx(i)}
          />
        ))}
      </div>

      {/* Target file recommendation */}
      {payload.targetFileRecommendation && (
        <div className="bg-crust border-t border-border px-4 py-2 text-muted text-xs">
          Target: <code className="text-sky">{payload.targetFileRecommendation}</code>
          <span className="text-muted ml-1">({payload.targetFileConfidence}% match)</span>
        </div>
      )}

      {/* Generate Code section */}
      {!showForm ? (
        <div className="bg-crust border-t border-border px-4 py-2.5 flex justify-end">
          <button
            className="bg-blue text-surface text-[11px] font-semibold rounded px-3 py-1.5 hover:opacity-90 transition-opacity"
            onClick={() => setShowForm(true)}
          >
            Generate Code
          </button>
        </div>
      ) : (
        <div className="bg-crust border-t border-border px-4 py-3 flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-muted text-[10px] font-semibold uppercase tracking-wide">
              Property name
            </label>
            <input
              className="bg-surface border border-border rounded px-2.5 py-1.5 text-text text-xs outline-none focus:border-blue"
              placeholder="e.g. submitButton"
              value={elementName}
              onChange={e => setElementName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') submitGenerate(); }}
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-muted text-[10px] font-semibold uppercase tracking-wide">
              Action
            </label>
            <select
              className="bg-surface border border-border rounded px-2.5 py-1.5 text-text text-xs outline-none focus:border-blue"
              value={action}
              onChange={e => setAction(e.target.value as ActionType)}
            >
              <option value="click">click</option>
              <option value="fill">fill (type text)</option>
              <option value="check">check (checkbox/radio)</option>
              <option value="select">select (dropdown)</option>
              <option value="hover">hover</option>
              <option value="focus">focus</option>
              <option value="clear">clear</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-muted text-[10px] font-semibold uppercase tracking-wide">
              Target file
            </label>
            {payload.availableFiles.length > 0 ? (
              <select
                className="bg-surface border border-border rounded px-2.5 py-1.5 text-text text-xs outline-none focus:border-blue"
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
                className="bg-surface border border-border rounded px-2.5 py-1.5 text-text text-xs outline-none focus:border-blue"
                placeholder="path/to/page.ts"
                value={targetFile}
                onChange={e => setTargetFile(e.target.value)}
              />
            )}
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <button
              className="text-muted text-[11px] hover:text-text transition-colors px-2 py-1"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </button>
            <button
              className="bg-blue text-surface text-[11px] font-semibold rounded px-3 py-1.5 hover:opacity-90 transition-opacity disabled:opacity-40"
              disabled={!elementName.trim() || !targetFile.trim()}
              onClick={submitGenerate}
            >
              Preview Patch
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Candidate row ─────────────────────────────────────────────────────────────

interface RowProps {
  candidate: SelectorCandidate;
  primary: boolean;
  selected: boolean;
  copied: boolean;
  expanded: boolean;
  onCopy: () => void;
  onToggle: () => void;
  onSelect: () => void;
}

function CandidateRow({ candidate, primary, selected, copied, expanded, onCopy, onToggle, onSelect }: RowProps) {
  const { selector, strategy, confidence, reasoning, source } = candidate;
  const barColor =
    confidence >= 80 ? 'bg-green' :
    confidence >= 60 ? 'bg-yellow' : 'bg-red';
  const scoreColor =
    confidence >= 80 ? 'text-green' :
    confidence >= 60 ? 'text-yellow' : 'text-red';

  return (
    <div
      className={`border-b border-crust last:border-b-0 cursor-pointer ${selected ? 'bg-overlay ring-1 ring-inset ring-blue/40' : primary ? 'bg-overlay/60' : ''}`}
      onClick={onSelect}
    >
      <div className="flex items-center gap-2 px-3.5 py-2">
        <div className="flex items-center gap-1.5 overflow-hidden flex-1 min-w-0">
          {primary && (
            <span className="bg-blue/20 text-blue rounded px-1.5 py-0.5 text-[10px] font-bold shrink-0">
              Primary
            </span>
          )}
          {source === 'ai' && (
            <span className="bg-green/20 text-green rounded px-1.5 py-0.5 text-[10px] font-bold shrink-0">
              AI
            </span>
          )}
          <span className="bg-border/60 text-subtext rounded px-1.5 py-0.5 text-[10px] shrink-0">
            {strategy}
          </span>
          <code className="text-green text-xs overflow-hidden text-ellipsis whitespace-nowrap flex-1 min-w-0">
            {selector}
          </code>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex flex-col items-end gap-0.5">
            <span className={`${scoreColor} text-[11px] font-medium tabular-nums`}>
              {confidence}%
            </span>
            <div className="h-1 w-14 rounded-full bg-border overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${barColor}`}
                style={{ width: `${confidence}%` }}
              />
            </div>
          </div>
          <button
            className="text-subtext text-[10px] hover:text-text transition-colors"
            title="Show reasoning"
            onClick={e => { e.stopPropagation(); onToggle(); }}
          >
            {expanded ? '▲' : '▼'}
          </button>
          <button
            className="bg-border text-text rounded px-2 py-1 text-[11px] hover:bg-overlay transition-colors"
            onClick={e => { e.stopPropagation(); onCopy(); }}
          >
            {copied ? '✓' : 'Copy'}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-2.5 pt-0 text-subtext text-xs italic border-t border-crust/50">
          {reasoning}
        </div>
      )}
    </div>
  );
}

// ── Patch applied toast ───────────────────────────────────────────────────────

function PatchAppliedToast({
  applied,
  onUndo,
}: {
  applied: PatchAppliedEvent['payload'];
  onUndo: () => void;
}) {
  const [visible, setVisible] = useState(true);

  // Auto-dismiss after 8 s if the user doesn't interact.
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 8000);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  const filename = applied.targetFile.split(/[\\/]/).pop() ?? applied.targetFile;

  return (
    <div className="bg-surface border border-green/40 rounded-xl shadow-2xl overflow-hidden text-[13px]">
      <div className="px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-green text-sm font-semibold">✓ Applied</span>
          <span className="text-muted text-xs">{filename}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="text-muted text-[11px] hover:text-text transition-colors underline"
            onClick={onUndo}
          >
            Undo
          </button>
          <button
            className="text-muted text-[11px] hover:text-text transition-colors"
            onClick={() => setVisible(false)}
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Patch preview panel ───────────────────────────────────────────────────────

function PatchPreviewPanel({
  patch,
  callbacks,
}: {
  patch: PatchPreviewEvent['payload'];
  callbacks: OverlayCallbacks;
}) {
  return (
    <div className="bg-surface border border-border rounded-xl shadow-2xl overflow-hidden text-[13px]">

      {/* Header */}
      <div className="bg-crust border-b border-border px-4 py-2.5 flex items-center justify-between">
        <span className="text-text font-semibold text-sm">Patch Preview</span>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-green">+{patch.additions}</span>
          <span className="text-red">-{patch.deletions}</span>
          <span className="text-muted">{patch.targetFile}</span>
          <button
            className="text-muted hover:text-text transition-colors text-sm leading-none ml-1"
            onClick={callbacks.onClose}
            title="Close"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Diff */}
      <div className="max-h-64 overflow-y-auto">
        <pre className="text-[11px] leading-relaxed p-3 font-mono">
          {patch.diff.split('\n').map((line, i) => (
            <div
              key={i}
              className={
                line.startsWith('+') && !line.startsWith('+++') ? 'text-green' :
                line.startsWith('-') && !line.startsWith('---') ? 'text-red' :
                line.startsWith('@@') ? 'text-blue' :
                'text-muted'
              }
            >
              {line || ' '}
            </div>
          ))}
        </pre>
      </div>

      {/* Actions */}
      <div className="bg-crust border-t border-border px-4 py-2.5 flex justify-end gap-2">
        <button
          className="bg-red/20 text-red text-[11px] font-semibold rounded px-3 py-1.5 hover:bg-red/30 transition-colors"
          onClick={() => callbacks.onRejectPatch(patch.patchId)}
        >
          Reject
        </button>
        <button
          className="bg-green/20 text-green text-[11px] font-semibold rounded px-3 py-1.5 hover:bg-green/30 transition-colors"
          onClick={() => callbacks.onApprovePatch(patch.patchId)}
        >
          Apply
        </button>
      </div>
    </div>
  );
}
