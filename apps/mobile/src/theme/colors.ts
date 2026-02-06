export const Colors = {
  bg0: '#0b0e14',
  bg1: '#0d1426',
  panel: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.12)',
  text: 'rgba(255,255,255,0.92)',
  muted: 'rgba(255,255,255,0.66)',
  faint: 'rgba(255,255,255,0.40)',
  accent: '#38bdf8',
  good: '#22c55e',
  warn: '#f59e0b',
  bad: '#f43f5e',
} as const;

export const CategoryPalette: string[] = [
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
  for (let i = 0; i < label.length; i++) h = Math.imul(31, h) + label.charCodeAt(i);
  const idx = Math.abs(h) % CategoryPalette.length;
  return CategoryPalette[idx] ?? Colors.accent;
}
