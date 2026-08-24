'use client';

// Shared CRM pagination footer + a tiny hook. Keeps every list's paging control
// identical. The hook owns page state, clamps it, and slices the items; the
// component renders the "a–b of N ‹ p/n ›" footer.
import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { C } from '@/components/operator/theme';

export function usePager<T>(items: T[], pageSize: number, resetKey: unknown) {
  const [page, setPage] = useState(0);
  // Reset to the first page whenever the underlying filter/search changes.
  useEffect(() => setPage(0), [resetKey]);

  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const start = safePage * pageSize;
  const slice = items.slice(start, start + pageSize);
  return {
    page: safePage,
    pageCount,
    start,
    slice,
    total: items.length,
    pageSize,
    setPage,
    prev: () => setPage((p) => Math.max(0, p - 1)),
    next: () => setPage((p) => Math.min(pageCount - 1, p + 1)),
  };
}

type PagerLike = {
  page: number;
  pageCount: number;
  start: number;
  total: number;
  pageSize: number;
  prev: () => void;
  next: () => void;
};

export function Pager({ p, noun = 'items' }: { p: PagerLike; noun?: string }) {
  if (p.total === 0) return null;
  const end = Math.min(p.start + p.pageSize, p.total);
  const atStart = p.page === 0;
  const atEnd = p.page >= p.pageCount - 1;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.line}` }}>
      <span style={{ fontFamily: C.mono, fontSize: 10, color: C.ink3 }}>
        {p.start + 1}–{end} of {p.total} {noun}
      </span>
      <span style={{ flex: 1 }} />
      <button onClick={p.prev} disabled={atStart} style={btn(atStart)}>
        <ChevronLeft size={13} />
      </button>
      <span style={{ fontFamily: C.mono, fontSize: 10, color: C.ink2 }}>
        {p.page + 1}/{p.pageCount}
      </span>
      <button onClick={p.next} disabled={atEnd} style={btn(atEnd)}>
        <ChevronRight size={13} />
      </button>
    </div>
  );
}

function btn(disabled: boolean): React.CSSProperties {
  return {
    display: 'grid',
    placeItems: 'center',
    width: 24,
    height: 24,
    borderRadius: 6,
    border: `1px solid ${C.line}`,
    background: C.panel2,
    color: disabled ? C.ink3 : C.ink2,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  };
}
