'use client';

// Scrape · Step 1 — "Build Your Target". Composes a real Apify query from a
// category checklist + a location string, picks ONE real source (the backend
// runs one source per call), and a lead count (1–200). Everything not wired to
// the backend renders visibly disabled with a "Soon" tag.
import { useMemo, useState } from 'react';
import { Search, Plus, MapPin, Play } from 'lucide-react';
import type { ScrapeSource } from '@/components/operator/api';
import { C } from '@/components/operator/theme';
import { SoonTag, card, field, eyebrow } from './ui';

// Real, selectable service categories — these compose into the query text.
export const CATEGORIES = [
  'Barbers', 'Hair Stylists', 'Nail Technicians', 'Photographers',
  'Massage Therapists', 'Auto Services', 'Makeup Artists', 'Estheticians',
  'Lash Technicians', 'Tattoo Artists', 'Personal Trainers', 'Auto Detailing',
];

// Sources the backend actually supports (one per run).
const REAL_SOURCES: { id: ScrapeSource; label: string }[] = [
  { id: 'google', label: 'Google Maps' },
  { id: 'ig', label: 'Instagram' },
  { id: 'tiktok', label: 'TikTok' },
];
// Not wired — shown disabled so the roadmap is honest.
const SOON_SOURCES = ['Facebook', 'Yellow Pages', 'Bing', 'Yelp', 'LinkedIn', 'Website Search'];

// Lead-quality filters are all roadmap items — none are wired to the actor input.
const QUALITY_FILTERS = [
  'Active business', 'Has website', 'Has social profile', 'Has booking link',
  'Minimum followers', 'Has email / phone', 'Verified',
];

// Compose the real query string sent to Apify from Step 1 selections.
export function composeQuery(categories: string[], location: string): string {
  const cats = categories.join(', ').trim();
  const loc = location.trim();
  return [cats, loc].filter(Boolean).join(' ').trim();
}

