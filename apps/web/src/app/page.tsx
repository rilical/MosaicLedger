import Link from 'next/link';
import type { CSSProperties } from 'react';
import { Badge } from '../components/ui';
import { CursorGlow } from '../components/CursorGlow';

const previewTiles = [
  { color: '#8b5cf6', colSpan: 4, rowSpan: 4 },
  { color: '#eab308', colSpan: 2, rowSpan: 3 },
  { color: '#14b8a6', colSpan: 2, rowSpan: 3 },
  { color: '#3b82f6', colSpan: 2, rowSpan: 2 },
  { color: '#22c55e', colSpan: 3, rowSpan: 2 },
  { color: '#f97316', colSpan: 2, rowSpan: 2 },
  { color: '#f43f5e', colSpan: 3, rowSpan: 2 },
  { color: '#6366f1', colSpan: 2, rowSpan: 2 },
  { color: '#10b981', colSpan: 4, rowSpan: 2 },
  { color: '#84cc16', colSpan: 2, rowSpan: 2 },
  { color: '#f59e0b', colSpan: 2, rowSpan: 2 },
  { color: '#0ea5e9', colSpan: 2, rowSpan: 2 },
];

export default function LandingPage() {
  return (
    <main className="landing">
      <CursorGlow />

      <div className="landingNav">
        <div className="landingNavBrand">MosaicLedger</div>
        <div className="buttonRow">
          <Link className="btn btnGhost" href="/login">
            Login
          </Link>
          <Link className="btn btnPrimary" href="/app">
            Enter the app
          </Link>
        </div>
      </div>

      <section className="landingHero">
        <div>
          <div className="landingKicker">Mosaic-led planning</div>
          <h1 className="landingTitle">Enter with fragments. Leave with something whole.</h1>
          <p className="landingSubtitle">
            MosaicLedger turns messy transactions into a clear mural: what to keep, what to cut, and
            how to reach your next goal with deterministic, explainable math.
          </p>
          <div className="landingActions">
            <Link className="btn btnPrimary" href="/app/mosaic?source=demo">
              See the mosaic
            </Link>
            <Link className="btn" href="/app/plan?source=demo">
              View the plan
            </Link>
          </div>
          <div className="small" style={{ marginTop: 10 }}>
            Demo-first by default. No external providers required to run the experience.
          </div>
        </div>

        <div className="heroCard">
          <div className="pageMeta" style={{ marginBottom: 12 }}>
            <div className="pageTagline">Glass mosaic preview</div>
            <Badge tone="good">Deterministic</Badge>
          </div>
          <div className="mosaicPreview">
            {previewTiles.map((tile, index) => (
              <div
                key={`${tile.color}-${index}`}
                className="glassTile"
                style={
                  {
                    '--tile': tile.color,
                    gridColumn: `span ${tile.colSpan}`,
                    gridRow: `span ${tile.rowSpan}`,
                  } as CSSProperties
                }
              />
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="sectionHeader">
          <h2 className="sectionTitle">How it works</h2>
          <Badge>Always explainable</Badge>
        </div>
        <div className="stepGrid">
          <div className="stepCard">
            <div style={{ fontWeight: 600, marginBottom: 6 }}>1. Choose a source</div>
            <div className="small">
              Start with demo data or connect a bank later. The experience stays stable either way.
            </div>
          </div>
          <div className="stepCard">
            <div style={{ fontWeight: 600, marginBottom: 6 }}>2. Read the mosaic</div>
            <div className="small">
              The mural surfaces spend shape in seconds. Hover to reveal categories and totals.
            </div>
          </div>
          <div className="stepCard">
            <div style={{ fontWeight: 600, marginBottom: 6 }}>3. Act with confidence</div>
            <div className="small">
              Plans and recurring insights are ranked with quantified savings and deterministic
              logic.
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="sectionHeader">
          <h2 className="sectionTitle">Why MosaicLedger</h2>
          <Badge tone="good">Built for judges</Badge>
        </div>
        <div className="featureGrid">
          <div className="featureCard">
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Deterministic core</div>
            <div className="small">Every number is reproducible. AI never touches math.</div>
          </div>
          <div className="featureCard">
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Recurring clarity</div>
            <div className="small">Forecasted charges and confidence scores in a single view.</div>
          </div>
          <div className="featureCard">
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Actionable plans</div>
            <div className="small">Ranked next steps with monthly savings and effort scores.</div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="heroCard" style={{ display: 'grid', gap: 10 }}>
          <div className="sectionTitle">Ready to assemble your story?</div>
          <div className="small">
            Jump into the live demo and explore the mosaic, recurring charges, and action plan.
          </div>
          <div className="buttonRow">
            <Link className="btn btnPrimary" href="/app">
              Launch demo
            </Link>
            <Link className="btn btnGhost" href="/app/settings">
              Open settings
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
