'use client';

import * as React from 'react';
import type { ActionRecommendation } from '@mosaicledger/core';
import { useFlags } from '../lib/flags-client';

function effortLabel(effortScore: number): 'low' | 'med' | 'high' {
  if (effortScore <= 0.33) return 'low';
  if (effortScore <= 0.66) return 'med';
  return 'high';
}

type RewriteState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; text: string }
  | { status: 'error'; error: string };

export function ActionsPanel(props: {
  actions: ActionRecommendation[];
  selected?: Record<string, boolean>;
  onSelectChange?: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}) {
  const { actions, selected, onSelectChange } = props;
  const { flags } = useFlags();

  const [aiShown, setAiShown] = React.useState<Record<string, boolean>>({});
  const [rewriteById, setRewriteById] = React.useState<Record<string, RewriteState>>({});

  const requestRewrite = React.useCallback(async (id: string, text: string) => {
    setRewriteById((prev) => ({ ...prev, [id]: { status: 'loading' } }));
    try {
      const resp = await fetch('/api/ai/rewrite', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const json = (await resp.json()) as unknown;
      if (!resp.ok || !json || typeof json !== 'object' || !('ok' in json)) {
        throw new Error(`Rewrite failed (${resp.status})`);
      }
      const ok = Boolean((json as { ok?: unknown }).ok);
      const rewritten = (json as { rewrittenText?: unknown }).rewrittenText;
      if (!ok || typeof rewritten !== 'string') {
        throw new Error('Rewrite failed');
      }
      setRewriteById((prev) => ({ ...prev, [id]: { status: 'done', text: rewritten } }));
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'message' in e
          ? String((e as { message?: unknown }).message)
          : 'Rewrite failed';
      setRewriteById((prev) => ({ ...prev, [id]: { status: 'error', error: msg } }));
    }
  }, []);

  if (actions.length === 0) {
    return <div className="small">Set a goal to generate ranked actions.</div>;
  }

  return (
    <ol style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 10 }}>
      {actions.map((a) => (
        <li key={a.id}>
          <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                {selected && onSelectChange ? (
                  <input
                    type="checkbox"
                    checked={Boolean(selected[a.id])}
                    onChange={(e) =>
                      onSelectChange((prev) => ({ ...prev, [a.id]: e.target.checked }))
                    }
                    aria-label={`Toggle ${a.title}`}
                    style={{ marginTop: 4 }}
                  />
                ) : null}
                <div>
                  <div style={{ fontWeight: 650 }}>{a.title}</div>
                  <div className="small">{a.explanation}</div>
                </div>
              </div>
              <div style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                +${a.expectedMonthlySavings.toFixed(2)}/mo
              </div>
            </div>

            <details>
              <summary className="small" style={{ cursor: 'pointer', userSelect: 'none' }}>
                Why this?
              </summary>
              <div style={{ marginTop: 8, display: 'grid', gap: 10 }}>
                {a.reasons && a.reasons.length ? (
                  <ul
                    className="small"
                    style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4 }}
                  >
                    {a.reasons.map((r, idx) => (
                      <li key={`${a.id}_r_${idx}`}>{r}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="small">{a.explanation}</div>
                )}

                <div
                  className="small"
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 10,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  <div>Type: {a.actionType}</div>
                  <div>Target: {a.target.kind === 'merchant' ? 'Merchant' : 'Category'}</div>
                  <div>Effort: {effortLabel(a.effortScore)}</div>
                  <div>Confidence: {(a.confidence * 100).toFixed(0)}%</div>
                </div>

                {flags.aiEnabled ? (
                  <div style={{ display: 'grid', gap: 8 }}>
                    <label
                      className="small"
                      style={{ display: 'flex', gap: 8, alignItems: 'center' }}
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(aiShown[a.id])}
                        onChange={(e) => {
                          const next = e.target.checked;
                          setAiShown((prev) => ({ ...prev, [a.id]: next }));
                          const existing = rewriteById[a.id]?.status ?? 'idle';
                          if (next && existing === 'idle') void requestRewrite(a.id, a.explanation);
                        }}
                      />
                      Rewrite with AI (text only)
                    </label>

                    {aiShown[a.id] ? (
                      <div className="small" style={{ display: 'grid', gap: 6 }}>
                        {rewriteById[a.id]?.status === 'loading' ? <div>Rewriting…</div> : null}
                        {rewriteById[a.id]?.status === 'error' ? (
                          <div style={{ color: 'rgba(234,179,8,0.95)' }}>
                            {(rewriteById[a.id] as { status: 'error'; error: string }).error}
                          </div>
                        ) : null}
                        {rewriteById[a.id]?.status === 'done' ? (
                          <>
                            <div style={{ fontWeight: 650 }}>AI rewrite</div>
                            <div>
                              {(rewriteById[a.id] as { status: 'done'; text: string }).text}
                            </div>
                          </>
                        ) : null}

                        <div style={{ marginTop: 2, opacity: 0.9 }}>
                          <div style={{ fontWeight: 650 }}>Original</div>
                          <div>{a.explanation}</div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </details>
          </div>
        </li>
      ))}
    </ol>
  );
}
