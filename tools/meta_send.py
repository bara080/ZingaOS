#!/usr/bin/env python3
"""Instagram DM smoke test via the Instagram API with Instagram Login (stdlib only).

@zingaapp is a STANDALONE Instagram business account (not linked to a Facebook
Page), so the old Messenger-API-for-Instagram path (graph.facebook.com → Page →
instagram_business_account) returns (#3) capability errors. The correct path is
the **Instagram API with Instagram Login**:
  - base:   https://graph.instagram.com/{version}
  - token:  an Instagram User access token (NOT the Facebook user token)
  - perms:  instagram_business_basic + instagram_business_manage_messages
  - convos: GET  /me/conversations?platform=instagram&fields=participants,updated_time,messages{message,from}
  - send:   POST /me/messages  {recipient:{id:IGSID}, message:{text}}

Reads META_* from .env (LAST occurrence of each key wins, so a fresh token
line appended below a stale one is the one used). Never hardcodes a token. It
prefers META_IG_ACCESS_TOKEN (the Instagram User token); if that is unset it
falls back to META_ACCESS_TOKEN and prints a warning.

Subcommands:
  --conversations
      List open Instagram conversations for the @zingaapp business account.
      For each thread it prints the other party's IGSID (the participant id
      that is NOT our own META_IG_USER_ID) plus the latest message snippet.
      Use this to discover the IGSID you want to reply to.

  --to <IGSID> --text "..."
      Send a DM to <IGSID>. Prints the message id on success. On an HTTP
      error it prints the full Meta error JSON — those errors (e.g. #10
      "outside 24h window", #200 permissions, "user not found") are the
      whole point of a smoke test, so they are surfaced verbatim.

Examples:
    python3 tools/meta_send.py --conversations
    python3 tools/meta_send.py --to 17841400000000000 --text "Hey! Test 👋"

Nothing sends on import. Exits non-zero on any failure.
"""
import json
import sys
import urllib.request
import urllib.error
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ENV = ROOT / ".env"


def load_env():
    """Parse .env into a dict. LAST occurrence of a key wins."""
    vals = {}
    if ENV.exists():
        for line in ENV.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("=")
                vals[k.strip()] = v.strip().strip('"').strip("'")
    return vals


def _err_exit(msg):
    print(msg, file=sys.stderr)
    sys.exit(1)


def api_get(url):
    try:
        with urllib.request.urlopen(url, timeout=30) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        try:
            detail = json.dumps(json.loads(body), indent=2)
        except Exception:
            detail = body
        _err_exit(f"HTTP {e.code} from Meta:\n{detail}")
    except urllib.error.URLError as e:
        _err_exit(f"Network error: {e}")


def api_post(url, payload):
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        url, data=data, headers={"Content-Type": "application/json"}, method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        try:
            detail = json.dumps(json.loads(body), indent=2)
        except Exception:
            detail = body
        _err_exit(f"HTTP {e.code} from Meta:\n{detail}")
    except urllib.error.URLError as e:
        _err_exit(f"Network error: {e}")


def cmd_conversations(base, ig_user_id, tok):
    fields = "participants,updated_time,messages{message,from}"
    url = (
        f"{base}/me/conversations"
        f"?platform=instagram&fields={fields}&access_token={tok}"
    )
    resp = api_get(url)
    convos = resp.get("data", [])
    if not convos:
        print("No Instagram conversations found.")
        print(
            "A tester must DM @zingaapp first to open a 24h window and register "
            "their IGSID."
        )
        return
    print(f"{len(convos)} conversation(s):\n")
    for c in convos:
        participants = (c.get("participants") or {}).get("data", [])
        # The participant whose id is NOT ours is the person's IGSID.
        others = [p for p in participants if str(p.get("id")) != str(ig_user_id)]
        their_ids = ", ".join(
            f"{p.get('id')}"
            + (f" (@{p.get('username')})" if p.get("username") else "")
            for p in others
        ) or "(unknown)"

        # Latest message snippet.
        msgs = (c.get("messages") or {}).get("data", [])
        snippet = ""
        if msgs:
            top = msgs[0]
            frm = (top.get("from") or {}).get("id", "?")
            who = "us" if str(frm) == str(ig_user_id) else "them"
            text = (top.get("message") or "").replace("\n", " ")
            if len(text) > 80:
                text = text[:77] + "..."
            snippet = f'[{who}] "{text}"'

        print(f"  IGSID: {their_ids}")
        print(f"    updated: {c.get('updated_time', '?')}")
        if snippet:
            print(f"    latest : {snippet}")
        print()
    print("Copy an IGSID above and reply with:")
    print('  python3 tools/meta_send.py --to <IGSID> --text "..."')


def cmd_send(base, ig_user_id, tok, igsid, text):
    # /me/messages resolves to our own IG user from the token; no id needed.
    url = f"{base}/me/messages?access_token={tok}"
    payload = {"recipient": {"id": igsid}, "message": {"text": text}}
    resp = api_post(url, payload)
    mid = resp.get("message_id")
    if mid:
        print(f"sent — message_id={mid}  recipient_id={resp.get('recipient_id', igsid)}")
    else:
        # Unexpected shape but no HTTP error; show what we got.
        print("Sent (no message_id in response):")
        print(json.dumps(resp, indent=2))


def parse_args(argv):
    args = {"mode": None, "to": None, "text": None}
    i = 0
    while i < len(argv):
        a = argv[i]
        if a == "--conversations":
            args["mode"] = "conversations"
        elif a == "--to":
            args["mode"] = "send"
            i += 1
            if i >= len(argv):
                _err_exit("--to requires an IGSID")
            args["to"] = argv[i]
        elif a == "--text":
            i += 1
            if i >= len(argv):
                _err_exit("--text requires a value")
            args["text"] = argv[i]
        elif a in ("-h", "--help"):
            print(__doc__)
            sys.exit(0)
        else:
            _err_exit(f"Unknown argument: {a}\n\n{__doc__}")
        i += 1
    return args


def main():
    args = parse_args(sys.argv[1:])
    if not args["mode"]:
        print(__doc__)
        sys.exit(2)

    env = load_env()
    # Prefer the Instagram User token; fall back to META_ACCESS_TOKEN with a warning.
    tok = env.get("META_IG_ACCESS_TOKEN", "")
    if not tok:
        tok = env.get("META_ACCESS_TOKEN", "")
        if tok:
            print(
                "WARNING: META_IG_ACCESS_TOKEN not set — falling back to "
                "META_ACCESS_TOKEN. The Instagram Login API needs an Instagram "
                "User token; a Facebook user/Page token will fail here.",
                file=sys.stderr,
            )
    ver = env.get("META_GRAPH_VERSION", "v21.0")
    # Optional now: only used to label which participant is "us" in --conversations.
    ig_user_id = env.get("META_IG_USER_ID", "")
    if not tok:
        _err_exit(
            "No token found: set META_IG_ACCESS_TOKEN (preferred) or "
            "META_ACCESS_TOKEN in .env"
        )
    base = f"https://graph.instagram.com/{ver}"

    if args["mode"] == "conversations":
        cmd_conversations(base, ig_user_id, tok)
    elif args["mode"] == "send":
        if not args["to"]:
            _err_exit("--to <IGSID> is required")
        if args["text"] is None:
            _err_exit('--text "..." is required when sending')
        cmd_send(base, ig_user_id, tok, args["to"], args["text"])


if __name__ == "__main__":
    main()
