import type { TreemapTile } from './treemap';

export type ExportPlanItem = {
  title: string;
  savings: number; // monthly savings
};

export type ExportPosterInput = {
  title: string;
  rangeLabel: string;
  totalSpend: number;
  tiles: TreemapTile[];
  planItems: ExportPlanItem[];
  currency?: string;
};

function esc(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function truncate(s: string, maxLen: number): string {
  if (s.length <= maxLen) return s;
  if (maxLen <= 3) return s.slice(0, maxLen);
  return s.slice(0, Math.max(0, maxLen - 3)) + '...';
}

export function exportToSvg(input: ExportPosterInput): string {
  const W = 1000;
  const H = 980;

  const headerY = 30;
  const mosaicY = 80;
  const mosaicH = 650;
  const footerY = mosaicY + mosaicH + 30;

  const legendX = 40;
  const planX = 520;
  const footerWidth = 440;

  const currency = input.currency ?? 'USD';
  const money = (n: number) => `$${n.toFixed(2)}`;

  const tiles = input.tiles;
  const legend = [...tiles].sort((a, b) => b.value - a.value).slice(0, 6);
  const plan = input.planItems.slice(0, 5);

  const tileRects = tiles
    .map((t) => {
      const rx = 10;
      const x = t.x;
      const y = mosaicY + t.y;
      const w = t.w;
      const h = t.h;

      const showLabel = w > 170 && h > 46;
      const label = esc(truncate(t.label, 22));

      return [
        `<g>`,
        `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${esc(t.color)}" opacity="0.92" />`,
        showLabel
          ? `<text x="${x + 14}" y="${y + 28}" font-size="16" fill="rgba(0,0,0,0.80)" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial">${label}</text>`
          : '',
        `</g>`,
      ].join('');
    })
    .join('');

  const legendRows = legend
    .map((t, idx) => {
      const y = footerY + 24 + idx * 18;
      return [
        `<g>`,
        `<rect x="${legendX}" y="${y - 12}" width="12" height="12" rx="3" fill="${esc(t.color)}" opacity="0.92" />`,
        `<text x="${legendX + 18}" y="${y - 2}" font-size="12" fill="rgba(255,255,255,0.85)" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial">${esc(truncate(t.label, 26))}</text>`,
        `<text x="${legendX + footerWidth}" y="${y - 2}" text-anchor="end" font-size="12" fill="rgba(255,255,255,0.75)" font-variant-numeric="tabular-nums" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial">${money(t.value)}</text>`,
        `</g>`,
      ].join('');
    })
    .join('');

  const planRows = plan
    .map((p, idx) => {
      const y = footerY + 24 + idx * 20;
      return [
        `<g>`,
        `<text x="${planX}" y="${y - 2}" font-size="12" fill="rgba(255,255,255,0.85)" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial">${esc(truncate(p.title, 42))}</text>`,
        `<text x="${planX + footerWidth}" y="${y - 2}" text-anchor="end" font-size="12" fill="rgba(34,197,94,0.95)" font-variant-numeric="tabular-nums" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial">+${money(p.savings)}/mo</text>`,
        `</g>`,
      ].join('');
    })
    .join('');

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`,
    `<rect x="0" y="0" width="${W}" height="${H}" fill="#0b0e14" />`,

    // Header
    `<text x="40" y="${headerY}" font-size="24" fill="rgba(255,255,255,0.92)" font-weight="800" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial">${esc(input.title)}</text>`,
    `<text x="40" y="${headerY + 22}" font-size="12" fill="rgba(255,255,255,0.70)" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial">${esc(input.rangeLabel)} · Total spend: ${esc(currency)} ${money(input.totalSpend)}</text>`,

    // Mosaic
    `<g>`,
    `<rect x="0" y="${mosaicY}" width="${W}" height="${mosaicH}" fill="rgba(255,255,255,0.02)" />`,
    tileRects,
    `</g>`,

    // Footer panels
    `<rect x="28" y="${footerY - 8}" width="${W - 56}" height="${H - footerY - 20}" rx="18" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.10)" />`,

    `<text x="${legendX}" y="${footerY + 10}" font-size="11" fill="rgba(255,255,255,0.65)" letter-spacing="0.08em" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial">LEGEND</text>`,
    legendRows,

    `<text x="${planX}" y="${footerY + 10}" font-size="11" fill="rgba(255,255,255,0.65)" letter-spacing="0.08em" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial">TOP ACTIONS</text>`,
    planRows ||
      `<text x="${planX}" y="${footerY + 24}" font-size="12" fill="rgba(255,255,255,0.75)" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial">No actions in this range.</text>`,

    `</svg>`,
  ].join('\n');
}
