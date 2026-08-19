#!/usr/bin/env python3
"""Zinga OS — Operator Cockpit (local, non-developer control panel).

Zero-install (stdlib). Run on your always-on host:
    python3 tools/operator/app.py      # open http://127.0.0.1:8787

Binds 127.0.0.1 ONLY. Sends real cold email, so it stays LOCAL — never public.

Send Console:
  1. Choose a DATA SOURCE (a CSV list; DB/CRM shown as "connect").
  2. Preview recipients + how many already sent.
  3. Send / Pause / Stop (the sender polls runs/.send-control between sends).
  4. Live 3D globe + progress + review + logs.
"""
import csv, json, subprocess, os, sys, time, re, urllib.request, urllib.error
from datetime import date
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
PORT = int(os.environ.get("OPERATOR_PORT", "8787"))
CONTROL = ROOT / "runs" / ".send-control"
CAMPAIGN = "/Users/bara080/bara/zingaSocialMediaCampaign/for-providers/sequences/salon_v1_day0_send.csv"
SRC_DIRS = [Path("/Users/bara080/bara/zingaSocialMediaCampaign/for-providers/sequences"),
            ROOT / "data", ROOT / "runs"]
sys.path.insert(0, str(ROOT / "tools"))
try:
    import db as dbmod
except Exception:
    dbmod = None

# ── Apify scrape layer ──────────────────────────────────────────────────────
def _load_apify_token():
    envf = ROOT / ".env"
    if envf.exists():
        try:
            for ln in envf.read_text().splitlines():
                ln = ln.strip()
                if ln.startswith("APIFY_TOKEN="):
                    v = ln.split("=", 1)[1].strip()
                    # strip inline comments and quotes
                    v = v.split("#", 1)[0].strip().strip('"').strip("'")
                    if v:
                        return v
        except Exception:
            pass
    return os.environ.get("APIFY_TOKEN", "")

APIFY_TOKEN = _load_apify_token()
ACTORS = {"ig": "shu8hvrXbJbY3Eb9W",
          "google": "compass~crawler-google-places",
          "tiktok": "clockworks~tiktok-scraper"}
_DROP_RE = re.compile(r"(london|uk|toronto|canada|dubai|paris|seoul|korea|sydney|"
                      r"berlin|mumbai|india|lagos|madrid|milan)", re.I)

# ── n8n: every source runs through its <source>-leads-cron workflow ──────────
def _env_val(key):
    envf = ROOT / ".env"
    if envf.exists():
        try:
            for ln in envf.read_text().splitlines():
                ln = ln.strip()
                if ln.startswith(key + "="):
                    v = ln.split("=", 1)[1].split("#", 1)[0].strip().strip('"').strip("'")
                    if v:
                        return v
        except Exception:
            pass
    return os.environ.get(key, "")

N8N_API_KEY = _env_val("N8N_API_KEY") or _env_val("n8n_automation_keys")
N8N_BASE = "https://bara080.app.n8n.cloud"
N8N_SOURCES = {
    "ig":     {"path": "ig-leads-run",     "wf": "h1Uvz3lmG1g3T2mO"},
    "google": {"path": "google-leads-run", "wf": "aoOzGT6ThaZIRe6F"},
    "tiktok": {"path": "tiktok-leads-run", "wf": "37cflCKZ9w5VI4Qq"},
}

def _n8n_req(method, path, payload=None):
    data = json.dumps(payload).encode() if payload is not None else None
    h = {"Content-Type": "application/json"}
    if N8N_API_KEY:
        h["X-N8N-API-KEY"] = N8N_API_KEY
    req = urllib.request.Request(N8N_BASE + path, data=data, method=method, headers=h)
    with urllib.request.urlopen(req, timeout=45) as r:
        return json.loads(r.read().decode() or "{}")

def _n8n_latest_exec(wf, after_id=0):
    try:
        d = _n8n_req("GET", f"/api/v1/executions?workflowId={wf}&limit=5")
        execs = [e for e in d.get("data", []) if int(e.get("id", 0)) > int(after_id)]
        return max(execs, key=lambda e: int(e["id"])) if execs else None
    except Exception:
        return None

def n8n_start(source, query=None, number=20):
    if source not in N8N_SOURCES:
        return {"error": "unknown source"}
    if not N8N_API_KEY:
        return {"error": "N8N_API_KEY not set (add it to .env)"}
    cfg = N8N_SOURCES[source]
    try:
        number = max(1, min(200, int(number or 20)))
    except (TypeError, ValueError):
        number = 20
    baseline = 0
    try:  # newest execution id BEFORE trigger, so we can spot the new run
        d = _n8n_req("GET", f"/api/v1/executions?workflowId={cfg['wf']}&limit=1")
        if d.get("data"):
            baseline = int(d["data"][0]["id"])
    except Exception:
        pass
    try:
        body = json.dumps({"query": (query or "").strip(), "number": number}).encode()
        req = urllib.request.Request(f"{N8N_BASE}/webhook/{cfg['path']}",
                                     data=body, method="POST",
                                     headers={"Content-Type": "application/json"})
        urllib.request.urlopen(req, timeout=45).read()
    except urllib.error.HTTPError as e:
        return {"error": f"n8n webhook HTTP {e.code}: {e.reason}"}
    except Exception as e:
        return {"error": f"n8n trigger failed: {e}"}
    marker = f"n8n:{source}:{baseline}"
    return {"runId": marker, "datasetId": marker}

def _parse_marker(marker):
    parts = (marker or "").split(":")
    return (parts[1], parts[2]) if len(parts) == 3 else (None, "0")

def n8n_status(marker):
    source, baseline = _parse_marker(marker)
    if source not in N8N_SOURCES:
        return {"error": "bad marker"}
    e = _n8n_latest_exec(N8N_SOURCES[source]["wf"], baseline)
    if not e:
        return {"status": "RUNNING"}
    st = e.get("status")
    if e.get("finished") or st in ("success", "error", "crashed"):
        return {"status": "SUCCEEDED" if st == "success" else "FAILED"}
    return {"status": "RUNNING"}

