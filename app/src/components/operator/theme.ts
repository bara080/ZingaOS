// Zinga OS console palette — the near-black dark theme shared by the static
// console pages (graph/tree/neural) and this React operator. Kept as plain
// constants so every operator component renders the exact same colors regardless
// of the app's light/dark theme (the console is always dark).
export const C = {
  bg: '#0B0D11',
  panel: '#12151C',
  panel2: '#171B23',
  line: '#232833',
  ink: '#E7EBF1',
  ink2: '#98A1AE',
  ink3: '#5E6672',
  teal: '#2FD9C9',
  green: '#4FD08A',
  red: '#E0655A',
  amber: '#E6B24C',
  mono: 'ui-monospace, "SF Mono", Menlo, monospace',
  sans: 'system-ui, -apple-system, sans-serif',
} as const;
