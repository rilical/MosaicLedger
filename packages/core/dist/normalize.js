export function normalizeMerchantName(input) {
    const s = input
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/\b(\d{3,})\b/g, '')
        .replace(/\b(POS|DEBIT|CREDIT|PURCHASE|ONLINE|WEB|PAYMENT|PMTS|CARD)\b/gi, '')
        .replace(/[^A-Za-z0-9 .&/-]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    // Common suffix cleanups.
    return s
        .replace(/\bCOM\b/gi, '')
        .replace(/\bINC\b/gi, '')
        .replace(/\bLLC\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toUpperCase();
}
export function stableId(parts) {
    // Hackathon-grade stable id. For production we should use a proper UUID.
    const raw = parts.join('|');
    let h = 2166136261;
    for (let i = 0; i < raw.length; i++) {
        h ^= raw.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return `t_${(h >>> 0).toString(16)}`;
}
//# sourceMappingURL=normalize.js.map