def n8n_results(marker):
    source, baseline = _parse_marker(marker)
    if source not in N8N_SOURCES:
        return {"error": "bad marker"}
    e = _n8n_latest_exec(N8N_SOURCES[source]["wf"], baseline)
    if not e:
        return {"error": "no n8n execution found yet"}
    try:
        full = _n8n_req("GET", f"/api/v1/executions/{e['id']}?includeData=true")
        run = (full.get("data") or {}).get("resultData", {}).get("runData", {})
        agg = run.get("Aggregate · Collect")
        leads = ((agg[0].get("data") or {}).get("main") or [[{}]])[0][0].get("json", {}).get("data", []) if agg else []
    except Exception as ex:
        return {"error": f"n8n results failed: {ex}"}
    rows = [l for l in leads if isinstance(l, dict) and any(l.values())]
    fields = list(rows[0].keys()) if rows else []
    out = ROOT / "runs" / f"{date.today().isoformat()}-{source}-leads.csv"
    try:
        with out.open("w", newline="") as fh:
            w = csv.DictWriter(fh, fieldnames=fields)
            w.writeheader()
            for r in rows:
                w.writerow({k: r.get(k, "") for k in fields})
    except Exception:
        pass
    return {"items": rows, "found": len(rows), "dropped": 0, "csv": out.name, "source": source}

def _apify_input(source, query):
    if source == "ig":
        return {"search": query, "searchType": "user", "searchLimit": 1,
                "resultsType": "details", "resultsLimit": 20}
    if source == "google":
        return {"searchStringsArray": [query], "maxCrawledPlacesPerSearch": 20,
                "language": "en"}
    if source == "tiktok":
        return {"searchQueries": [query], "resultsPerPage": 20}
    raise ValueError("unknown source")

def _apify_req(method, url, payload=None):
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(url, data=data, method=method,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=45) as r:
        return json.loads(r.read().decode() or "{}")

def apify_start(source, query, number=20):
    if source in N8N_SOURCES:          # all sources run through their n8n workflow
        return n8n_start(source, query, number)
    if source not in ACTORS:
        return {"error": "unknown source"}
    if not APIFY_TOKEN:
        return {"error": "APIFY_TOKEN not set (add it to .env)"}
    if not (query or "").strip():
        return {"error": "query is empty"}
    actor = ACTORS[source]
    url = f"https://api.apify.com/v2/acts/{actor}/runs?token={APIFY_TOKEN}"
    try:
        resp = _apify_req("POST", url, _apify_input(source, query))
        d = resp.get("data", {})
        return {"runId": d.get("id"), "datasetId": d.get("defaultDatasetId")}
    except urllib.error.HTTPError as e:
        return {"error": f"Apify HTTP {e.code}: {e.reason}"}
    except Exception as e:
        return {"error": f"Apify start failed: {e}"}

def apify_status(runId):
    if str(runId).startswith("n8n:"):
        return n8n_status(runId)
    if not APIFY_TOKEN:
        return {"error": "APIFY_TOKEN not set (add it to .env)"}
    if not runId:
        return {"error": "missing runId"}
    url = f"https://api.apify.com/v2/actor-runs/{runId}?token={APIFY_TOKEN}"
    try:
        resp = _apify_req("GET", url)
        return {"status": resp.get("data", {}).get("status")}
    except urllib.error.HTTPError as e:
        return {"error": f"Apify HTTP {e.code}: {e.reason}"}
    except Exception as e:
        return {"error": f"Apify status failed: {e}"}

def apify_items(datasetId, source):
    if str(datasetId).startswith("n8n:"):
        return n8n_results(datasetId)
    if not APIFY_TOKEN:
        return {"error": "APIFY_TOKEN not set (add it to .env)"}
    if not datasetId:
        return {"error": "missing datasetId"}
    url = (f"https://api.apify.com/v2/datasets/{datasetId}/items"
           f"?clean=true&format=json&token={APIFY_TOKEN}")
    try:
        raw = _apify_req("GET", url) or []
    except urllib.error.HTTPError as e:
        return {"error": f"Apify HTTP {e.code}: {e.reason}"}
    except Exception as e:
        return {"error": f"Apify results failed: {e}"}
    if not isinstance(raw, list):
        raw = []
    rows, dropped = [], 0
    if source in ("ig", "tiktok"):
        for it in raw:
            uname = it.get("username") or it.get("uniqueId") or ""
            if not uname and isinstance(it.get("authorMeta"), dict):
                uname = it["authorMeta"].get("name") or ""
            uname = (uname or "").strip()
            if not uname:
                dropped += 1
                continue
            bio = (it.get("biography") or it.get("signature") or "").strip()
            if bio and _DROP_RE.search(bio):
                dropped += 1
                continue
            link = it.get("url") or (f"https://instagram.com/{uname}" if source == "ig"
                                     else f"https://tiktok.com/@{uname}")
            rows.append({"username": uname, "url": link, "biography": bio})
        fields = ["username", "url", "biography"]
    else:  # google
        for it in raw:
            name = (it.get("title") or it.get("name") or "").strip()
            if not name:
                dropped += 1
                continue
            email = it.get("email") or ""
            if not email and isinstance(it.get("emails"), list) and it["emails"]:
                email = it["emails"][0] or ""
            rows.append({"name": name,
                         "address": (it.get("address") or "").strip(),
                         "phone": (it.get("phone") or it.get("phoneUnformatted") or "").strip(),
                         "email": email.strip()})
        fields = ["name", "address", "phone", "email"]
    out = ROOT / "runs" / f"{date.today().isoformat()}-{source}-leads.csv"
    try:
        with out.open("w", newline="") as fh:
            w = csv.DictWriter(fh, fieldnames=fields)
            w.writeheader()
            for r in rows:
                w.writerow(r)
    except Exception:
        pass
    return {"items": rows, "found": len(rows), "dropped": dropped,
            "csv": out.name, "source": source}
# ─────────────────────────────────────────────────────────────────────────────

def rowsf(p):
    p = Path(p)
    if not p.exists(): return []
    try:
        with p.open(newline="") as fh: return list(csv.DictReader(fh))
    except Exception: return []

def sent_map():
    m = {}
    for r in rowsf(ROOT / "data/outreach.csv"):
        pid = (r.get("provider_id") or "").strip().lower()
        m[pid] = "failed" if (r.get("replied") or "") == "failed" else "sent"
    return m

def has_email(f):
    try:
        hdr = next(csv.reader(f.open()))
        return any((c or "").strip().lower() in ("to_email", "email") for c in hdr)
    except Exception:
        return False

def recipients_of(src):
    out = []
    for r in rowsf(src):
        e = (r.get("to_email") or r.get("email") or "").strip()
        if e: out.append({"email": e, "biz": (r.get("business_name") or "").strip()})
    return out

