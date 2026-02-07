'use client';

import * as React from 'react';
import Link from 'next/link';
import { Badge, Button, Card, CardBody, CardHeader, CardTitle } from '../../../components/ui';
import { PlacesMap } from '../../../components/PlacesMap';
import { useFlags } from '../../../lib/flags-client';

type OverviewResp =
  | {
      ok: true;
      configured: boolean;
      mode: 'demo' | 'live';
      query?: { lat: number; lng: number; rad: number };
      accountId?: string | null;
      accountsCount?: number;
      purchasesCount?: number;
      billsCount?: number;
      billsUpcoming30d?: { upcomingCount: number; upcomingIds: string[] };
      purchases?: Array<{
        id: string;
        date: string;
        amount: number;
        merchant: string;
        category: string;
        pending: boolean;
      }>;
      bills?: Array<{
        _id?: string;
        status?: string;
        payee?: string;
        nickname?: string;
        payment_date?: string;
        upcoming_payment_date?: string;
        recurring_date?: number;
      }>;
      branches?: Array<{
        _id?: string;
        name?: string;
        phone_number?: string;
        address?: {
          street_number?: string;
          street_name?: string;
          city?: string;
          state?: string;
          zip?: string;
        };
      }>;
      atms?: Array<{
        _id?: string;
        name?: string;
        accessibility?: boolean;
        amount_left?: number;
        geocode?: { lat?: number; lng?: number };
      }>;
      errors?: Record<string, string | null>;
    }
  | { ok: false; error?: string };

function mapsLinkFromLatLng(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;
}

function mapsLinkFromAddress(addr: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
}

function fmtAddr(
  a: NonNullable<NonNullable<OverviewResp & { ok: true }>['branches']>[number]['address'],
): string {
  if (!a) return '';
  const parts = [
    [a.street_number, a.street_name].filter(Boolean).join(' ').trim(),
    [a.city, a.state, a.zip].filter(Boolean).join(' ').trim(),
  ]
    .filter(Boolean)
    .join(', ');
  return parts;
}

function fmtUsd(n: number): string {
  const x = Number(n);
  if (!Number.isFinite(x)) return '$0.00';
  return `$${x.toFixed(2)}`;
}

