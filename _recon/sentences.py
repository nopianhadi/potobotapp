import re, pathlib

S = pathlib.Path(r"D:\lumaboth\_recon\strings")
cands = []
for f in sorted(S.glob("classes*.dex.ascii.txt")):
    for line in f.read_text(encoding="utf-8", errors="ignore").splitlines():
        s = line.strip()
        if not (8 <= len(s) <= 80):
            continue
        if re.search(r"[=:{}\[\]<>|\\@#$%^*_`~]", s):
            continue
        if re.search(r"\.(kt|java|xml|json|png|jpg|jpeg|webp|ttf|css|js|html|mp4|gif|db|so|dex)\b", s, re.I):
            continue
        if not re.match(r"[A-Z]", s):
            continue
        words = s.split()
        if len(words) < 2:
            continue
        alpha = sum(c.isalpha() or c.isspace() for c in s)
        if alpha / len(s) < 0.85:
            continue
        if any(w.lower() in ("lcom", "lkotlin", "landroid", "ljava", "lco") for w in words):
            continue
        cands.append(s)

cands = list(dict.fromkeys(cands))
out = pathlib.Path(r"D:\lumaboth\_recon\sentences.txt")
out.write_text("\n".join(cands), encoding="utf-8")
print("TOTAL", len(cands))

kw = [
    "event", "booth", "session", "photo", "print", "share", "gallery", "album",
    "layout", "template", "theme", "sticker", "frame", "filter", "ai", "portrait",
    "green", "virtual", "welcome", "start screen", "countdown", "camera", "record",
    "video", "boomerang", "qr", "email", "sms", "whatsapp", "subscription", "plan",
    "login", "sign", "account", "password", "connect", "wifi", "network", "survey",
    "question", "printer", "paper", "slideshow", "cast", "chromecast", "lock", "pin",
]
for group in kw:
    hits = [c for c in cands if re.search(r"\b" + re.escape(group) + r"\b", c, re.I)]
    print(f"\n### {group.upper()} ({len(hits)})")
    for h in hits[:80]:
        print(h)