def sources():
    out, seen = [], set()
    if dbmod:
        try:
            c = dbmod.conn(); dbmod.sync_from_outreach(c); s = dbmod.stats(c); c.close()
            out.append({"id": "db://leads", "kind": "db",
                        "label": f"Database · leads ({s['contacted']}/{s['contacted']+s['pending']} sendable)",
                        "count": s["contacted"] + s["pending"], "sent": s["contacted"]})
        except Exception:
            pass
    for d in SRC_DIRS:
        if not d.exists(): continue
        for f in sorted(d.glob("*.csv")):
            if f.name.startswith("_") or str(f) in seen or not has_email(f): continue
            recs = recipients_of(f)
            if not recs: continue
            seen.add(str(f))
            sm = sent_map()
            sent = sum(1 for r in recs if sm.get(r["email"].lower()))
            out.append({"id": str(f), "label": f.name, "kind": "csv",
                        "count": len(recs), "sent": sent})
    out.append({"id": "hubspot", "label": "HubSpot CRM — connect", "kind": "db", "disabled": True})
    out.append({"id": "smartlead", "label": "Smartlead — connect", "kind": "db", "disabled": True})
    return out

def control_raw():
    return CONTROL.read_text().strip() if CONTROL.exists() else "idle"

def campaign(src=None):
    if src == "db://leads" and dbmod:
        c = dbmod.conn(); dbmod.sync_from_outreach(c); recs = dbmod.leads_min(c); c.close()
        sent = sum(1 for r in recs if r["status"] == "sent")
        raw = control_raw()
        fresh = (ROOT / "data/outreach.csv").exists() and (time.time() - (ROOT / "data/outreach.csv").stat().st_mtime) < 120
        return {"src": src, "recipients": recs, "total": len(recs), "sent": sent, "failed": 0,
                "pending": len(recs) - sent, "control": raw, "active": raw == "pause" or (raw == "run" and fresh)}
    src = src or CAMPAIGN
    recs = recipients_of(src)
    sm = sent_map()
    for r in recs: r["status"] = sm.get(r["email"].lower(), "pending")
    sent = sum(1 for r in recs if r["status"] == "sent")
    failed = sum(1 for r in recs if r["status"] == "failed")
    raw = control_raw()
    fresh = (ROOT / "data/outreach.csv").exists() and (time.time() - (ROOT / "data/outreach.csv").stat().st_mtime) < 120
    active = raw == "pause" or (raw == "run" and fresh)
    return {"src": src, "recipients": recs, "total": len(recs), "sent": sent, "failed": failed,
            "pending": len(recs) - sent - failed, "control": raw, "active": active}

def sent_review():
    out = []
    for r in rowsf(ROOT / "data/outreach.csv"):
        pid = (r.get("provider_id") or "").strip()
        if pid == "TEST-SMOKE" or "baraahmad232" in pid: continue
        out.append({"date": r.get("date", ""), "to": pid, "subject": r.get("subject", ""),
                    "status": r.get("replied", "sent")})
    return list(reversed(out))

def logs():
    a = ROOT / "runs/send-audit.log"
    audit = a.read_text().splitlines()[-30:] if a.exists() else []
    runlogs = sorted((f.name for f in (ROOT / "runs").glob("*.md")), reverse=True)[:12]
    return {"audit": list(reversed(audit)), "runs": runlogs}

