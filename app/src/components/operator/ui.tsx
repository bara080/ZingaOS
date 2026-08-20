'use client';

// Small presentational primitives shared across operator panels. Inline styles
// with the console palette keep the operator visually identical to the static
// console regardless of the app's light/dark theme.
import { useEffect, type CSSProperties, type ReactNode } from 'react';
import { C } from './theme';

export function Eyebrow({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        fontFamily: C.mono,
        fontSize: 10,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: C.ink3,
        margin: '22px 2px 10px',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Card({
  children,
  style,
  className,
}: {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        background: C.panel,
        border: `1px solid ${C.line}`,
        borderRadius: 11,
        padding: 16,
        width: '100%',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

const ACCENT: Record<string, string> = { g: C.green, a: C.amber, r: C.red, t: C.teal };

export function Tile({
  accent = 't',
  label,
  value,
  sub,
  hint,
}: {
  accent?: 'g' | 'a' | 'r' | 't';
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div
      style={{
        background: C.panel,
        border: `1px solid ${C.line}`,
        borderRadius: 11,
        padding: 15,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <span
        style={{
          content: '""',
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 3,
          background: ACCENT[accent],
        }}
      />
      <div
        style={{
          fontFamily: C.mono,
          fontSize: 10,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: C.ink2,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 650,
          margin: '6px 0 2px',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
        {sub ? <small style={{ fontSize: 13, color: C.ink3, fontWeight: 500 }}> {sub}</small> : null}
      </div>
      {hint ? <div style={{ fontSize: 12, color: C.ink2 }}>{hint}</div> : null}
    </div>
  );
}

// Dark-themed confirm modal (replaces window.confirm to match the console look).
export function ConfirmModal({
  open,
  title,
  body,
  confirmLabel = 'Confirm',
  danger,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;
  const accent = danger ? C.red : C.teal;
  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(4,6,9,0.72)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: C.panel,
          border: `1px solid ${C.line}`,
          borderRadius: 12,
          padding: 22,
          maxWidth: 440,
          width: '100%',
          color: C.ink,
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 650, marginBottom: 10 }}>{title}</div>
        <div style={{ fontSize: 12.5, color: C.ink2, lineHeight: 1.6, whiteSpace: 'pre-line' }}>
          {body}
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button
            onClick={onCancel}
            style={{
              fontFamily: C.mono,
              fontSize: 12,
              padding: '9px 16px',
              borderRadius: 9,
              border: `1px solid ${C.line}`,
              background: C.panel2,
              color: C.ink2,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              fontFamily: C.mono,
              fontSize: 12,
              fontWeight: 600,
              padding: '9px 16px',
              borderRadius: 9,
              border: `1px solid ${accent}`,
              background: danger ? 'rgba(224,101,90,0.12)' : 'rgba(47,217,201,0.1)',
              color: accent,
              cursor: 'pointer',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
