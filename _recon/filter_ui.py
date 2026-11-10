import re, pathlib, collections

S = pathlib.Path(r"D:\lumaboth\_recon\strings")
files = sorted(S.glob("classes*.dex.ascii.txt"))

# Heuristic candidate extraction of user-facing strings
bad_prefixes = (
    "L", "com.", "android.", "androidx.", "kotlin", "java.", "io.", "org.",
    "co.lumasoft", "res/", "assets/", "META-INF", "http", "https",
    "kotlinx", "kotlin/", "google", "firebase", "okhttp", "retrofit",
    "hilt", "dagger", "coil", "easylauncher", "composable", "Lkotlin",
)
bad_sub = (
    "Ljava", "Lco/", "Landroid", "Lcom/", "Lkotlin", "()", "->",
    "Exception", "$", "\\u", "%1$", "%s", "%d", "SHA-", "utf-8",
    ".kt", ".java", ".xml", ".json", ".png", ".jpg", ".webp", ".ttf",
    "R$", "androidx.", "com.google",
)

cand = []
for f in files:
    for line in f.read_text(encoding="utf-8", errors="ignore").splitlines():
        s = line.strip()
        if not (3 <= len(s) <= 90):
            continue
        if any(s.startswith(p) for p in bad_prefixes):
            continue
        if any(b in s for b in bad_sub):
            continue
        if not re.search(r"[A-Za-z]", s):
            continue
        # needs a space (phrase) OR Title Case single word
        if " " in s:
            cand.append(s)
        elif re.fullmatch(r"[A-Z][A-Za-z0-9&+'/-]{2,25}", s):
            cand.append(s)

# de-dup
cand = list(dict.fromkeys(cand))
print("TOTAL", len(cand))

groups = {
    "events": ["event", "booth", "session"],
    "capture": ["photo", "camera", "capture", "shot", "pose", "countdown", "flash", "zoom", "lens", "mirror"],
    "video": ["video", "boomerang", "gif", "slow", "motion", "record", "clip", "replay"],
    "ai": ["ai ", "portrait", "virtual attendant", "green screen", "background", "remove"],
    "design": ["template", "layout", "theme", "sticker", "overlay", "frame", "font", "color", "colour", "style", "brand"],
    "print": ["print", "printer", "paper", "layout"],
    "share": ["share", "whatsapp", "email", "sms", "qr", "link", "instagram", "facebook", "gallery", "album", "download", "upload"],
    "account": ["login", "log in", "sign in", "sign up", "register", "account", "password", "email address", "subscription", "plan", "billing", "trial", "license", "logout", "log out"],
    "settings": ["setting", "wifi", "network", "language", "permission", "privacy", "terms", "about", "support", "update", "notification", "sound"],
    "nav": ["start", "next", "back", "continue", "skip", "done", "cancel", "save", "delete", "edit", "create", "add", "remove", "select", "choose", "finish", "retry", "loading"],
    "survey": ["survey", "question", "rating", "feedback"],
    "error": ["error", "failed", "unable", "cannot", "invalid", "expired", "try again"],
}

def show(name, keys):
    print(f"\n===== {name} =====")
    seen = set()
    for s in cand:
        low = s.lower()
        if any(k in low for k in keys) and s not in seen:
            seen.add(s)
            print(s)

for n, k in groups.items():
    show(n, k)