def launch_send(src):
    c = campaign(src)
    if c["active"]:
        return {"error": "A send is already active — pause or stop it first."}
    pending = [r for r in c["recipients"] if r["status"] == "pending"]
    if not pending:
        return {"error": "Nothing pending in this source — all already sent."}
    tmp = ROOT / "runs" / "_operator_pending.csv"
    with tmp.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["to_email", "business_name"]); w.writeheader()
        for r in pending: w.writerow({"to_email": r["email"], "business_name": r["biz"]})
    CONTROL.write_text("run")
    env = {**os.environ, "OUTREACH_APPROVED": "yes"}
    subprocess.Popen([sys.executable, "tools/smtp_send.py", "--list", str(tmp),
                      "--send", "--delay", "75", "--control", str(CONTROL)],
                     cwd=ROOT, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return {"started": True, "count": len(pending)}

def set_control(action):
    m = {"pause": "pause", "resume": "run", "stop": "stop"}
    if action not in m: return {"error": "bad action"}
    CONTROL.write_text(m[action])
    return {"ok": True, "control": m[action]}

PAGE = r"""<!doctype html><html lang=en><head><meta charset=utf-8>
<meta name=viewport content="width=device-width,initial-scale=1"><title>Zinga OS — Operator</title>
<style>
:root{--bg:#0B0D11;--panel:#12151C;--panel2:#171B23;--line:#232833;--ink:#E7EBF1;--ink2:#98A1AE;--ink3:#5E6672;
--teal:#2FD9C9;--green:#4FD08A;--red:#E0655A;--amber:#E6B24C;--mono:ui-monospace,"SF Mono",Menlo,monospace;--sans:system-ui,-apple-system,sans-serif;}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(1100px 600px at 40% 0%,#10151d,var(--bg) 60%);color:var(--ink);font-family:var(--sans)}
.nav{display:flex;gap:4px;align-items:center;padding:9px 16px;border-bottom:1px solid var(--line);font-family:var(--mono);background:rgba(10,12,16,.7);position:sticky;top:0;z-index:10}
.nav .b{font-size:12px;letter-spacing:.14em;margin-right:12px;display:flex;gap:7px;align-items:center}.nav .b .d{width:7px;height:7px;border-radius:50%;background:var(--teal);box-shadow:0 0 10px var(--teal)}
.nav a{font-size:11.5px;color:var(--ink2);text-decoration:none;padding:6px 10px;border-radius:7px}.nav a:hover{color:var(--ink);background:var(--panel2)}
.nav a.cur{background:var(--teal);color:var(--bg);font-weight:600}.nav .sp{flex:1}.nav .ext{color:var(--ink3);font-size:10px}
.wrap{max-width:1100px;margin:0 auto;padding:20px}
.ey{font-family:var(--mono);font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink3);margin:22px 2px 10px}
.tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.tile{background:var(--panel);border:1px solid var(--line);border-radius:11px;padding:15px;position:relative;overflow:hidden}
.tile:before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px}.tile.g:before{background:var(--green)}.tile.a:before{background:var(--amber)}.tile.r:before{background:var(--red)}
.tile .k{font-family:var(--mono);font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink2)}
.tile .v{font-size:28px;font-weight:650;margin:6px 0 2px;font-variant-numeric:tabular-nums}.tile .v small{font-size:13px;color:var(--ink3);font-weight:500}.tile .d{font-size:12px;color:var(--ink2)}
.card{background:var(--panel);border:1px solid var(--line);border-radius:11px;padding:16px}
.console{display:grid;grid-template-columns:1.1fr 1fr;gap:16px;align-items:start}
.globewrap{position:relative}
#globe{width:100%;height:330px;display:block;background:radial-gradient(400px 300px at 50% 45%,#0c141a,#0a0d12);border:1px solid var(--line);border-radius:11px}
.glegend{position:absolute;top:12px;left:12px;font-family:var(--mono);font-size:11px;display:flex;flex-direction:column;gap:6px;color:var(--ink2)}
.glegend div{display:flex;align-items:center;gap:7px}.glegend .sw{width:9px;height:9px;border-radius:50%}.glegend b{color:var(--ink);font-variant-numeric:tabular-nums;min-width:22px;text-align:right}
.gbig{position:absolute;bottom:12px;left:12px;font-family:var(--mono)}.gbig b{font-size:26px;color:var(--green);font-variant-numeric:tabular-nums}.gbig span{font-size:10px;color:var(--ink3);letter-spacing:.12em;text-transform:uppercase;display:block}
label.f{font-family:var(--mono);font-size:9.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink3);display:block;margin-bottom:6px}
select{width:100%;font-family:var(--mono);font-size:12.5px;padding:10px;border-radius:9px;background:var(--panel2);color:var(--ink);border:1px solid var(--line);margin-bottom:12px}
.counts{display:flex;gap:16px;font-family:var(--mono);font-size:12px;margin:2px 0 10px}.counts b{font-size:20px;display:block;font-variant-numeric:tabular-nums}
.counts .s{color:var(--green)}.counts .p{color:var(--ink2)}.counts .x{color:var(--red)}
.prog{height:12px;background:var(--panel2);border-radius:7px;overflow:hidden;margin:4px 0 6px}.prog .f{height:100%;background:linear-gradient(90deg,var(--teal),var(--green));width:0;transition:width .6s}
.ctrls{display:grid;grid-template-columns:2fr 1fr 1fr;gap:8px;margin-top:12px}
.btn{font-family:var(--mono);font-size:12.5px;padding:12px;border-radius:10px;border:1px solid var(--line);background:var(--panel2);color:var(--ink);cursor:pointer;font-weight:600}
.btn.send{border-color:var(--teal);background:rgba(47,217,201,.08);color:var(--teal)}.btn.send:hover{background:rgba(47,217,201,.16)}
.btn.pause{border-color:var(--amber);color:var(--amber)}.btn.stop{border-color:var(--red);color:var(--red)}
.btn:disabled{opacity:.35;cursor:not-allowed;color:var(--ink3);border-color:var(--line);background:var(--panel2)}
.live{display:inline-flex;gap:6px;align-items:center;font-family:var(--mono);font-size:10px;text-transform:uppercase;letter-spacing:.1em}
.live.on{color:var(--green)}.live.pz{color:var(--amber)}.live .d{width:7px;height:7px;border-radius:50%;background:currentColor;animation:bl 1.4s infinite}@keyframes bl{50%{opacity:.3}}
table{width:100%;border-collapse:collapse;font-size:12.5px}th{font-family:var(--mono);font-size:9.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--ink3);text-align:left;padding:8px 10px;border-bottom:1px solid var(--line)}
td{padding:7px 10px;border-bottom:1px solid var(--panel2)}td.m{font-family:var(--mono);color:var(--ink2)}
.pill{font-family:var(--mono);font-size:9px;padding:2px 7px;border-radius:20px}.pill.sent{background:rgba(79,208,138,.15);color:var(--green)}.pill.failed{background:rgba(224,101,90,.15);color:var(--red)}
.rev{max-height:280px;overflow:auto}.foot{font-family:var(--mono);font-size:11px;color:var(--ink3);margin-top:26px;padding-top:14px;border-top:1px solid var(--line)}
.shell{display:flex;align-items:flex-start}
.side{width:240px;flex:0 0 240px;position:sticky;top:41px;align-self:flex-start;max-height:calc(100vh - 41px);overflow:auto;
 padding:18px 14px;border-right:1px solid var(--line);background:rgba(10,12,16,.5)}
.side .ey{margin:0 0 12px}
.pills{display:flex;gap:6px;margin-bottom:10px}
.pill-r{flex:1;font-family:var(--mono);font-size:10px;text-align:center;padding:8px 4px;border-radius:8px;border:1px solid var(--line);
 background:var(--panel2);color:var(--ink2);cursor:pointer;user-select:none}
.pill-r.on{border-color:var(--teal);background:rgba(47,217,201,.1);color:var(--teal);font-weight:600}
.side input.q{width:100%;font-family:var(--mono);font-size:12px;padding:9px;border-radius:8px;background:var(--panel2);
 color:var(--ink);border:1px solid var(--line);margin-bottom:10px}
.side .run{width:100%;font-family:var(--mono);font-size:12px;padding:10px;border-radius:9px;border:1px solid var(--teal);
 background:rgba(47,217,201,.08);color:var(--teal);cursor:pointer;font-weight:600}
.side .run:disabled{opacity:.4;cursor:not-allowed}
.sstat{margin-top:12px;font-family:var(--mono);font-size:11px;min-height:18px;display:flex;align-items:center;gap:8px}
.sstat.idle{color:var(--ink3)}
.sstat.run{color:var(--teal)}
.sstat.ok{color:var(--green)}
.sstat.err{color:var(--red);align-items:flex-start;line-height:1.4}
.spin{width:9px;height:9px;border-radius:50%;background:var(--teal);box-shadow:0 0 8px var(--teal);animation:pulse 1.1s infinite}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.35;transform:scale(.6)}}
.sres{margin-top:12px;display:flex;flex-direction:column;gap:5px;max-height:40vh;overflow:auto}
.sres a{font-family:var(--mono);font-size:10.5px;color:var(--ink2);text-decoration:none;padding:5px 7px;border-radius:6px;
 background:var(--panel2);border:1px solid var(--line);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sres a:hover{color:var(--teal);border-color:var(--teal)}
.chan{display:flex;gap:6px;margin-bottom:12px}
.chan .c{flex:1;font-family:var(--mono);font-size:10px;text-align:center;padding:7px 4px;border-radius:8px;border:1px solid var(--line);
 background:var(--panel2);color:var(--ink2);cursor:pointer;user-select:none}
.chan .c.on{border-color:var(--teal);background:rgba(47,217,201,.1);color:var(--teal);font-weight:600}
.chan-note{font-family:var(--mono);font-size:11px;color:var(--amber);padding:11px;border:1px solid var(--line);
 border-radius:10px;background:rgba(230,178,76,.06);text-align:center;margin-top:12px}
/* ── sidebar tab nav ── */
.navmenu{display:flex;flex-direction:column;gap:4px}
.navtab{display:flex;align-items:center;gap:10px;font-family:var(--mono);font-size:12px;letter-spacing:.03em;
 padding:10px 12px;border-radius:9px;color:var(--ink2);cursor:pointer;user-select:none;border:1px solid transparent}
.navtab .ic{font-size:14px;width:18px;text-align:center;flex:0 0 18px}
.navtab:hover{background:var(--panel2);color:var(--ink)}
.navtab.on{background:var(--teal);color:var(--bg);font-weight:600}
.navtab.dim{opacity:.4;cursor:not-allowed}
.navtab.dim:hover{background:transparent;color:var(--ink2)}
/* ── switchable panels ── */
.panel{display:none}.panel.on{display:block}
/* ── scrape body ── */
.scrapebar{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.scrapebar .pills{margin-bottom:0;flex:0 0 270px}
.scrapebar input.q{flex:1;min-width:180px;font-family:var(--mono);font-size:12.5px;padding:11px;border-radius:9px;
 background:var(--panel2);color:var(--ink);border:1px solid var(--line)}
.scrapebar .run{flex:0 0 auto;font-family:var(--mono);font-size:12.5px;padding:12px 20px;border-radius:9px;
 border:1px solid var(--teal);background:rgba(47,217,201,.08);color:var(--teal);cursor:pointer;font-weight:600}
.scrapebar .run:hover{background:rgba(47,217,201,.16)}.scrapebar .run:disabled{opacity:.4;cursor:not-allowed}
/* ── analytics funnel ── */
.funnel{display:flex;flex-direction:column;gap:10px}
.frow{display:flex;align-items:center;gap:12px}
.frow .fl{font-family:var(--mono);font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink2);flex:0 0 90px}
.frow .fbar{flex:1;height:26px;background:var(--panel2);border-radius:7px;overflow:hidden;position:relative}
.frow .fbar>span{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(90deg,var(--teal),var(--green));
 border-radius:7px;display:flex;align-items:center;justify-content:flex-end;padding-right:8px;
 font-family:var(--mono);font-size:11px;color:var(--bg);font-weight:600;min-width:24px}
@media(max-width:820px){.tiles{grid-template-columns:1fr}.console{grid-template-columns:1fr}
 .shell{flex-direction:column}.side{width:100%;flex:none;position:static;max-height:none;border-right:none;border-bottom:1px solid var(--line)}}
</style></head><body>
<div class=nav><span class=b><span class=d></span>ZINGA&nbsp;OS</span>
<a href="https://zinga-os-web.vercel.app/graph.html">Knowledge&nbsp;Graph</a>
<a href="https://zinga-os-web.vercel.app/tree.html">System&nbsp;Tree</a>
<a href="https://zinga-os-web.vercel.app/neural.html">Neural&nbsp;Map</a>
<a href="#" class=cur>Operator</a><span class=sp></span><span class=ext>local · 127.0.0.1 · sends live here</span></div>
<div class=shell>
<aside class=side>
 <div class=ey>Operator</div>
 <div class=navmenu id=navmenu>
   <div class=navtab data-tab=scrape><span class=ic>◎</span>Scrape</div>
   <div class=navtab data-tab=analytics><span class=ic>▦</span>Analytics</div>
   <div class="navtab on" data-tab=email><span class=ic>✉</span>Email</div>
   <div class="navtab dim" data-tab=other><span class=ic>⋯</span>Other</div>
 </div>
</aside>
<div class=wrap>

<!-- ── SCRAPE PANEL ─────────────────────────────────────────── -->
<div class=panel id=panel-scrape>
 <div class=ey>Scrape leads</div>
 <div class=card>
  <div class=scrapebar>
    <div class=pills id=spills>
      <div class=pill-r data-src=google>Google</div>
      <div class=pill-r data-src=ig>Instagram</div>
      <div class=pill-r data-src=tiktok>TikTok</div>
    </div>
    <input class=q id=squery placeholder="hair stylist nyc">
    <input id=snum type=number min=1 max=200 value=20 title="how many to scrape"
      style="flex:0 0 78px;font-family:var(--mono);font-size:12.5px;padding:11px;border-radius:9px;background:var(--panel2);color:var(--ink);border:1px solid var(--line)">
    <button class=run id=srun onclick=runScrape()>Run scrape</button>
  </div>
  <div class="sstat idle" id=sstat>idle</div>
 </div>
 <div class=ey>Results <span id=srescount style="color:var(--ink3)"></span></div>
 <div class="card rev"><table><thead id=srhead></thead><tbody id=srbody><tr><td style="color:var(--ink3)">run a scrape to see leads</td></tr></tbody></table></div>
</div>

<!-- ── ANALYTICS PANEL ──────────────────────────────────────── -->
<div class=panel id=panel-analytics>
 <div class=ey>Analytics</div>
 <div class=tiles id=antiles></div>
 <div class=ey>Funnel</div>
 <div class=card><div class=funnel id=funnel></div></div>
</div>

<!-- ── EMAIL PANEL (default) ────────────────────────────────── -->
<div class="panel on" id=panel-email>
 <div class=ey>The three numbers</div><div class=tiles id=tiles></div>

 <div class=ey>Send console <span id=livewrap></span></div>
 <div class=console>
  <div class=globewrap>
   <canvas id=globe></canvas>
   <div class=glegend>
     <div><span class=sw style="background:var(--green)"></span>sent <b id=gSent>0</b></div>
     <div><span class=sw style="background:var(--red)"></span>failed <b id=gFail>0</b></div>
     <div><span class=sw style="background:#7C8698"></span>pending <b id=gPend>0</b></div>
   </div>
   <div class=gbig><b id=gBig>0</b><span>delivered</span></div>
  </div>
  <div class=card>
   <label class=f>Channel</label>
   <div class=chan id=chan>
     <div class=c data-ch=email>Email</div>
     <div class=c data-ch=ig>IG DM</div>
     <div class=c data-ch=social>Social</div>
   </div>
   <label class=f>Data source</label>
   <select id=source onchange=pickSrc()></select>
   <div class=counts><div class=s><b id=cSent>0</b>sent</div><div class=p><b id=cPend>0</b>pending</div><div class=x><b id=cFail>0</b>failed</div><div><b id=cTot>0</b>total</div></div>
   <div class=prog><div class=f id=progf></div></div>
   <div style="font-family:var(--mono);font-size:11px;color:var(--ink3)" id=progtxt>—</div>
   <div class=ctrls>
     <button class="btn send" id=bSend onclick=doSend()>▶ Send pending</button>
     <button class="btn pause" id=bPause onclick=doCtrl('pause') disabled>❚❚ Pause</button>
     <button class="btn stop" id=bStop onclick=doCtrl('stop') disabled>■ Stop</button>
   </div>
   <div class=chan-note id=channote style="display:none">Draft/export only — review before sending</div>
   <div style="font-size:11px;color:var(--ink3);margin-top:8px;line-height:1.5">Each dot is a recipient; it turns <span style="color:var(--green)">green</span> when delivered. Sending is rate-limited ~75s and logged. Pause holds between sends; Stop aborts cleanly.</div>
  </div>
 </div>

 <div class=ey>Review sent <span id=rcount style="color:var(--ink3)"></span></div>
 <div class="card rev"><table><thead><tr><th>Date</th><th>To</th><th>Subject</th><th>Status</th></tr></thead><tbody id=rev></tbody></table></div>

 <div class=ey>Logs</div>
 <div class=console>
  <div class=card><label class=f>Send audit trail</label><div class=rev id=audit style="font-family:var(--mono);font-size:11px;line-height:1.7"></div></div>
  <div class=card><label class=f>Recent run logs</label><div id=runs style="font-family:var(--mono);font-size:11.5px;line-height:1.9;color:var(--ink2)"></div></div>
 </div>
 <div class=foot>Zinga OS Operator · LOCAL ONLY — the Send button triggers real email; never deploy this to a public URL.</div>
</div><!-- /panel-email -->
</div><!-- /wrap -->
</div><!-- /shell -->
<script>
let NODES=[],rot=0,SRC='',SRCLOADED=false,CHAN='email',SCRSRC='google',POLL=null;
// ── Channel selector ────────────────────────────────────────────────────────
document.querySelectorAll('#chan .c').forEach(el=>el.onclick=()=>{
 CHAN=el.dataset.ch;
 document.querySelectorAll('#chan .c').forEach(x=>x.classList.toggle('on',x===el));
 applyChannel();});
function applyChannel(){const email=CHAN==='email';
 channote.style.display=email?'none':'block';
 if(!email){bSend.disabled=true;bSend.textContent=(CHAN==='ig'?'IG DM':'Social')+' — draft/export only';
  bPause.disabled=true;bStop.disabled=true;}}
// ── Scrape sidebar ──────────────────────────────────────────────────────────
document.querySelectorAll('#spills .pill-r').forEach(el=>el.onclick=()=>{
 SCRSRC=el.dataset.src;
 document.querySelectorAll('#spills .pill-r').forEach(x=>x.classList.toggle('on',x===el));});
function setStat(cls,html){sstat.className='sstat '+cls;sstat.innerHTML=html;}
async function runScrape(){const q=squery.value.trim();
 const num=Math.max(1,Math.min(200,parseInt(snum.value)||20));
 if(!q){setStat('err','enter a query first');return;}
 if(POLL){clearInterval(POLL);POLL=null;}
 srhead.innerHTML='';srbody.innerHTML='';srescount.textContent='';srun.disabled=true;
 setStat('run','<span class=spin></span>starting…');
 const r=await (await fetch('/api/scrape/start',{method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({source:SCRSRC,query:q,number:num})})).json();
 if(r.error){setStat('err','⚠ '+r.error);srun.disabled=false;return;}
 setStat('run','<span class=spin></span>scraping…');
 POLL=setInterval(()=>pollScrape(r.runId,r.datasetId),4000);}
async function pollScrape(runId,dataset){
 const s=await (await fetch('/api/scrape/status?runId='+encodeURIComponent(runId))).json();
 if(s.error){clearInterval(POLL);POLL=null;setStat('err','⚠ '+s.error);srun.disabled=false;return;}
 if(s.status==='SUCCEEDED'){clearInterval(POLL);POLL=null;return fetchResults(dataset);}
 if(['FAILED','ABORTED','TIMED-OUT'].includes(s.status)){clearInterval(POLL);POLL=null;
  setStat('err','⚠ run '+s.status.toLowerCase());srun.disabled=false;return;}
 setStat('run','<span class=spin></span>scraping… ('+(s.status||'…').toLowerCase()+')');}
async function fetchResults(dataset){
 const d=await (await fetch('/api/scrape/results?dataset='+encodeURIComponent(dataset)+'&source='+SCRSRC)).json();
 srun.disabled=false;
 if(d.error){setStat('err','⚠ '+d.error);return;}
 setStat('ok','✓ '+d.found+' found · '+d.dropped+' dropped');
 renderScrapeTable(d.items||[]);srescount.textContent='· '+(d.found||0);
 SRCLOADED=false;await loadSources();
 if(d.csv){const sel=document.getElementById('source');
  for(const o of sel.options){if(o.textContent.startsWith(d.csv)){sel.value=o.value;SRC=o.value;break;}}}
 NODES=[];loadCampaign();}
function renderScrapeTable(items){const esc=s=>(s||'').replace(/</g,'&lt;');
 const social=(SCRSRC==='ig'||SCRSRC==='tiktok');
 const cols=social?['Handle','Link','Bio / icebreaker']:['Name','Address','Phone','Email'];
 srhead.innerHTML='<tr>'+cols.map(c=>`<th>${c}</th>`).join('')+'</tr>';
 if(!items.length){srbody.innerHTML=`<tr><td colspan=${cols.length} style="color:var(--ink3)">no rows</td></tr>`;return;}
 srbody.innerHTML=items.slice(0,200).map(it=>{
  if(social){const h=it.username?('@'+it.username):(it.handle||it.name||'—'),link=it.url||'';
   return `<tr><td class=m>${esc(h)}</td>`
    +`<td>${link?`<a href="${esc(link)}" target=_blank rel=noopener style="color:var(--teal);text-decoration:none">open ↗</a>`:'—'}</td>`
    +`<td>${esc(it.biography||it.bio||it.icebreaker||'')}</td></tr>`;}
  return `<tr><td>${esc(it.name)}</td><td class=m>${esc(it.address)}</td><td class=m>${esc(it.phone)}</td><td class=m>${esc(it.email)}</td></tr>`;
 }).join('');}
async function loadState(){const s=await (await fetch('/api/state')).json();
 const T=[['g','Supply',s.supply.sourced+' <small>sourced</small>',s.supply.icp+' ICP · '+s.supply.signed+' signed'],
  [s.trust.testimonials?'g':'r','Trust',s.trust.testimonials+' <small>testimonials</small>',s.trust.testimonials?'':'none yet'],
  ['r','Demand',s.demand.bookings+' <small>bookings</small>','no bookings yet']];
 tiles.innerHTML=T.map(t=>`<div class="tile ${t[0]}"><div class=k>${t[1]}</div><div class=v>${t[2]}</div><div class=d>${t[3]}</div></div>`).join('');}
async function loadSources(){const ss=await (await fetch('/api/sources')).json();const sel=document.getElementById('source');
 if(!SRCLOADED){sel.innerHTML=ss.map(s=>`<option value="${s.id}" ${s.disabled?'disabled':''}>${s.label}${s.kind==='csv'?` — ${s.sent}/${s.count}`:''}</option>`).join('');
  const first=ss.find(s=>!s.disabled);if(first){SRC=first.id;sel.value=first.id;}SRCLOADED=true;}}
function pickSrc(){SRC=document.getElementById('source').value;NODES=[];loadCampaign();}
async function loadCampaign(){if(!SRC)return;const c=await (await fetch('/api/campaign?src='+encodeURIComponent(SRC))).json();
 cSent.textContent=c.sent;cPend.textContent=c.pending;cFail.textContent=c.failed;cTot.textContent=c.total;
 gSent.textContent=c.sent;gFail.textContent=c.failed;gPend.textContent=c.pending;gBig.textContent=c.sent;
 progf.style.width=(c.total?c.sent/c.total*100:0)+'%';progtxt.textContent=c.sent+' / '+c.total+' delivered';
 const paused=c.control==='pause';
 livewrap.innerHTML=c.active?(paused?'<span class="live pz"><span class=d></span>paused</span>':'<span class="live on"><span class=d></span>sending</span>'):'';
 bSend.disabled=c.active||c.pending===0;bSend.textContent=c.pending?('▶ Send '+c.pending+' pending'):'✓ All sent';
 bPause.disabled=!(c.active&&!paused);bPause.textContent=paused?'❚❚ Paused':'❚❚ Pause';
 bStop.disabled=!c.active;
 if(paused){bPause.disabled=false;bPause.textContent='▶ Resume';bPause.onclick=()=>doCtrl('resume');}else{bPause.onclick=()=>doCtrl('pause');}
 applyChannel();
 if(NODES.length!==c.recipients.length){const n=c.recipients.length;NODES=c.recipients.map((r,i)=>{const y=1-(i/((n-1)||1))*2,rad=Math.sqrt(Math.max(0,1-y*y)),th=i*2.399963;return{...r,x:Math.cos(th)*rad,y:y,z:Math.sin(th)*rad};});}
 else NODES.forEach((nd,i)=>nd.status=c.recipients[i].status);}
async function doSend(){if(CHAN!=='email'){alert('IG DM and Social are draft/export only — no auto-send.');return;}
 const c=await (await fetch('/api/campaign?src='+encodeURIComponent(SRC))).json();
 if(!confirm('Send '+c.pending+' real cold emails from info@zingaapp.com? Rate-limited ~75s. You can Pause/Stop anytime.'))return;
 const r=await (await fetch('/api/send-batch',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({src:SRC})})).json();
 if(r.error)alert(r.error);loadCampaign();}
async function doCtrl(a){await fetch('/api/control',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:a})});loadCampaign();}
async function loadRev(){const r=await (await fetch('/api/sent')).json();rcount.textContent='· '+r.length;
 rev.innerHTML=r.slice(0,60).map(x=>`<tr><td class=m>${x.date}</td><td class=m>${x.to}</td><td>${(x.subject||'').replace(/</g,'&lt;')}</td><td><span class="pill ${x.status==='failed'?'failed':'sent'}">${x.status}</span></td></tr>`).join('')||'<tr><td colspan=4 style="color:var(--ink3)">no sends yet</td></tr>';}
async function loadLogs(){const l=await (await fetch('/api/logs')).json();
 audit.innerHTML=(l.audit||[]).map(x=>{const c=x.includes('BLOCKED')?'var(--red)':x.includes('APPROVED')?'var(--green)':'var(--ink2)';return `<div style="color:${c}">${x.replace(/</g,'&lt;').slice(0,120)}</div>`;}).join('')||'<div style="color:var(--ink3)">no send attempts yet</div>';
 runs.innerHTML=(l.runs||[]).map(x=>`<div>▪ ${x}</div>`).join('');}
const cv=document.getElementById('globe'),cx=cv.getContext('2d');
function draw(){const dpr=Math.min(2,devicePixelRatio||1),W=cv.clientWidth,H=cv.clientHeight;
 if(cv.width!==W*dpr){cv.width=W*dpr;cv.height=H*dpr;cx.setTransform(dpr,0,0,dpr,0,0);}
 cx.clearRect(0,0,W,H);const cxp=W/2,cyp=H/2,R=Math.min(W,H)*0.38;rot+=0.004;
 const pts=NODES.map(n=>{const x=n.x*Math.cos(rot)-n.z*Math.sin(rot),z=n.x*Math.sin(rot)+n.z*Math.cos(rot);return{px:cxp+x*R,py:cyp+n.y*R*0.9,z:z,st:n.status};}).sort((a,b)=>a.z-b.z);
 for(const p of pts){const dep=(p.z+1)/2,r=1.5+dep*3.5,a=0.25+dep*0.75;cx.beginPath();cx.arc(p.px,p.py,r,0,6.28);
  cx.fillStyle=p.st==='sent'?`rgba(79,208,138,${a})`:p.st==='failed'?`rgba(224,101,90,${a})`:`rgba(120,130,145,${a*0.6})`;cx.fill();
  if(p.st==='sent'&&dep>0.6){cx.shadowColor='#4FD08A';cx.shadowBlur=8;cx.fill();cx.shadowBlur=0;}}
 requestAnimationFrame(draw);}
// ── Analytics panel ─────────────────────────────────────────────────────────
async function loadAnalytics(){const a=await (await fetch('/api/analytics')).json();
 const T=[
  ['g','Sourced',a.supply.sourced,'providers in pipeline'],
  ['g','ICP pass',a.supply.icp,'qualified'],
  ['g','Signed',a.supply.signed,'on platform'],
  ['a','Sent',a.send.sent,a.send.failed+' failed · '+a.send.pending+' pending'],
  [a.trust.testimonials?'g':'r','Testimonials',a.trust.testimonials,'with permission'],
  ['r','Bookings',a.demand.bookings,'demand side'],
  ['g','Google leads',a.scrape.google,'scraped rows'],
  ['g','IG leads',a.scrape.ig,'scraped rows'],
  ['g','TikTok leads',a.scrape.tiktok,'scraped rows']];
 antiles.innerHTML=T.map(t=>`<div class="tile ${t[0]}"><div class=k>${t[1]}</div><div class=v>${t[2]}</div><div class=d>${t[3]}</div></div>`).join('');
 const F=[['Sourced',a.supply.sourced],['ICP',a.supply.icp],
   ['Contacted',a.send.sent+a.send.pending],['Sent',a.send.sent]];
 const max=Math.max(1,...F.map(f=>f[1]));
 funnel.innerHTML=F.map(f=>`<div class=frow><div class=fl>${f[0]}</div><div class=fbar><span style="width:${f[1]?Math.max(f[1]/max*100,8):0}%">${f[1]}</span></div></div>`).join('');}
// ── Sidebar tab navigation ──────────────────────────────────────────────────
function showTab(name){
 document.querySelectorAll('.navtab').forEach(t=>t.classList.toggle('on',t.dataset.tab===name));
 document.querySelectorAll('.panel').forEach(p=>p.classList.toggle('on',p.id==='panel-'+name));
 if(name==='analytics')loadAnalytics();}
document.querySelectorAll('.navtab').forEach(t=>{if(t.classList.contains('dim'))return;
 t.onclick=()=>showTab(t.dataset.tab);});
async function tick(){await loadSources();loadState();loadCampaign();loadRev();loadLogs();
 if(document.getElementById('panel-analytics').classList.contains('on'))loadAnalytics();}
document.querySelector('#spills .pill-r[data-src=google]').classList.add('on');
document.querySelector('#chan .c[data-ch=email]').classList.add('on');
tick();setInterval(tick,4000);draw();
</script></body></html>"""

class H(BaseHTTPRequestHandler):
    def _s(self, code, body, ctype="application/json"):
        b = body.encode() if isinstance(body, str) else body
        self.send_response(code); self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(b))); self.end_headers(); self.wfile.write(b)
    def log_message(self, *a): pass
    def _body(self):
        try:
            n = int(self.headers.get("Content-Length", 0)); return json.loads(self.rfile.read(n) or b"{}")
        except Exception: return {}
    def do_GET(self):
        from urllib.parse import urlparse, parse_qs
        u = urlparse(self.path)
        if u.path == "/": return self._s(200, PAGE, "text/html; charset=utf-8")
        if u.path == "/api/state": return self._s(200, json.dumps(state()))
        if u.path == "/api/sources": return self._s(200, json.dumps(sources()))
        if u.path == "/api/campaign":
            src = (parse_qs(u.query).get("src") or [None])[0]
            return self._s(200, json.dumps(campaign(src)))
        if u.path == "/api/sent": return self._s(200, json.dumps(sent_review()))
        if u.path == "/api/logs": return self._s(200, json.dumps(logs()))
        if u.path == "/api/analytics": return self._s(200, json.dumps(analytics()))
        if u.path == "/api/scrape/status":
            rid = (parse_qs(u.query).get("runId") or [None])[0]
            return self._s(200, json.dumps(apify_status(rid)))
        if u.path == "/api/scrape/results":
            q = parse_qs(u.query)
            ds = (q.get("dataset") or [None])[0]
            sr = (q.get("source") or [None])[0]
            return self._s(200, json.dumps(apify_items(ds, sr)))
        self._s(404, "{}")
    def do_POST(self):
        if self.path == "/api/send-batch":
            return self._s(200, json.dumps(launch_send(self._body().get("src"))))
        if self.path == "/api/control":
            return self._s(200, json.dumps(set_control(self._body().get("action"))))
        if self.path == "/api/scrape/start":
            b = self._body()
            return self._s(200, json.dumps(apify_start(b.get("source"), b.get("query"), b.get("number"))))
        self._s(404, "{}")

