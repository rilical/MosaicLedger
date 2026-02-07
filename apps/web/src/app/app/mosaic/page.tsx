'use client';

import * as React from 'react';
import { MosaicView } from '../../../components/MosaicView';
import { MosaicSkeleton } from '../../../components/MosaicSkeleton';
import { RecurringPanel } from '../../../components/RecurringPanel';
import { ActionsPanel } from '../../../components/ActionsPanel';
import type { NormalizedTransaction } from '@mosaicledger/core';
import { buildTreemapTiles } from '@mosaicledger/mosaic';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Drawer,
} from '../../../components/ui';
import { AnalysisControls } from '../../../components/Analysis/AnalysisControls';
import {
  toAnalyzeRequest,
  useAnalysisSettings,
} from '../../../components/Analysis/useAnalysisSettings';
import { useAnalysis } from '../../../components/Analysis/useAnalysis';
import { useFlags } from '../../../lib/flags-client';

type MosaicLevel = 'category' | 'merchant';

function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function stageLabel(stage: 'idle' | 'syncing' | 'analyzing' | 'rendering'): string {
  switch (stage) {
    case 'syncing':
      return 'Syncing';
    case 'analyzing':
      return 'Analyzing';
    case 'rendering':
      return 'Rendering';
    case 'idle':
      return 'Ready';
    default:
      return stage satisfies never;
  }
}

function sumByMerchant(
  transactions: NormalizedTransaction[],
  category: string,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const t of transactions) {
    if (t.category !== category) continue;
    // Amount is positive spend by convention in this repo.
    out[t.merchant] = (out[t.merchant] ?? 0) + t.amount;
  }
  return out;
}