export default function CapitalOnePage() {
  const { flags } = useFlags();
  const [status, setStatus] = React.useState<'idle' | 'loading'>('idle');
  const [data, setData] = React.useState<OverviewResp | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const [lat, setLat] = React.useState('40.4433');
  const [lng, setLng] = React.useState('-79.9436');
  const [rad, setRad] = React.useState('2');

  const load = React.useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const qp = new URLSearchParams({ lat, lng, rad });
      const resp = await fetch(`/api/nessie/overview?${qp.toString()}`, { method: 'GET' });
      const text = await resp.text();
      if (!text || !text.trim()) {
        throw new Error(resp.ok ? 'Empty response from server' : `Request failed (${resp.status})`);
      }
      let json: OverviewResp;
      try {
        json = JSON.parse(text) as OverviewResp;
      } catch {
        throw new Error(resp.ok ? 'Invalid JSON from server' : `Request failed (${resp.status})`);
      }
      if (!json || typeof json !== 'object') throw new Error('overview_failed');
      if (!('ok' in json) || !json.ok)
        throw new Error(('error' in json ? json.error : null) ?? 'overview_failed');
      setData(json);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'overview_failed');
    } finally {
      setStatus('idle');
    }
  }, [lat, lng, rad]);

  const loadRef = React.useRef(load);
  loadRef.current = load;
  React.useEffect(() => {
    // Autoload once on mount; avoid calling on every keystroke.
    void loadRef.current();
  }, []);

  if (!flags.nessieEnabled) {
    return (
      <div className="pageStack" style={{ maxWidth: 980 }}>
        <div className="pageHeader">
          <h1 className="pageTitle">Capital One</h1>
          <div className="pageMeta">
            <div className="pageTagline">ATM, branches, bills, and payments (Nessie)</div>
            <Badge tone="warn">Disabled</Badge>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Enable Capital One (Nessie)</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="small">
              Turn on Settings → Nessie (Capital One) to show the sponsor connector UI. The app will
              still run in demo mode without it.
            </div>
            <div className="buttonRow" style={{ marginTop: 12 }}>
              <Link className="btn btnPrimary" href="/app">
                Go to App
              </Link>
              <Link className="btn btnGhost" href="/app/evidence">
                Open Evidence
              </Link>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  const ok = data && data.ok;
  const configured = ok ? data.configured : false;
  const mode = ok ? data.mode : null;
  const errs = ok ? (data.errors ?? {}) : {};

  return (
    <div className="pageStack" style={{ maxWidth: 1100 }}>
      <div className="pageHeader">
        <h1 className="pageTitle">Capital One</h1>
        <div className="pageMeta">
          <div className="pageTagline">Make the data obvious: places, bills, payments.</div>
          <Badge tone={configured ? 'good' : 'warn'}>
            {configured ? 'Live connector' : 'Demo fallback'}
          </Badge>
          {mode ? <Badge tone="neutral">{mode.toUpperCase()}</Badge> : null}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Places Query</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="buttonRow" style={{ alignItems: 'end', justifyContent: 'space-between' }}>
            <div className="buttonRow" style={{ alignItems: 'end' }}>
              <label style={{ display: 'grid', gap: 6 }}>
                <div className="small">Lat</div>
                <input className="input" value={lat} onChange={(e) => setLat(e.target.value)} />
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                <div className="small">Lng</div>
                <input className="input" value={lng} onChange={(e) => setLng(e.target.value)} />
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                <div className="small">Radius (mi)</div>
                <input className="input" value={rad} onChange={(e) => setRad(e.target.value)} />
              </label>
              <Button variant="primary" onClick={() => void load()} disabled={status === 'loading'}>
                {status === 'loading' ? 'Loading…' : 'Refresh'}
              </Button>
            </div>

            <div className="buttonRow" style={{ alignItems: 'center' }}>
              <Link className="btn btnGhost" href="/app/mosaic?source=nessie">
                Open Mosaic (Nessie)
              </Link>
              <Link className="btn btnGhost" href="/app/ops">
                Open Ops
              </Link>
            </div>
          </div>

          {error ? (
            <div className="small" style={{ marginTop: 10, color: 'rgba(234,179,8,0.95)' }}>
              {error}
            </div>
          ) : null}

          {ok && Object.values(errs).some(Boolean) ? (
            <div className="small" style={{ marginTop: 10, opacity: 0.9 }}>
              Partial errors:{' '}
              {Object.entries(errs)
                .filter(([, v]) => v)
                .map(([k, v]) => `${k}: ${String(v)}`)
                .join(' · ')}
            </div>
          ) : null}
        </CardBody>
      </Card>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 16,
        }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Payments (Purchases)</CardTitle>
          </CardHeader>
          <CardBody>
            {ok && data.purchases && data.purchases.length ? (
              <div style={{ display: 'grid', gap: 10 }}>
                <div className="small" style={{ opacity: 0.9 }}>
                  Showing {data.purchases.length} latest purchases
                </div>
                {data.purchases.slice(0, 12).map((p) => (
                  <div
                    key={p.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 12,
                      padding: '10px 12px',
                      borderRadius: 14,
                      border: '1px solid rgba(255,255,255,0.10)',
                      background: 'rgba(255,255,255,0.03)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    <div style={{ display: 'grid', gap: 2 }}>
                      <div style={{ fontWeight: 650 }}>{p.merchant}</div>
                      <div className="small">
                        {p.date} · {p.category}
                        {p.pending ? ' · pending' : ''}
                      </div>
                    </div>
                    <div style={{ fontWeight: 700 }}>{fmtUsd(p.amount)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="small">No purchases found (or connector not configured).</div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bills & Future Bills (Next 30 Days)</CardTitle>
          </CardHeader>
          <CardBody>
            {ok && data.bills && data.bills.length ? (
              <div style={{ display: 'grid', gap: 10 }}>
                <div className="buttonRow" style={{ alignItems: 'center' }}>
                  <Badge tone="neutral">Bills: {data.bills.length}</Badge>
                  {data.billsUpcoming30d ? (
                    <Badge tone="warn">Upcoming 30d: {data.billsUpcoming30d.upcomingCount}</Badge>
                  ) : null}
                </div>
                {data.bills.slice(0, 12).map((b, idx) => (
                  <div key={String(b._id ?? `bill-${idx}`)} style={{ display: 'grid', gap: 2 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ fontWeight: 650 }}>{b.nickname || b.payee || 'Bill'}</div>
                      <div className="small" style={{ opacity: 0.9 }}>
                        {String(b.status ?? '').toUpperCase() || 'PENDING'}
                      </div>
                    </div>
                    <div className="small">
                      Next:{' '}
                      {(b.upcoming_payment_date || b.payment_date || '').slice(0, 10) || 'unknown'}
                      {typeof b.recurring_date === 'number'
                        ? ` · recurring day ${b.recurring_date}`
                        : ''}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="small">No bills found (or connector not configured).</div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ATM Locations</CardTitle>
          </CardHeader>
          <CardBody>
            {ok && data.atms && data.atms.length ? (
              <div style={{ display: 'grid', gap: 10 }}>
                {data.atms.slice(0, 10).map((a, idx) => {
                  const alat = Number(a.geocode?.lat);
                  const alng = Number(a.geocode?.lng);
                  const hasGeo = Number.isFinite(alat) && Number.isFinite(alng);
                  return (
                    <div
                      key={String(a._id ?? `atm-${idx}`)}
                      style={{
                        display: 'grid',
                        gap: 4,
                        padding: '10px 12px',
                        borderRadius: 14,
                        border: '1px solid rgba(255,255,255,0.10)',
                        background: 'rgba(255,255,255,0.03)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                        <div style={{ fontWeight: 650 }}>{a.name || 'ATM'}</div>
                        <div className="small" style={{ opacity: 0.9 }}>
                          {typeof a.amount_left === 'number' ? `$${a.amount_left}` : ''}
                        </div>
                      </div>
                      <div className="small">
                        {a.accessibility ? 'Accessible' : 'Accessibility unknown'}
                        {hasGeo ? ` · ${alat.toFixed(4)}, ${alng.toFixed(4)}` : ''}
                      </div>
                      {hasGeo ? (
                        <a
                          className="small"
                          href={mapsLinkFromLatLng(alat, alng)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open in Google Maps
                        </a>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="small">No ATMs found for this location.</div>
            )}
          </CardBody>
        </Card>

        <div
          style={{
            gridColumn: '1 / -1',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 16,
            alignItems: 'start',
          }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Branch Locations</CardTitle>
            </CardHeader>
            <CardBody>
              {ok && data.branches && data.branches.length ? (
                <div style={{ display: 'grid', gap: 10 }}>
                  {data.branches.slice(0, 10).map((b, idx) => {
                    const addr = fmtAddr(b.address);
                    return (
                      <div
                        key={String(b._id ?? `branch-${idx}`)}
                        style={{
                          display: 'grid',
                          gap: 4,
                          padding: '10px 12px',
                          borderRadius: 14,
                          border: '1px solid rgba(255,255,255,0.10)',
                          background: 'rgba(255,255,255,0.03)',
                        }}
                      >
                        <div style={{ fontWeight: 650 }}>{b.name || 'Branch'}</div>
                        {addr ? <div className="small">{addr}</div> : null}
                        {b.phone_number ? (
                          <div className="small">Phone: {b.phone_number}</div>
                        ) : null}
                        {addr ? (
                          <a
                            className="small"
                            href={mapsLinkFromAddress(addr)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open in Google Maps
                          </a>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="small">No branches found.</div>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Map</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="small" style={{ marginBottom: 10, opacity: 0.9 }}>
                Branches and ATMs for your search area. Branch markers may take a moment to load.
              </div>
              <PlacesMap
                centerLat={Number(lat) || 40.4433}
                centerLng={Number(lng) || -79.9436}
                branches={ok && data.branches ? data.branches : null}
                atms={ok && data.atms ? data.atms : null}
              />
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