def state():
    prov = [r for r in rowsf(ROOT / "data/providers.csv") if r.get("id") and r["id"] != "TEST-SMOKE"]
    icp = [r for r in prov if "ICP-pass" in (r.get("notes") or "")]
    td = ROOT / "data/testimonials"
    return {"supply": {"sourced": len(prov), "icp": len(icp),
                       "signed": sum(1 for r in prov if r.get("stage") in ("signed", "listed"))},
            "trust": {"testimonials": len(list(td.glob("*.md"))) if td.exists() else 0},
            "demand": {"bookings": 0}}

def analytics():
    st = state()
    c = campaign()  # default campaign: send stats (sent/failed/pending)
    scrape = {}
    for s in ("google", "ig", "tiktok"):
        n = 0
        for f in (ROOT / "runs").glob(f"*-{s}-leads.csv"):
            n += len(rowsf(f))  # data rows (header excluded by DictReader)
        scrape[s] = n
    return {"supply": st["supply"], "trust": st["trust"], "demand": st["demand"],
            "send": {"sent": c["sent"], "failed": c["failed"],
                     "pending": c["pending"], "total": c["total"]},
            "scrape": scrape}

if __name__ == "__main__":
    print(f"Zinga OS Operator → http://127.0.0.1:{PORT}  (local only, Ctrl-C to stop)")
    ThreadingHTTPServer(("127.0.0.1", PORT), H).serve_forever()