export default function MosaicPage() {
  const { settings, setSettings } = useAnalysisSettings();
  const req = React.useMemo(() => toAnalyzeRequest(settings), [settings]);
  const { artifacts, loading, error, stage, isSlow, recompute } = useAnalysis(req);
  const { setFlag } = useFlags();

  const [level, setLevel] = React.useState<MosaicLevel>('category');
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);
  const [selectedMerchant, setSelectedMerchant] = React.useState<string | null>(null);

  const txns = artifacts?.transactions ?? [];

  React.useEffect(() => {
    // When new artifacts arrive (recompute/range change), reset drill-down state to avoid stale selections.
    setLevel('category');
    setSelectedCategory(null);
    setSelectedMerchant(null);
  }, [artifacts]);

  const spend = artifacts?.summary.totalSpend ?? 0;
  const txCount = artifacts?.summary.transactionCount ?? 0;
  const byCategory = artifacts?.summary.byCategory ?? {};
  const byMerchant = artifacts?.summary.byMerchant ?? {};

  const topCategories = React.useMemo(() => {
    return Object.entries(byCategory)
      .slice()
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [byCategory]);

  const topMerchants = React.useMemo(() => {
    return Object.entries(byMerchant)
      .slice()
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [byMerchant]);

  const upcoming = React.useMemo(() => {
    const now = new Date().toISOString().slice(0, 10);
    const end = addDays(now, 30);
    return (artifacts?.recurring ?? [])
      .filter((r) => r.nextDate >= now && r.nextDate <= end)
      .slice()
      .sort((a, b) => (a.nextDate < b.nextDate ? -1 : a.nextDate > b.nextDate ? 1 : 0))
      .slice(0, 6);
  }, [artifacts?.recurring]);

  const upcomingTotal = React.useMemo(
    () => upcoming.reduce((sum, r) => sum + r.expectedAmount, 0),
    [upcoming],
  );

  const tiles = React.useMemo(() => {
    if (!artifacts) return [];
    if (level === 'category') return artifacts.mosaic.tiles;
    if (!selectedCategory) return [];
    if (txns.length === 0) return [];
    const byMerchant = sumByMerchant(txns, selectedCategory);
    return buildTreemapTiles(byMerchant);
  }, [artifacts, level, selectedCategory, txns]);

  const drawerTxns = React.useMemo(() => {
    if (!selectedCategory || !selectedMerchant) return [];
    return txns
      .filter((t) => t.category === selectedCategory && t.merchant === selectedMerchant)
      .slice()
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }, [selectedCategory, selectedMerchant, txns]);

  return (
    <div className="pageStack">
      <div className="pageHeader">
        <div className="pageMeta">
          <div className="pageTagline">
            {artifacts ? `${txCount} transactions · $${spend.toFixed(2)} spend` : 'Computing…'}
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {artifacts?.source ? (
              <Badge tone="neutral">
                Source:{' '}
                {artifacts.source === 'nessie'
                  ? 'Banking Connector'
                  : artifacts.source === 'plaid_fixture'
                    ? 'Bank (fixture)'
                    : artifacts.source === 'plaid'
                      ? 'Bank'
                      : 'Demo'}
              </Badge>
            ) : null}
            <Badge tone={error ? 'warn' : loading ? 'warn' : 'good'}>
              {error ? 'Error' : loading ? 'Busy' : 'Ready'}
            </Badge>
          </div>
        </div>
      </div>

      <AnalysisControls
        settings={settings}
        setSettings={setSettings}
        loading={loading}
        onRecompute={() => void recompute()}
      />

      {error ? (
        <div className="small" style={{ color: 'rgba(234,179,8,0.95)' }}>
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="filterBar" style={{ justifyContent: 'space-between' }}>
          <div className="small" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {stageLabel(stage)}…
          </div>
          {isSlow ? (
            <Button
              variant="ghost"
              onClick={() => {
                // One-click recovery: force deterministic demo path.
                setFlag('judgeMode', true);
                setFlag('demoMode', true);
                window.location.href = '/app/mosaic?source=demo';
              }}
            >
              Switch to demo data
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="grid">
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ display: 'grid', gap: 4 }}>
                <CardTitle>
                  {level === 'category'
                    ? 'Categories'
                    : selectedCategory
                      ? `Merchants in ${selectedCategory}`
                      : 'Merchants'}
                </CardTitle>
                <div className="small" style={{ opacity: 0.9 }}>
                  {level === 'category'
                    ? 'Click a category tile to drill down.'
                    : 'Click a merchant tile to see transactions.'}
                </div>
              </div>
              {level !== 'category' ? (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setLevel('category');
                    setSelectedCategory(null);
                    setSelectedMerchant(null);
                  }}
                >
                  Back
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardBody>
            {!artifacts && loading ? (
              <MosaicSkeleton label={`${stageLabel(stage)}…`} />
            ) : (
              <MosaicView
                tiles={tiles}
                totalSpend={spend}
                selectedId={
                  level === 'category'
                    ? (selectedCategory ?? undefined)
                    : (selectedMerchant ?? undefined)
                }
                onTileClick={(tile) => {
                  if (level === 'category') {
                    setSelectedCategory(tile.label);
                    setSelectedMerchant(null);
                    setLevel('merchant');
                    return;
                  }
                  setSelectedMerchant(tile.label);
                }}
              />
            )}
          </CardBody>
        </Card>

        <div style={{ display: 'grid', gap: 16 }}>
          <Card>
            <CardHeader>
              <CardTitle>Spend Breakdown</CardTitle>
            </CardHeader>
            <CardBody>
              {!artifacts ? (
                <div className="small">Waiting for analysis…</div>
              ) : (
                <div style={{ display: 'grid', gap: 12 }}>
                  <div className="small" style={{ opacity: 0.9 }}>
                    Click a category to drill into merchants. Use this list to narrate what the
                    Mosaic is showing in plain language.
                  </div>

                  <div style={{ display: 'grid', gap: 8 }}>
                    {topCategories.length ? (
                      topCategories.map(([cat, amt]) => {
                        const pct = spend > 0 ? (amt / spend) * 100 : 0;
                        const active = level === 'merchant' && selectedCategory === cat;
                        return (
                          <button
                            key={cat}
                            type="button"
                            className="btn"
                            onClick={() => {
                              setSelectedCategory(cat);
                              setSelectedMerchant(null);
                              setLevel('merchant');
                            }}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              gap: 10,
                              padding: '10px 12px',
                              borderRadius: 14,
                              background: active
                                ? 'rgba(56,189,248,0.16)'
                                : 'rgba(255,255,255,0.03)',
                              borderColor: active
                                ? 'rgba(56,189,248,0.35)'
                                : 'rgba(255,255,255,0.10)',
                              fontVariantNumeric: 'tabular-nums',
                            }}
                            aria-pressed={active}
                          >
                            <span style={{ textAlign: 'left' }}>
                              <span style={{ fontWeight: 650 }}>{cat}</span>
                              <span className="small" style={{ marginLeft: 10, opacity: 0.85 }}>
                                {pct.toFixed(1)}%
                              </span>
                            </span>
                            <span style={{ fontWeight: 700 }}>${amt.toFixed(2)}</span>
                          </button>
                        );
                      })
                    ) : (
                      <div className="small">No spend in range.</div>
                    )}
                  </div>

                  <details>
                    <summary className="small" style={{ cursor: 'pointer', userSelect: 'none' }}>
                      Top merchants (all categories)
                    </summary>
                    <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
                      {topMerchants.length ? (
                        topMerchants.map(([m, amt]) => (
                          <div
                            key={m}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              gap: 10,
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            <div className="small" style={{ opacity: 0.95 }}>
                              {m}
                            </div>
                            <div className="small" style={{ opacity: 0.9 }}>
                              ${amt.toFixed(2)}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="small">No merchants yet.</div>
                      )}
                    </div>
                  </details>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recurring Payments</CardTitle>
            </CardHeader>
            <CardBody>
              <RecurringPanel recurring={artifacts?.recurring ?? []} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Future Outflows (Next 30 Days)</CardTitle>
            </CardHeader>
            <CardBody>
              {!artifacts ? (
                <div className="small">Waiting for analysis…</div>
              ) : upcoming.length === 0 ? (
                <div className="small">No predicted recurring outflows in the next 30 days.</div>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  <div className="small">
                    Total upcoming: <strong>${upcomingTotal.toFixed(2)}</strong>
                  </div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {upcoming.map((r) => (
                      <div
                        key={`up_${r.id}`}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 12,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 650 }}>{r.merchant}</div>
                          <div className="small">
                            {r.nextDate} · {r.cadence} · {(r.confidence * 100).toFixed(0)}%
                          </div>
                        </div>
                        <div className="money">${r.expectedAmount.toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Next Actions</CardTitle>
            </CardHeader>
            <CardBody>
              <ActionsPanel actions={(artifacts?.actionPlan ?? []).slice(0, 5)} />
            </CardBody>
          </Card>
        </div>
      </div>

      <Drawer
        open={Boolean(selectedCategory && selectedMerchant)}
        onOpenChange={(open) => {
          if (!open) setSelectedMerchant(null);
        }}
        title={selectedMerchant ? `${selectedMerchant} transactions` : 'Transactions'}
      >
        {selectedCategory && selectedMerchant ? (
          <div style={{ display: 'grid', gap: 10 }}>
            <div className="small" style={{ opacity: 0.95 }}>
              Category: <strong>{selectedCategory}</strong>
            </div>
            {drawerTxns.length ? (
              <div style={{ display: 'grid', gap: 8 }}>
                {drawerTxns.map((t, idx) => (
                  <div
                    // NormalizedTransaction.id can collide for identical same-day purchases (e.g. 2 coffees).
                    // Include the index to keep the list stable and avoid React key collisions.
                    key={`${t.id}_${idx}`}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 10,
                      padding: '10px 12px',
                      borderRadius: 12,
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <div className="small" style={{ display: 'grid', gap: 2 }}>
                      <div style={{ fontWeight: 650 }}>{t.date}</div>
                      <div style={{ opacity: 0.9 }}>{t.merchantRaw}</div>
                    </div>
                    <div className="small" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      ${t.amount.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="small">
                No transactions found for this merchant in the selected range.
              </div>
            )}
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
