'use client';

// Scrape · right-side "Lead Profile" drawer. Slides in when a result row is
// clicked; matches the DM Queue right-panel styling. Every field is a REAL Lead
// field — "—" when empty, nothing fabricated. Action buttons disable when their
// data is missing. Footer routes the lead into the DM Queue (real navigation).
import { useState } from 'react';
import { X, ExternalLink, Globe, Phone, Bookmark, Send } from 'lucide-react';
import { leadHandle, leadName, leadScore, type Lead } from '../../api';
import type { CrmView } from '../../nav';
import { C } from '@/components/operator/theme';
import { SoonTag, STAGE_COLOR, avatar, leadUrl, scoreColor } from './ui';

type Tab = 'overview' | 'details' | 'social' | 'notes' | 'activity';

export function LeadDrawer({
  lead,
  onClose,
  onNavigate,
}: {
  lead: Lead | null;
  onClose: () => void;
  onNavigate?: (v: CrmView) => void;
}) {
  const [tab, setTab] = useState<Tab>('overview');
  if (!lead) return null;

  const score = leadScore(lead);
  const stage = (lead.stage || 'scraped').toLowerCase();
  const profileUrl = leadUrl(lead);
  const websiteUrl = lead.website ? (lead.website.startsWith('http') ? lead.website : `https://${lead.website}`) : null;

  return (
    <div style={overlay} onMouseDown={onClose}>
      <div style={drawer} onMouseDown={(e) => e.stopPropagation()}>
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11, marginBottom: 14 }}>
          <div style={{ ...avatar, width: 42, height: 42, fontSize: 16 }}>{leadName(lead).charAt(0).toUpperCase()}</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontFamily: C.sans, fontSize: 15.5, fontWeight: 700, color: C.ink, wordBreak: 'break-word' }}>{leadName(lead)}</div>
            <div style={{ fontFamily: C.mono, fontSize: 11, color: C.teal }}>{leadHandle(lead) ?? lead.email ?? '—'}</div>
            <div style={{ display: 'flex', gap: 7, marginTop: 8, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: C.mono, fontSize: 10.5, color: scoreColor(score), border: `1px solid ${scoreColor(score)}`, borderRadius: 6, padding: '2px 8px' }}>
                Score {score}
              </span>
              <span style={{ fontFamily: C.mono, fontSize: 10.5, color: STAGE_COLOR[stage] ?? C.ink2, border: `1px solid ${C.line}`, borderRadius: 6, padding: '2px 8px', textTransform: 'capitalize' }}>
                {lead.stage || 'scraped'}
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.ink3, cursor: 'pointer' }} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* action buttons */}
        <div style={{ display: 'flex', gap: 7, marginBottom: 14, flexWrap: 'wrap' }}>
          <ActionBtn label="View Profile" icon={<ExternalLink size={13} />} href={profileUrl} />
          <ActionBtn label="Website" icon={<Globe size={13} />} href={websiteUrl} />
          <ActionBtn label="Call" icon={<Phone size={13} />} href={lead.phone ? `tel:${lead.phone}` : null} />
          <button disabled style={{ ...actionStyle(true), opacity: 0.5, cursor: 'not-allowed' }} title="Saved targets — coming soon">
            <Bookmark size={13} /> Save <SoonTag />
          </button>
        </div>

        {/* tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 12, borderBottom: `1px solid ${C.line}` }}>
          {(['overview', 'details', 'social', 'notes', 'activity'] as const).map((t) => {
            const on = tab === t;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  fontFamily: C.mono,
                  fontSize: 10.5,
                  padding: '7px 8px',
                  background: 'none',
                  border: 'none',
                  borderBottom: `2px solid ${on ? C.teal : 'transparent'}`,
                  color: on ? C.teal : C.ink2,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  marginBottom: -1,
                }}
              >
                {t}
              </button>
            );
          })}
        </div>

        {/* tab body */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {tab === 'overview' && (
            <>
              <SectionLabel>Business Info</SectionLabel>
              <Row k="Category" v={lead.category} />
              <Row k="Location" v={lead.borough} />
              <Row k="Phone" v={lead.phone} />
              <Row k="Website" v={lead.website} />
              <Row k="Email" v={lead.email} />
              <Row k="Source" v={lead.source} />
            </>
          )}
          {tab === 'details' && (
            <>
              <SectionLabel>Details</SectionLabel>
              <Row k="Business" v={lead.business} />
              <Row k="Owner" v={lead.owner} />
              <Row k="Reviews" v={lead.reviews != null ? String(lead.reviews) : null} />
              <Row k="Verify" v={lead.verify_status} />
              <Row k="Scraped" v={lead.scraped_at} />
              <Row k="Contacted" v={lead.contacted_at} />
            </>
          )}
          {tab === 'social' && (
            <>
              <SectionLabel>Social</SectionLabel>
              <Row k="Instagram" v={leadHandle(lead)} accent={C.teal} />
              <Row k="Website" v={lead.website} />
              <div style={{ fontFamily: C.mono, fontSize: 10, color: C.ink3, marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                Follower stats & post history <SoonTag />
              </div>
            </>
          )}
          {tab === 'notes' && (
            <>
              <SectionLabel>Notes</SectionLabel>
              <div style={{ fontFamily: C.sans, fontSize: 12, color: lead.notes ? C.ink2 : C.ink3, lineHeight: 1.6 }}>
                {lead.notes || 'No notes captured for this lead.'}
              </div>
            </>
          )}
          {tab === 'activity' && (
            <>
              <SectionLabel>Activity</SectionLabel>
              <div style={{ fontFamily: C.mono, fontSize: 10.5, color: C.ink3, lineHeight: 1.6, display: 'flex', alignItems: 'center', gap: 6 }}>
                Full send/reply timeline lives in the DM Queue <SoonTag />
              </div>
            </>
          )}
        </div>

        {/* footer */}
        <div style={{ borderTop: `1px solid ${C.line}`, paddingTop: 12, marginTop: 12 }}>
          <button
            onClick={() => onNavigate?.('dm-queue')}
            style={{ ...actionStyle(false), width: '100%', justifyContent: 'center', background: 'rgba(47,217,201,0.10)', border: `1px solid ${C.teal}`, color: C.teal, fontWeight: 600 }}
          >
            <Send size={13} /> Add to Outreach Queue
          </button>
        </div>
      </div>
    </div>
  );
}

function ActionBtn({ label, icon, href }: { label: string; icon: React.ReactNode; href: string | null }) {
  if (!href) {
    return (
      <button disabled style={{ ...actionStyle(true), opacity: 0.4, cursor: 'not-allowed' }} title={`No ${label.toLowerCase()} on file`}>
        {icon} {label}
      </button>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" style={actionStyle(false)}>
      {icon} {label}
    </a>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: C.mono, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.ink3, marginBottom: 8 }}>
      {children}
    </div>
  );
}

