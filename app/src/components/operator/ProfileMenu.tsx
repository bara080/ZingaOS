'use client';

// Profile menu for the console top-nav (right edge). Shows the signed-in user's
// avatar (email initials); the dropdown surfaces email + role and the Logout
// action. Styled with the operator dark theme, not shadcn, so it matches the
// console surfaces (Operator + CRM) that render TopNav.
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { LogOut, ChevronDown } from 'lucide-react';
import { C } from './theme';

type Who = { email: string; role: string };

function initials(email: string): string {
  const name = email.split('@')[0] || email;
  const parts = name.split(/[._-]+/).filter(Boolean);
  const s = (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
  return (s || name.slice(0, 2) || '?').toUpperCase();
}

export function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const [who, setWho] = useState<Who | null>(null);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    let alive = true;
    fetch('/api/operator/whoami')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d?.email) setWho({ email: d.email, role: d.role ?? '' });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  async function logout() {
    if (busy) return;
    setBusy(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      /* redirect regardless */
    }
    queryClient.clear();
    router.replace('/login');
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          padding: '4px 7px 4px 4px',
          borderRadius: 8,
          border: `1px solid ${C.line}`,
          background: open ? 'rgba(255,255,255,0.05)' : 'transparent',
          cursor: 'pointer',
        }}
      >
        <span
          style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: C.teal,
            color: C.bg,
            fontFamily: C.mono,
            fontSize: 10,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {who ? initials(who.email) : '··'}
        </span>
        <ChevronDown size={13} strokeWidth={2} color={C.ink3} />
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 6px)',
            width: 216,
            background: '#0e1218',
            border: `1px solid ${C.line}`,
            borderRadius: 10,
            boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
            padding: 6,
            zIndex: 40,
          }}
        >
          <div style={{ padding: '8px 10px 10px' }}>
            <div
              style={{
                fontFamily: C.sans,
                fontSize: 12.5,
                color: C.ink,
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {who?.email ?? 'Loading…'}
            </div>
            {who?.role && (
              <div
                style={{
                  marginTop: 4,
                  display: 'inline-block',
                  fontFamily: C.mono,
                  fontSize: 9.5,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: C.teal,
                  background: 'rgba(47,217,201,0.10)',
                  border: `1px solid ${C.line}`,
                  borderRadius: 6,
                  padding: '2px 7px',
                }}
              >
                {who.role}
              </div>
            )}
          </div>
          <div style={{ height: 1, background: C.line, margin: '2px 4px 6px' }} />
          <button
            onClick={logout}
            disabled={busy}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              width: '100%',
              textAlign: 'left',
              padding: '8px 10px',
              borderRadius: 7,
              border: '1px solid transparent',
              background: 'transparent',
              color: C.red,
              fontFamily: C.sans,
              fontSize: 13,
              fontWeight: 500,
              cursor: busy ? 'default' : 'pointer',
              opacity: busy ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,107,107,0.10)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <LogOut size={15} strokeWidth={2} />
            {busy ? 'Signing out…' : 'Log out'}
          </button>
        </div>
      )}
    </div>
  );
}
