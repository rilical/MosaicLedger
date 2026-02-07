import Link from 'next/link';
import { Badge } from '../components/ui';
import { MosaicPreviewToggle } from '../components/MosaicPreviewToggle';

export default function LandingPage() {
  return (
    <main className="landing">
      <div className="landingNav">
        <div className="landingNavBrand">MosaicLedger</div>
        <div className="buttonRow" style={{ justifyContent: 'flex-end', flex: 1 }}>
          <a className="btn btnGhost" href="#product">
            Product
          </a>
          <a className="btn btnGhost" href="#integrations">
            Integrations
          </a>
          <a className="btn btnGhost" href="#proof">
            Proof
          </a>
          <Link className="btn btnGhost" href="/prize-ledger">
            Prize Ledger
          </Link>
          <Link className="btn btnGhost" href="/login">
            Login
          </Link>
        </div>
      </div>

      <section className="landingHero" id="product">
        <div>
          <div className="landingKicker">Budget intelligence, without the vibes</div>
          <h1 className="landingTitle">A clean, explainable budget mural.</h1>
          <p className="landingSubtitle">
            MosaicLedger turns transactions into a navigable mosaic, detects recurring charges, and
            ranks next actions with deterministic math. Optional AI rewrites the narrative only.
          </p>
          <div className="landingActions">
            <Link className="btn btnPrimary" href="/app">
              Open Dashboard
            </Link>
            <Link className="btn btnGhost" href="/app/mosaic?source=demo">
              Launch Demo Mosaic
            </Link>
            <Link className="btn btnGhost" href="/game">
              Play 15KB Minesweeper
            </Link>
          </div>
        </div>

        <div className="heroCard">
          <MosaicPreviewToggle />
        </div>
      </section>

      <section className="section">
        <div className="sectionHeader">
          <h2 className="sectionTitle">What you get</h2>
          <Badge>Deterministic first</Badge>
        </div>
        <div className="featureGrid">
          <div className="featureCard">
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Mosaic navigation</div>
            <div className="small">
              A mural you can drill into: category tiles, then merchants, then the raw transactions.
            </div>
          </div>
          <div className="featureCard">
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Recurring + choices</div>
            <div className="small">
              Detect subscriptions, predict next charges, and persist Keep/Cancel/Downgrade choices.
            </div>
          </div>
          <div className="featureCard">
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Plan + export</div>
            <div className="small">
              Ranked actions with quantified monthly savings, plus a single poster artifact (SVG/PNG).
            </div>
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

      <section className="section" id="integrations">
        <div className="sectionHeader">
          <h2 className="sectionTitle">Integrations</h2>
          <Badge>Prize-ready</Badge>
        </div>
        <div className="featureGrid">
          <div className="featureCard">
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Capital One Nessie</div>
            <div className="small">
              Sponsor connector for purchases. When configured, <code>source=nessie</code> drives analysis.
            </div>
          </div>
          <div className="featureCard">
            <div style={{ fontWeight: 700, marginBottom: 6 }}>MCP tool server</div>
            <div className="small">
              Hosted MCP endpoints (<code>/health</code>, <code>/mcp</code>) for tool calling transport.
            </div>
          </div>
          <div className="featureCard">
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Ops + Coach</div>
            <div className="small">
              Deterministic analysts and tool calling. Optional AI rewrites the narrative only.
            </div>
          </div>
        </div>
        <div className="landingActions" style={{ marginTop: 12 }}>
          <Link className="btn btnPrimary" href="/app/evidence">
            Open Evidence Screen
          </Link>
          <Link className="btn btnGhost" href="/health">
            Health Checks
          </Link>
        </div>
      </section>

      <section className="section" id="proof">
        <div className="sectionHeader">
          <h2 className="sectionTitle">Proof, not promises</h2>
          <Badge>CI-gated</Badge>
        </div>
        <div className="stepGrid">
          <div className="stepCard">
            <div style={{ fontWeight: 600, marginBottom: 6 }}>15KB Minesweeper</div>
            <div className="small">Size is enforced in CI and E2E, and the page includes a dashboard button.</div>
          </div>
          <div className="stepCard">
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Golden snapshots</div>
            <div className="small">Demo artifacts (summary/recurring/plan/mosaic) are pinned with a stable date for regression safety.</div>
          </div>
          <div className="stepCard">
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Fail-open demos</div>
            <div className="small">Sponsor APIs and AI never block the flow. When something flakes, we fall back to deterministic demo data.</div>
          </div>
        </div>
      </section>
    </main>
  );
}
