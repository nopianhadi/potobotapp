import re, sys, pathlib, json

ROOT = pathlib.Path(r"D:\lumaboth\_recon\apk")
OUT = pathlib.Path(r"D:\lumaboth\_recon\strings")
OUT.mkdir(parents=True, exist_ok=True)

ASCII_RE = re.compile(rb"[\x20-\x7e]{4,}")
UTF16_RE = re.compile(rb"(?:[\x20-\x7e]\x00){4,}")

def extract(path: pathlib.Path):
    data = path.read_bytes()
    ascii_s = [m.decode("latin-1") for m in ASCII_RE.findall(data)]
    utf16_s = []
    for m in UTF16_RE.findall(data):
        try:
            utf16_s.append(m.decode("utf-16-le"))
        except Exception:
            pass
    return ascii_s, utf16_s

targets = []
targets += sorted(ROOT.glob("classes*.dex"))
targets += [ROOT / "resources.arsc", ROOT / "AndroidManifest.xml"]
targets += sorted(ROOT.glob("res/raw/*")) if (ROOT / "res/raw").exists() else []

for p in targets:
    if not p.exists():
        continue
    a, u = extract(p)
    outp = OUT / (p.name + ".ascii.txt")
    outp.write_text("\n".join(dict.fromkeys(a)), encoding="utf-8", errors="ignore")
    outp2 = OUT / (p.name + ".utf16.txt")
    outp2.write_text("\n".join(dict.fromkeys(u)), encoding="utf-8", errors="ignore")
    print(f"{p.name}: {len(a)} ascii / {len(u)} utf16")

# Combined manifest strings
m = ROOT / "AndroidManifest.xml"
if m.exists():
    a, u = extract(m)
    print("\n--- MANIFEST ASCII (first 200) ---")
    for s in dict.fromkeys(a):
        if any(k in s.lower() for k in ["activity", "service", "receiver", "provider", "luma", "booth", "permission", "intent"]):
            print(s[:200])
    print("\n--- MANIFEST UTF16 (first 200) ---")
    for s in list(dict.fromkeys(u))[:200]:
        print(s[:200])
