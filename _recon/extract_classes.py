import re, pathlib, collections

S = pathlib.Path(r"D:\lumaboth\_recon\strings")
classes = set()
for f in sorted(S.glob("classes*.dex.ascii.txt")):
    txt = f.read_text(encoding="utf-8", errors="ignore")
    for m in re.finditer(r"Lco/lumasoft/lumashare/[A-Za-z0-9_$/]+;", txt):
        classes.add(m.group(0))

# package buckets
buckets = collections.Counter()
methods = set()
for c in sorted(classes):
    inner = c[1:-1]
    parts = inner.split("/")
    # find features/<x> or core/<x> or navigation
    if "features" in parts:
        i = parts.index("features")
        if i + 1 < len(parts):
            buckets["features/" + parts[i + 1]] += 1
    elif "navigation" in parts:
        buckets["navigation"] += 1
    elif "core" in parts:
        i = parts.index("core")
        key = "core/" + (parts[i + 1] if i + 1 < len(parts) else "")
        buckets[key] += 1
    else:
        buckets["root"] += 1

print("=== PACKAGE BUCKETS ===")
for k, v in buckets.most_common():
    print(f"{v:4d}  {k}")

print("\n=== CLASSES (unique, no synthetic lambdas) ===")
for c in sorted(classes):
    if "$" in c:
        continue
    print(c)

print("\n=== SCREEN-LIKE CLASSES ===")
for c in sorted(classes):
    if any(k in c for k in ("Screen", "ViewModel", "Repository", "Destination", "NavHost", "ViewModel_")):
        print(c)