function Row({ k, v, accent }: { k: string; v: string | null; accent?: string }) {
  return (
    <div style={{ display: 'flex', gap: 10, padding: '6px 0', borderTop: `1px solid ${C.line}` }}>
      <span style={{ fontFamily: C.mono, fontSize: 9.5, letterSpacing: '0.04em', textTransform: 'uppercase', color: C.ink3, width: 78, flexShrink: 0 }}>{k}</span>
      <span style={{ fontFamily: C.sans, fontSize: 12, color: v ? accent ?? C.ink2 : C.ink3, wordBreak: 'break-word' }}>{v || '—'}</span>
    </div>
  );
}

function actionStyle(muted: boolean): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontFamily: C.mono,
    fontSize: 11,
    fontWeight: 600,
    padding: '8px 11px',
    borderRadius: 8,
    border: `1px solid ${C.line}`,
    background: C.panel2,
    color: muted ? C.ink3 : C.ink2,
    cursor: 'pointer',
    textDecoration: 'none',
  };
}

const overlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(4,6,9,0.55)',
  display: 'flex',
  justifyContent: 'flex-end',
  zIndex: 60,
};
const drawer: React.CSSProperties = {
  width: 380,
  maxWidth: '100%',
  height: '100%',
  background: C.panel,
  borderLeft: `1px solid ${C.line}`,
  padding: 18,
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '-20px 0 60px rgba(0,0,0,0.5)',
};
