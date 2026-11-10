import re, pathlib
p = pathlib.Path(r"D:\lumaboth\_recon\config_en\resources.arsc")
data = p.read_bytes()
ascii_re = re.compile(rb"[\x20-\x7e]{3,}")
utf16_re = re.compile(rb"(?:[\x20-\x7e]\x00){3,}")
out = pathlib.Path(r"D:\lumaboth\_recon\strings\config_en.ascii.txt")
vals = []
for m in ascii_re.findall(data):
    try:
        vals.append(m.decode("latin-1"))
    except Exception:
        pass
uniq = list(dict.fromkeys(vals))
out.write_text("\n".join(uniq), encoding="utf-8")
print(len(uniq))
for v in uniq:
    if any(c.isalpha() for c in v) and ' ' in v.strip() and len(v) > 8:
        print(v[:160])
