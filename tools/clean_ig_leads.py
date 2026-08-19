#!/usr/bin/env python3
"""Clean an Apify instagram-scraper raw dump into US-only leads.csv.

US-ONLY filter: keep a lead only if its bio shows a positive US signal; drop
everything else. We source US geographies only, so international detection is
unnecessary — a non-US lead simply won't carry a US signal and is dropped.
(The old international-signal machinery is commented out below for reference.)
"""
import csv
import json
import os
import re
import sys

# Positive US signals
US_STATES = {
    "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
    "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
    "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
    "VA","WA","WV","WI","WY","DC",
}
US_STATE_NAMES = [
    "new york","brooklyn","manhattan","queens","bronx","nyc","new york city",
    "los angeles","california","texas","florida","chicago","boston","atlanta",
    "miami","seattle","denver","houston","dallas","philadelphia","phoenix",
    "san francisco","washington","new jersey","connecticut","pennsylvania",
]
US_PHONE = re.compile(r"\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}")

# --- International/foreign detection: not needed (US-only sourcing). Kept for reference. ---
# INTL_SIGNALS = [
#     "london","uk","united kingdom","toronto","canada","dubai","uae","seoul",
#     "korea","lagos","nigeria","sydney","australia","mumbai","india","paris",
#     "france","tokyo","japan","berlin","germany","madrid","spain","milan",
#     "italy","dublin","ireland","amsterdam","singapore","hong kong","manila",
# ]
# INTL_PHONE = re.compile(r"\+(?:44|971|82|91|61|33|49|34|39|63|65|81|234|353)")
# NON_US_FLAGS = ["\U0001F1EC\U0001F1E7","\U0001F1E8\U0001F1E6","\U0001F1F0\U0001F1F7",
#                 "\U0001F1F3\U0001F1EC","\U0001F1E6\U0001F1FA","\U0001F1EB\U0001F1F7"]


def us_verdict(bio):
    """US-only: keep if the bio carries a positive US signal, else drop."""
    b = (bio or "").lower()
    pos = (
        any(s in b for s in US_STATE_NAMES)
        or ("usa" in b) or ("\U0001F1FA\U0001F1F8" in (bio or ""))
        or bool(US_PHONE.search(bio or ""))
        or any(re.search(rf"\b{code}\b", (bio or "")) for code in US_STATES)
    )
    return "keep" if pos else "drop"


def main(raw_path, out_path):
    with open(raw_path) as f:
        records = json.load(f)

    kept, dropped = [], 0
    for r in records:
        if not isinstance(r, dict):
            dropped += 1
            continue
        user = r.get("username")
        if not isinstance(user, str) or not user.strip():
            dropped += 1
            continue
        bio = r.get("biography", "") or ""
        url = r.get("instagramUrl") or r.get("url") or f"https://instagram.com/{user}"
        if us_verdict(bio) != "keep":
            dropped += 1
            continue
        kept.append({"username": user.strip(), "instagram_url": url,
                     "biography": bio.replace("\n", " ").strip()})

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["username", "instagram_url", "biography"])
        for k in kept:
            w.writerow([k["username"], k["instagram_url"], k["biography"]])

    print(f"scraped_records={len(records)} kept={len(kept)} dropped={dropped}")
    # emit kept rows for downstream review generation
    print(json.dumps(kept))


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
