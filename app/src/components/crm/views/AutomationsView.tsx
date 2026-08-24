'use client';

// CRM · Automations (docs/outreach-crm-plan.md §6). Persists trigger → action
// RULES only. The automation execution engine is a build-up step and is NOT
// wired yet. Left: rule list with enable toggle. Right: create form with preset
// trigger/action dropdowns plus a custom-text escape hatch.
import { useState } from 'react';
import { Zap, Power, ArrowRight } from 'lucide-react';
import { useAutomations, useAutomationCreate, useAutomationSetEnabled } from '../hooks';
import type { AutomationRule } from '../api';
import { Pager, usePager } from '../Pager';
import { C } from '@/components/operator/theme';

const TRIGGER_PRESETS = [
  'Message sent · no reply 3 days',
  'Lead replies',
  'AI confidence < threshold',
  'Lead enters stage: qualified',
  'New lead added',
];
const ACTION_PRESETS = [
  'Add to follow-up queue',
  'Assign AI agent',
  'Update stage',
  'Handoff to human',
  'Send follow-up draft',
];
const CUSTOM = '__custom__';

export function AutomationsView() {
  const listQ = useAutomations();
  const create = useAutomationCreate();
  const setEnabled = useAutomationSetEnabled();
  const rules = listQ.data?.rules ?? [];
  const pager = usePager(rules, 8, rules.length);

  // create-form state
  const [name, setName] = useState('');
  const [triggerSel, setTriggerSel] = useState(TRIGGER_PRESETS[0]);
  const [triggerCustom, setTriggerCustom] = useState('');
  const [actionSel, setActionSel] = useState(ACTION_PRESETS[0]);
  const [actionCustom, setActionCustom] = useState('');
  const [flash, setFlash] = useState<string | null>(null);

  const trigger = triggerSel === CUSTOM ? triggerCustom.trim() : triggerSel;
  const action = actionSel === CUSTOM ? actionCustom.trim() : actionSel;
  const canSubmit = !!name.trim() && !!trigger && !!action && !create.isPending;

  const submit = () => {
    if (!canSubmit) return;
    setFlash(null);
    create.mutate(
      { name: name.trim(), trigger, action },
      {
        onSuccess: () => {
          setFlash('Rule saved ✓');
          setName('');
          setTriggerCustom('');
          setActionCustom('');
        },
        onError: (e) => setFlash(`Failed: ${e instanceof Error ? e.message : 'error'}`),
      },
    );
  };

  return (
    <div style={{ width: '100%' }}>
      <h2 style={{ fontFamily: C.sans, fontSize: 18, fontWeight: 600, color: C.ink, margin: '0 0 14px' }}>
        Automations
      </h2>

      {/* ── amber notice banner ─────────────────────────────────────── */}
      <div style={banner}>
        <span style={{ fontWeight: 700 }}>Rules are saved.</span> The automation execution engine is a
        build-up step (see docs/outreach-crm-plan.md §6).
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, alignItems: 'start' }}>
        {/* ── list ─────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {listQ.isError ? (
            <div style={{ fontFamily: C.mono, fontSize: 12, color: C.red }}>
              {listQ.error instanceof Error ? listQ.error.message : 'failed to load automations'}
            </div>
          ) : rules.length === 0 ? (
            <div style={{ ...card, color: C.ink3, fontFamily: C.mono, fontSize: 12 }}>
              {listQ.isLoading ? 'loading…' : 'No rules yet — create one on the right.'}
            </div>
          ) : (
            pager.slice.map((r: AutomationRule) => {
              const on = r.enabled;
              return (
                <div key={r.id} style={card}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: C.panel2, border: `1px solid ${C.line}`, display: 'grid', placeItems: 'center', color: C.teal }}>
                      <Zap size={17} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: C.sans, fontSize: 14, fontWeight: 600, color: C.ink }}>{r.name}</div>
                      <div style={{ fontFamily: C.mono, fontSize: 10.5, color: C.ink2, display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                        <span>{r.trigger}</span>
                        <ArrowRight size={11} style={{ color: C.teal }} />
                        <span style={{ color: C.teal }}>{r.action}</span>
                      </div>
                    </div>
                    <span
                      style={{
                        fontFamily: C.mono,
                        fontSize: 10,
                        color: on ? C.green : C.amber,
                        border: `1px solid ${on ? C.green : C.amber}`,
                        borderRadius: 6,
                        padding: '2px 8px',
                      }}
                    >
                      {on ? 'Enabled' : 'Disabled'}
                    </span>
                    <button
                      onClick={() => setEnabled.mutate({ id: r.id, enabled: !on })}
                      disabled={setEnabled.isPending}
                      title={on ? 'Disable' : 'Enable'}
                      style={{ ...iconBtn, color: on ? C.amber : C.green }}
                    >
                      <Power size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
          <Pager p={pager} noun="rules" />
        </div>

        {/* ── create form ──────────────────────────────────────────── */}
        <div style={card}>
          <div style={{ fontFamily: C.sans, fontSize: 14, fontWeight: 600, color: C.ink, marginBottom: 14 }}>
            New rule
          </div>

          <Field label="Rule name">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="3-day no-reply nudge" style={input} />
          </Field>

          <Field label="When · Trigger">
            <select value={triggerSel} onChange={(e) => setTriggerSel(e.target.value)} style={input}>
              {TRIGGER_PRESETS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
              <option value={CUSTOM}>Custom…</option>
            </select>
            {triggerSel === CUSTOM && (
              <input
                value={triggerCustom}
                onChange={(e) => setTriggerCustom(e.target.value)}
                placeholder="Describe the trigger"
                style={{ ...input, marginTop: 6 }}
              />
            )}
          </Field>

          <Field label="Then · Action">
            <select value={actionSel} onChange={(e) => setActionSel(e.target.value)} style={input}>
              {ACTION_PRESETS.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
              <option value={CUSTOM}>Custom…</option>
            </select>
            {actionSel === CUSTOM && (
              <input
                value={actionCustom}
                onChange={(e) => setActionCustom(e.target.value)}
                placeholder="Describe the action"
                style={{ ...input, marginTop: 6 }}
              />
            )}
          </Field>

          <button
            onClick={submit}
            disabled={!canSubmit}
            style={{
              width: '100%',
              marginTop: 6,
              fontFamily: C.mono,
              fontSize: 12.5,
              fontWeight: 600,
              padding: 12,
              borderRadius: 10,
              border: `1px solid ${canSubmit ? C.teal : C.line}`,
              background: canSubmit ? 'rgba(47,217,201,0.10)' : C.panel2,
              color: canSubmit ? C.teal : C.ink3,
              cursor: canSubmit ? 'pointer' : 'not-allowed',
            }}
          >
            {create.isPending ? 'Saving…' : 'Create rule'}
          </button>
          {flash && (
            <div style={{ marginTop: 10, fontFamily: C.mono, fontSize: 11, color: flash.startsWith('Failed') ? C.red : C.green }}>
              {flash}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontFamily: C.mono, fontSize: 9.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.ink3, display: 'block', marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const card: React.CSSProperties = {
  border: `1px solid ${C.line}`,
  borderRadius: 12,
  background: 'rgba(18,21,28,0.5)',
  padding: 16,
};
const banner: React.CSSProperties = {
  border: `1px solid ${C.amber}`,
  borderRadius: 10,
  background: 'rgba(230,178,76,0.08)',
  color: C.amber,
  fontFamily: C.mono,
  fontSize: 11.5,
  lineHeight: 1.5,
  padding: '10px 12px',
  marginBottom: 14,
};
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
const iconBtn: React.CSSProperties = {
  display: 'grid',
  placeItems: 'center',
  width: 30,
  height: 30,
  borderRadius: 8,
  border: `1px solid ${C.line}`,
  background: C.panel2,
  cursor: 'pointer',
};
