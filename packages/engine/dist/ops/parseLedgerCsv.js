import { normalizeMerchantName, stableId } from '@mosaicledger/core';
function parseCsvLine(line) {
    // Minimal CSV parser: supports quoted fields and commas.
    const out = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            const next = line[i + 1];
            if (inQ && next === '"') {
                cur += '"';
                i++;
            }
            else {
                inQ = !inQ;
            }
            continue;
        }
        if (!inQ && ch === ',') {
            out.push(cur);
            cur = '';
            continue;
        }
        cur += ch;
    }
    out.push(cur);
    return out;
}
function normalizeHeaderCell(input) {
    return input.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}
function headerAliases() {
    return {
        date: ['date', 'postingdate', 'transactiondate', 'txndate', 'txn_date', 'posteddate'],
        amount: ['amount', 'amt', 'value', 'netamount', 'debit', 'credit'],
        vendor: ['vendor', 'merchant', 'name', 'description', 'counterparty', 'payee'],
        currency: ['currency', 'ccy', 'curr'],
        glcode: ['glcode', 'gl', 'glaccount', 'glacct', 'accountcode'],
        invoiceid: ['invoiceid', 'invoice', 'invoice#', 'invoice_number', 'invoicenumber', 'billid'],
    };
}
function buildIndexMap(headers) {
    const idx = new Map();
    headers.forEach((h, i) => idx.set(normalizeHeaderCell(h), i));
    return idx;
}
function findIndex(idx, key) {
    const aliases = headerAliases()[key] ?? [key];
    for (const a of aliases) {
        const i = idx.get(normalizeHeaderCell(a));
        if (typeof i === 'number')
            return i;
    }
    return -1;
}
export function parseLedgerCsv(csvText) {
    const lines = csvText
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
    if (lines.length < 2)
        return [];
    const header = parseCsvLine(lines[0]);
    const idx = buildIndexMap(header);
    const iDate = findIndex(idx, 'date');
    const iAmount = findIndex(idx, 'amount');
    const iVendor = findIndex(idx, 'vendor');
    const iCurrency = findIndex(idx, 'currency');
    const iGl = findIndex(idx, 'glcode');
    const iInv = findIndex(idx, 'invoiceid');
    if (iDate === -1 || iAmount === -1 || iVendor === -1) {
        throw new Error('Ledger CSV must include headers for date, amount, vendor (aliases supported).');
    }
    const out = [];
    for (let row = 1; row < lines.length; row++) {
        const cols = parseCsvLine(lines[row]);
        const date = (cols[iDate] ?? '').trim();
        const vendorRaw = (cols[iVendor] ?? '').trim();
        const amount = Number((cols[iAmount] ?? '').trim());
        const currency = (iCurrency === -1 ? '' : (cols[iCurrency] ?? '')).trim() || 'USD';
        const glCode = (iGl === -1 ? '' : (cols[iGl] ?? '')).trim() || undefined;
        const invoiceId = (iInv === -1 ? '' : (cols[iInv] ?? '')).trim() || undefined;
        if (!date || !vendorRaw || !Number.isFinite(amount))
            continue;
        const vendorCanonical = normalizeMerchantName(vendorRaw);
        const meta = {};
        header.forEach((h, i) => {
            // Preserve raw cells for evidence/debug (but keep it small).
            if (i === iDate || i === iAmount || i === iVendor)
                return;
            const key = normalizeHeaderCell(h);
            const v = (cols[i] ?? '').trim();
            if (!key || !v)
                return;
            meta[key] = v;
        });
        const id = stableId([date, String(amount), vendorRaw, invoiceId ?? '', glCode ?? '']);
        out.push({
            id,
            date,
            amount,
            currency,
            vendorRaw,
            vendorCanonical,
            glCode,
            invoiceId,
            meta: Object.keys(meta).length ? meta : undefined,
        });
    }
    // Deterministic ordering regardless of CSV row order.
    return out
        .slice()
        .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id.localeCompare(b.id)));
}
//# sourceMappingURL=parseLedgerCsv.js.map