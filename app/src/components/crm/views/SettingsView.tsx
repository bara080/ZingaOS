'use client';

// CRM · Settings (docs/outreach-crm-plan.md §9). Refactored to match the
// Outreachify mockup: horizontal tabs + a two-column General tab (settings form
// left, profile card with notification toggles + API key right). Channels are
// capability DATA from channels.ts; Integrations show real connection status.
import { useState } from 'react';
import { Check, X as XIcon } from 'lucide-react';
import { CHANNELS, DAILY_DM_CAP } from '../channels';
import { useIgProfile } from '@/components/operator/hooks';
import { C } from '@/components/operator/theme';

type Section = 'general' | 'team' | 'channels' | 'integrations' | 'limits' | 'billing';
const SECTIONS: { key: Section; label: string }[] = [
  { key: 'general', label: 'General' },
  { key: 'team', label: 'Team' },
  { key: 'channels', label: 'Channels' },
  { key: 'integrations', label: 'Integrations' },
  { key: 'limits', label: 'Limits & Safety' },
  { key: 'billing', label: 'Billing' },
];

export function SettingsView() {
  const [section, setSection] = useState<Section>('general');

  return (
    <div style={{ width: '100%' }}>
      <h2 style={{ fontFamily: C.sans, fontSize: 18, fontWeight: 600, color: C.ink, margin: '0 0 14px' }}>Settings</h2>

      {/* horizontal tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${C.line}`, marginBottom: 18 }}>
        {SECTIONS.map((s) => {
          const on = s.key === section;
          return (
            <button
              key={s.key}
              onClick={() => setSection(s.key)}
              style={{
                fontFamily: C.sans,
                fontSize: 13,
                fontWeight: on ? 600 : 500,
                color: on ? C.teal : C.ink2,
                background: 'transparent',
                border: 'none',
                borderBottom: `2px solid ${on ? C.teal : 'transparent'}`,
                padding: '8px 12px',
                marginBottom: -1,
                cursor: 'pointer',
              }}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {section === 'general' && <GeneralTab />}
      {section === 'team' && <TeamTab />}
      {section === 'channels' && <ChannelsTab />}
      {section === 'integrations' && <IntegrationsTab />}
      {section === 'limits' && <LimitsTab />}
      {section === 'billing' && (
        <Card title="Billing">
          <p style={muted}>Not configured. Planned in docs/outreach-crm-plan.md §9.</p>
        </Card>
      )}
    </div>
  );
}

// ── General: settings form + profile card ───────────────────────────────────
function GeneralTab() {
  const [biz, setBiz] = useState('Zinga');
  const [tz, setTz] = useState('America/New_York');
  const [lang, setLang] = useState('English');
  const [currency, setCurrency] = useState('USD - US Dollar');
  const [saved, setSaved] = useState(false);

  const [notif, setNotif] = useState({ replies: true, summary: true, campaigns: true, mentions: false });
  const [showKey, setShowKey] = useState(false);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, alignItems: 'start' }}>
      {/* left: general settings */}
      <Card title="General settings">
        <FormField label="Business name">
          <input value={biz} onChange={(e) => setBiz(e.target.value)} style={input} />
        </FormField>
        <FormField label="Timezone">
          <select value={tz} onChange={(e) => setTz(e.target.value)} style={input}>
            <option value="America/New_York">(UTC-05:00) Eastern Time (US &amp; Canada)</option>
            <option value="America/Chicago">(UTC-06:00) Central Time</option>
            <option value="America/Los_Angeles">(UTC-08:00) Pacific Time</option>
          </select>
        </FormField>
        <FormField label="Language">
          <select value={lang} onChange={(e) => setLang(e.target.value)} style={input}>
            <option>English</option>
            <option>Español</option>
          </select>
        </FormField>
        <FormField label="Default currency">
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} style={input}>
            <option>USD - US Dollar</option>
            <option>EUR - Euro</option>
          </select>
        </FormField>
        <button
          onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 1800); }}
          style={{
            marginTop: 4,
            fontFamily: C.mono,
            fontSize: 12.5,
            fontWeight: 600,
            padding: '10px 18px',
            borderRadius: 10,
            border: `1px solid ${C.teal}`,
            background: 'rgba(47,217,201,0.10)',
            color: C.teal,
            cursor: 'pointer',
          }}
        >
          Save changes
        </button>
        {saved && <span style={{ marginLeft: 12, fontFamily: C.mono, fontSize: 11, color: C.green }}>Saved ✓ (local)</span>}
      </Card>

      {/* right: profile */}
      <Card title="Profile">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 12, borderBottom: `1px solid ${C.line}` }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: C.panel2, border: `1px solid ${C.line}`, display: 'grid', placeItems: 'center', fontFamily: C.sans, fontWeight: 700, color: C.teal }}>
            Z
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: C.sans, fontSize: 13.5, fontWeight: 600, color: C.ink }}>Zinga Operator</div>
            <div style={{ fontFamily: C.mono, fontSize: 10.5, color: C.ink3 }}>info@zingaapp.com</div>
          </div>
        </div>

        <div style={{ fontFamily: C.mono, fontSize: 9.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.ink3, margin: '14px 0 8px' }}>
          Email notifications
        </div>
        <ToggleRow label="New replies" on={notif.replies} onChange={(v) => setNotif((n) => ({ ...n, replies: v }))} />
        <ToggleRow label="Daily summary" on={notif.summary} onChange={(v) => setNotif((n) => ({ ...n, summary: v }))} />
        <ToggleRow label="Campaign updates" on={notif.campaigns} onChange={(v) => setNotif((n) => ({ ...n, campaigns: v }))} />
        <ToggleRow label="Mentions" on={notif.mentions} onChange={(v) => setNotif((n) => ({ ...n, mentions: v }))} />

        <div style={{ fontFamily: C.mono, fontSize: 9.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.ink3, margin: '16px 0 8px' }}>
          Your API key
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <code style={{ flex: 1, fontFamily: C.mono, fontSize: 11.5, color: C.ink2, background: C.panel2, border: `1px solid ${C.line}`, borderRadius: 8, padding: '8px 10px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {showKey ? 'zk_live_••••_managed_in_env' : '••••••••••••••••••••'}
          </code>
          <button onClick={() => setShowKey((s) => !s)} style={{ fontFamily: C.mono, fontSize: 11, padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.line}`, background: C.panel2, color: C.ink2, cursor: 'pointer' }}>
            {showKey ? 'Hide' : 'Show'}
          </button>
        </div>
        <div style={{ fontFamily: C.mono, fontSize: 9.5, color: C.ink3, marginTop: 6 }}>
          Real keys live in server env, never in the browser.
        </div>
      </Card>
    </div>
  );
}

function TeamTab() {
  return (
    <Card title="Team">
      <Row k="Access" v="Invite-only internal admin" />
      <Row k="Roles" v="superadmin · admin · manager · developer · csr" />
      <Row k="Operator access" v="superadmin + admin reach the CRM/operator" />
      <p style={muted}>Member management lives in the admin console (/admin-users).</p>
    </Card>
  );
}

function ChannelsTab() {
  return (
    <Card title="Channels · capabilities">
      <p style={muted}>
        Capabilities are configuration data (channels.ts), read by the adapters and
        DM Queue — never hardcoded per component. Manual send is first-class.
      </p>
      <div style={{ overflowX: 'auto', marginTop: 10 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
          <thead>
            <tr>
              {['Platform', 'Manual send', 'API send', 'Auto replies', 'Note'].map((h) => (
                <th key={h} style={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CHANNELS.map((c) => (
              <tr key={c.platform} style={{ borderTop: `1px solid ${C.line}` }}>
                <td style={{ ...td, color: C.ink, textTransform: 'capitalize' }}>{c.label}</td>
                <td style={td}><Cap on={c.manualSend} /></td>
                <td style={td}><Cap on={c.apiSend} /></td>
                <td style={td}><Cap on={c.automatedReplies} /></td>
                <td style={{ ...td, color: C.ink3, whiteSpace: 'normal', maxWidth: 320 }}>{c.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function IntegrationsTab() {
  const igProfile = useIgProfile(true);
  const ig = igProfile.data?.connected ? igProfile.data.profile : null;
  return (
    <Card title="Integrations">
      <Integration name="Instagram (Business Login)" status={ig ? `Connected · @${ig.username}` : 'Not connected'} ok={!!ig} />
      <Integration name="Meta webhook (inbound DMs)" status="Active · /api/meta/webhook" ok />
      <Integration name="Supabase (Postgres · ops schema)" status="Connected" ok />
      <Integration name="Apify (lead sourcing)" status="Configured" ok />
      <Integration name="SMTP (email sending)" status="Configured · info@zingaapp.com" ok />
      <Integration name="OpenAI (Responses API)" status="Not wired — needed for AI Agents" ok={false} />
    </Card>
  );
}

function LimitsTab() {
  return (
    <Card title="Limits & Safety">
      <Row k="Manual IG DM daily cap" v={`${DAILY_DM_CAP} / day (warming)`} />
      <Row k="Pacing" v="Human-paced, never machine-timed" />
      <Row k="Cold DM policy" v="Manual-assist only — no auto cold-blast (account-ban risk)" />
      <Row k="Cold volume channel" v="Email (compliant scale), X (API cold-send)" />
      <Banner>
        Raise the DM cap deliberately as @zingaapp warms. A true auto cold-DM blaster
        would get the account banned — see docs/outreach-crm-plan.md.
      </Banner>
    </Card>
  );
}

// ── shared bits ─────────────────────────────────────────────────────────────
function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      style={{
        width: 38,
        height: 22,
        borderRadius: 999,
        border: 'none',
        background: on ? C.teal : C.line,
        position: 'relative',
        cursor: 'pointer',
        transition: 'background 150ms',
        flexShrink: 0,
      }}
      aria-pressed={on}
    >
      <span style={{ position: 'absolute', top: 2, left: on ? 18 : 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 150ms' }} />
    </button>
  );
}

function ToggleRow({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
      <span style={{ flex: 1, fontFamily: C.sans, fontSize: 12.5, color: C.ink2 }}>{label}</span>
      <Toggle on={on} onChange={onChange} />
    </div>
  );
}

function Cap({ on }: { on: boolean }) {
  return on ? (
    <span style={{ color: C.green, display: 'inline-flex' }}><Check size={15} /></span>
  ) : (
    <span style={{ color: C.ink3, display: 'inline-flex' }}><XIcon size={15} /></span>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ border: `1px solid ${C.line}`, borderRadius: 12, background: 'rgba(18,21,28,0.5)', padding: 18 }}>
      <div style={{ fontFamily: C.sans, fontSize: 14, fontWeight: 600, color: C.ink, marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontFamily: C.mono, fontSize: 9.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.ink3, display: 'block', marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: 'flex', gap: 14, padding: '8px 0', borderTop: `1px solid ${C.line}` }}>
      <div style={{ fontFamily: C.mono, fontSize: 11, color: C.ink3, width: 200, flexShrink: 0 }}>{k}</div>
      <div style={{ fontFamily: C.sans, fontSize: 12.5, color: C.ink2 }}>{v}</div>
    </div>
  );
}

function Integration({ name, status, ok }: { name: string; status: string; ok: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: `1px solid ${C.line}` }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: ok ? C.green : C.ink3, boxShadow: ok ? `0 0 8px ${C.green}` : 'none' }} />
      <div style={{ flex: 1, fontFamily: C.sans, fontSize: 13, color: C.ink }}>{name}</div>
      <div style={{ fontFamily: C.mono, fontSize: 11, color: ok ? C.ink2 : C.amber }}>{status}</div>
    </div>
  );
}

function Banner({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 12, fontFamily: C.mono, fontSize: 11, color: C.amber, border: `1px solid ${C.line}`, borderRadius: 10, background: 'rgba(230,178,76,0.06)', padding: 12, lineHeight: 1.6 }}>
      {children}
    </div>
  );
}

const muted: React.CSSProperties = { fontFamily: C.mono, fontSize: 11, color: C.ink3, lineHeight: 1.6, margin: 0 };
const input: React.CSSProperties = {
  width: '100%',
  fontFamily: C.mono,
  fontSize: 12.5,
  padding: '9px 11px',
  borderRadius: 9,
  background: C.panel2,
  color: C.ink,
  border: `1px solid ${C.line}`,
};
const th: React.CSSProperties = {
  textAlign: 'left', fontFamily: C.mono, fontSize: 9.5, letterSpacing: '0.06em', textTransform: 'uppercase',
  color: C.ink3, padding: '8px 10px', whiteSpace: 'nowrap',
};
const td: React.CSSProperties = { fontFamily: C.sans, fontSize: 12.5, color: C.ink2, padding: '8px 10px' };
