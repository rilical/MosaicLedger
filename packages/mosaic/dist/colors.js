const palette = [
    '#f97316',
    '#22c55e',
    '#38bdf8',
    '#a78bfa',
    '#f43f5e',
    '#eab308',
    '#14b8a6',
    '#fb7185',
    '#60a5fa',
    '#34d399',
    '#f59e0b',
    '#c084fc',
];
export function colorForLabel(label) {
    const s = label == null || typeof label !== 'string' ? '' : label;
    let h = 0;
    for (let i = 0; i < s.length; i++) {
        h = Math.imul(31, h) + s.charCodeAt(i);
    }
    const idx = Math.abs(h) % palette.length;
    return palette[idx];
}
//# sourceMappingURL=colors.js.map