export function TargetBuilder({
  categories,
  setCategories,
  location,
  setLocation,
  source,
  setSource,
  number,
  setNumber,
  onStart,
  running,
}: {
  categories: string[];
  setCategories: (c: string[]) => void;
  location: string;
  setLocation: (s: string) => void;
  source: ScrapeSource;
  setSource: (s: ScrapeSource) => void;
  number: number;
  setNumber: (n: number) => void;
  onStart: () => void;
  running: boolean;
}) {
  const [catSearch, setCatSearch] = useState('');
  const [custom, setCustom] = useState('');

  const shown = useMemo(() => {
    const q = catSearch.trim().toLowerCase();
    const base = Array.from(new Set([...CATEGORIES, ...categories.filter((c) => !CATEGORIES.includes(c))]));
    return q ? base.filter((c) => c.toLowerCase().includes(q)) : base;
  }, [catSearch, categories]);

  const toggleCat = (c: string) =>
    setCategories(categories.includes(c) ? categories.filter((x) => x !== c) : [...categories, c]);

  const addCustom = () => {
    const c = custom.trim();
    if (c && !categories.includes(c)) setCategories([...categories, c]);
    setCustom('');
  };

  const query = composeQuery(categories, location);
  const canStart = !!query && !running;

  return (
    <div style={card}>
      {/* three panels */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        {/* Categories */}
        <Panel title="Categories">
          <div style={{ position: 'relative', marginBottom: 8 }}>
            <Search size={13} color={C.ink3} style={{ position: 'absolute', left: 9, top: 9 }} />
            <input
              value={catSearch}
              onChange={(e) => setCatSearch(e.target.value)}
              placeholder="Search categories…"
              style={{ ...field, width: '100%', paddingLeft: 28 }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 168, overflowY: 'auto' }}>
            {shown.map((c) => (
              <Check key={c} label={c} checked={categories.includes(c)} onChange={() => toggleCat(c)} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCustom()}
              placeholder="Add custom category"
              style={{ ...field, flex: 1, fontSize: 11 }}
            />
            <button onClick={addCustom} style={miniBtn} title="Add custom category">
              <Plus size={13} />
            </button>
          </div>
        </Panel>

        {/* Location */}
        <Panel title="Location">
          <label style={eyebrow}>City / area</label>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <MapPin size={13} color={C.ink3} style={{ position: 'absolute', left: 9, top: 9 }} />
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Brooklyn, NY, USA"
              style={{ ...field, width: '100%', paddingLeft: 28 }}
            />
          </div>
          <label style={{ ...eyebrow, display: 'flex', alignItems: 'center', gap: 6 }}>
            Radius <SoonTag />
          </label>
          <select disabled style={{ ...field, width: '100%', opacity: 0.5, cursor: 'not-allowed' }}>
            <option>Not used by the actor input</option>
          </select>
          <div style={{ fontFamily: C.mono, fontSize: 9.5, color: C.ink3, marginTop: 6, lineHeight: 1.5 }}>
            Location text is appended to the query.
          </div>
        </Panel>

        {/* Sources */}
        <Panel title="Sources">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {REAL_SOURCES.map((s) => (
              <Check
                key={s.id}
                label={s.label}
                checked={source === s.id}
                onChange={() => setSource(s.id)}
                radio
              />
            ))}
            {SOON_SOURCES.map((s) => (
              <Check key={s} label={s} checked={false} disabled soon onChange={() => {}} />
            ))}
          </div>
          <div style={{ fontFamily: C.mono, fontSize: 9.5, color: C.ink3, marginTop: 8, lineHeight: 1.5 }}>
            One source per run (multi-source soon).
          </div>
        </Panel>

        {/* Lead Quality Filters — all roadmap */}
        <Panel title={<span style={{ display: 'inline-flex', gap: 7, alignItems: 'center' }}>Lead Quality Filters <SoonTag /></span>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {QUALITY_FILTERS.map((f) => (
              <Check key={f} label={f} checked={false} disabled onChange={() => {}} />
            ))}
          </div>
        </Panel>
      </div>

      {/* footer strip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          flexWrap: 'wrap',
          marginTop: 16,
          paddingTop: 14,
          borderTop: `1px solid ${C.line}`,
        }}
      >
        <div>
          <div style={{ fontFamily: C.mono, fontSize: 9, letterSpacing: '0.07em', textTransform: 'uppercase', color: C.ink3 }}>
            Est. Leads
          </div>
          <div style={{ fontFamily: C.sans, fontSize: 18, fontWeight: 700, color: C.ink }}>
            {Math.max(1, Math.min(200, number || 20))}
          </div>
        </div>
        <div>
          <label style={{ ...eyebrow, marginBottom: 4 }}>Lead count (1–200)</label>
          <input
            type="number"
            min={1}
            max={200}
            value={number}
            onChange={(e) => setNumber(parseInt(e.target.value) || 0)}
            style={{ ...field, width: 90 }}
          />
        </div>
        <span style={{ flex: 1 }} />
        <button
          onClick={onStart}
          disabled={!canStart}
          title={!query ? 'Pick a category or type a location first' : ''}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            fontFamily: C.mono,
            fontSize: 12.5,
            fontWeight: 600,
            padding: '11px 20px',
            borderRadius: 10,
            border: `1px solid ${canStart ? C.teal : C.line}`,
            background: canStart ? 'rgba(47,217,201,0.10)' : C.panel2,
            color: canStart ? C.teal : C.ink3,
            cursor: canStart ? 'pointer' : 'not-allowed',
          }}
        >
          <Play size={14} /> {running ? 'Scraping…' : 'Start Scraping'}
        </button>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ border: `1px solid ${C.line}`, borderRadius: 10, background: C.panel2, padding: 12, minWidth: 0 }}>
      <div style={{ fontFamily: C.mono, fontSize: 9.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.ink2, marginBottom: 10 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Check({
  label,
  checked,
  onChange,
  disabled = false,
  soon = false,
  radio = false,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  soon?: boolean;
  radio?: boolean;
}) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '5px 4px',
        borderRadius: 6,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <input
        type={radio ? 'radio' : 'checkbox'}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        style={{ accentColor: C.teal, cursor: disabled ? 'not-allowed' : 'pointer' }}
      />
      <span style={{ fontFamily: C.sans, fontSize: 12, color: checked ? C.ink : C.ink2, flex: 1 }}>{label}</span>
      {soon && <SoonTag />}
    </label>
  );
}

const miniBtn: React.CSSProperties = {
  display: 'grid',
  placeItems: 'center',
  width: 32,
  borderRadius: 8,
  border: `1px solid ${C.line}`,
  background: C.panel,
  color: C.ink2,
  cursor: 'pointer',
};
