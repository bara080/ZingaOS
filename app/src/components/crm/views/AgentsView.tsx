'use client';

// CRM · AI Agents (docs/outreach-crm-plan.md §5 / AI-SDR layer). Persists agent
// CONFIG only — name, role, tone, goal, system prompt, model, temperature,
// escalation. Execution runs on the OpenAI Responses API and is NOT wired yet
// (no API key). Left: agent list with enable toggle. Right: config builder.
import { useState } from 'react';
import { Bot, Power } from 'lucide-react';
import { useAgents, useAgentCreate, useAgentSetEnabled } from '../hooks';
import type { Agent } from '../api';
import { Pager, usePager } from '../Pager';
import { C } from '@/components/operator/theme';

const MODELS = ['gpt-4', 'gpt-4o', 'gpt-4o-mini'];

export function AgentsView() {
  const listQ = useAgents();
  const create = useAgentCreate();
  const setEnabled = useAgentSetEnabled();
  const agents = listQ.data?.agents ?? [];
  const pager = usePager(agents, 6, agents.length);

  // create-form state
  const [name, setName] = useState('');
  const [role, setRole] = useState('SDR');
  const [tone, setTone] = useState('friendly, concise');
  const [goal, setGoal] = useState('Book a demo');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [model, setModel] = useState('gpt-4');
  const [temperature, setTemperature] = useState(0.5);
  const [escalation, setEscalation] = useState('Handoff to human on pricing or complaints');
  const [flash, setFlash] = useState<string | null>(null);

  const submit = () => {
    if (!name.trim() || create.isPending) return;
    setFlash(null);
    create.mutate(
      {
        name: name.trim(),
        role,
        tone,
        goal,
        systemPrompt,
        model,
        temperature,
        escalation,
      },
      {
        onSuccess: () => {
          setFlash('Agent saved ✓');
          setName('');
          setSystemPrompt('');
        },
        onError: (e) => setFlash(`Failed: ${e instanceof Error ? e.message : 'error'}`),
      },
    );
  };

  return (
    <div style={{ width: '100%' }}>
      <h2 style={{ fontFamily: C.sans, fontSize: 18, fontWeight: 600, color: C.ink, margin: '0 0 14px' }}>
        AI Agents
      </h2>

      {/* ── amber notice banner ─────────────────────────────────────── */}
      <div style={banner}>
        <span style={{ fontWeight: 700 }}>Agent config is saved.</span> Execution runs on the OpenAI
        Responses API — not wired yet (no API key). See docs/outreach-crm-plan.md §5 / AI-SDR layer.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, alignItems: 'start' }}>
        {/* ── list ─────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {listQ.isError ? (
            <div style={{ fontFamily: C.mono, fontSize: 12, color: C.red }}>
              {listQ.error instanceof Error ? listQ.error.message : 'failed to load agents'}
            </div>
          ) : agents.length === 0 ? (
            <div style={{ ...card, color: C.ink3, fontFamily: C.mono, fontSize: 12 }}>
              {listQ.isLoading ? 'loading…' : 'No agents yet — build one on the right.'}
            </div>
          ) : (
            pager.slice.map((a: Agent) => {
              const on = a.enabled;
              return (
                <div key={a.id} style={card}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: C.panel2, border: `1px solid ${C.line}`, display: 'grid', placeItems: 'center', color: C.teal }}>
                      <Bot size={17} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: C.sans, fontSize: 14, fontWeight: 600, color: C.ink }}>{a.name}</div>
                      <div style={{ fontFamily: C.mono, fontSize: 10, color: C.ink3 }}>
                        {a.role ?? 'agent'}{a.goal ? ` · ${a.goal}` : ''}
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
                      onClick={() => setEnabled.mutate({ id: a.id, enabled: !on })}
                      disabled={setEnabled.isPending}
                      title={on ? 'Disable' : 'Enable'}
                      style={{ ...iconBtn, color: on ? C.amber : C.green }}
                    >
                      <Power size={14} />
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
                    <Meta label="Model" text={a.model} accent={C.teal} />
                    <Meta label="Temp" text={String(a.temperature)} />
                    <Meta label="Tone" text={a.tone ?? '—'} />
                    <Meta label="Escalation" text={a.escalation ?? '—'} />
                  </div>
                </div>
              );
            })
          )}
          <Pager p={pager} noun="agents" />
        </div>

        {/* ── config builder ───────────────────────────────────────── */}
        <div style={card}>
          <div style={{ fontFamily: C.sans, fontSize: 14, fontWeight: 600, color: C.ink, marginBottom: 14 }}>
            New agent
          </div>

          <Field label="Identity · Name">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Zinga SDR" style={input} />
          </Field>

          <Field label="Role">
            <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Sales development rep" style={input} />
          </Field>

          <Field label="Tone">
            <input value={tone} onChange={(e) => setTone(e.target.value)} placeholder="friendly, concise" style={input} />
          </Field>

          <Field label="Goal">
            <input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Book a demo" style={input} />
          </Field>

          <Field label="System prompt">
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="You are Zinga's outreach agent. Speak in the brand voice…"
              rows={5}
              style={{ ...input, resize: 'vertical', lineHeight: 1.5 }}
            />
          </Field>

          <Field label="Model">
            <select value={model} onChange={(e) => setModel(e.target.value)} style={input}>
              {MODELS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </Field>

          <Field label={`Temperature · ${temperature.toFixed(2)}`}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="range"
                min={0}
                max={2}
                step={0.05}
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
                style={{ flex: 1, accentColor: C.teal }}
              />
              <input
                type="number"
                min={0}
                max={2}
                step={0.05}
                value={temperature}
                onChange={(e) => setTemperature(Math.max(0, Math.min(2, Number(e.target.value) || 0)))}
                style={{ ...input, width: 72 }}
              />
            </div>
          </Field>

          <Field label="Escalation">
            <input
              value={escalation}
              onChange={(e) => setEscalation(e.target.value)}
              placeholder="Handoff to human on…"
              style={input}
            />
          </Field>

          <button
            onClick={submit}
            disabled={!name.trim() || create.isPending}
            style={{
              width: '100%',
              marginTop: 6,
              fontFamily: C.mono,
              fontSize: 12.5,
              fontWeight: 600,
              padding: 12,
              borderRadius: 10,
              border: `1px solid ${name.trim() ? C.teal : C.line}`,
              background: name.trim() ? 'rgba(47,217,201,0.10)' : C.panel2,
              color: name.trim() ? C.teal : C.ink3,
              cursor: name.trim() && !create.isPending ? 'pointer' : 'not-allowed',
            }}
          >
            {create.isPending ? 'Saving…' : 'Create agent'}
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

function Meta({ label, text, accent }: { label: string; text: string; accent?: string }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontFamily: C.sans, fontSize: 13, fontWeight: 600, color: accent ?? C.ink, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {text}
      </div>
      <div style={{ fontFamily: C.mono, fontSize: 9, letterSpacing: '0.05em', textTransform: 'uppercase', color: C.ink3 }}>{label}</div>
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
