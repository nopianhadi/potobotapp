import re, pathlib
S = pathlib.Path(r"D:\lumaboth\_recon\strings")
lines = []
for f in sorted(S.glob("classes*.dex.ascii.txt")):
    lines += f.read_text(encoding="utf-8", errors="ignore").splitlines()

uniq = list(dict.fromkeys(lines))
print("=== LUMABOOTH/FOTOSHARE/LUMASHARE ===")
for s in uniq:
    if re.search(r"lumashare|lumabooth|fotoshare|lumasoft", s, re.I) and len(s) < 220 and not s.startswith(("Lco/", "co.lumasoft.lumashare.")):
        print(s)

print("\n=== PATH-LIKE ===")
for s in uniq:
    t = s.strip()
    if re.fullmatch(r"/[A-Za-z0-9_\-{}$.:/]{1,80}", t) and t.count("/") <= 6 and not t.startswith(("/android", "/system", "/data", "/proc", "/dev", "/vendor", "/apex", "/storage", "/sdcard", "/mnt")):
        print(t)

print("\n=== APP-SPECIFIC CONFIG KEYS (snake/camel) ===")
keys = set()
for s in uniq:
    for m in re.finditer(r"\b([a-z][a-zA-Z0-9]*(?:[A-Z][a-zA-Z0-9]*){1,4})\b", s):
        k = m.group(1)
        if len(k) > 8 and not k.islower():
            keys.add(k)
big = [k for k in keys if re.search(r"(event|booth|capture|print|share|guest|survey|disclaimer|welcome|attendant|portrait|green|layout|template|theme|slide|watermark|album|session|media|upload|printer|email|sms|whatsapp|qr|subscri|login|pin|lock|device|network)", k, re.I)]
print("\n".join(sorted(big)))
