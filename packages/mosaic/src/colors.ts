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

export function colorForLabel(label: string): string {
  let h = 0;
  for (let i = 0; i < label.length; i++) {
    h = Math.imul(31, h) + label.charCodeAt(i);
  }
  const idx = Math.abs(h) % palette.length;
  return palette[idx]!;
}
