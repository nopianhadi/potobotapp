from androguard.core.apk import APK
from androguard.core.axml import ARSCParser
import re, pathlib

p = r"D:\lumaboth\_recon\xapk\co.lumasoft.lumabooth.apk"
a = APK(p)
print("PACKAGE:", a.get_package())
print("APP NAME:", a.get_app_name())
print("VERSION:", a.get_androidversion_name(), a.get_androidversion_code())
print("MIN/MAX SDK:", a.get_min_sdk_version(), a.get_target_sdk_version())
print("ACTIVITIES:", a.get_activities())
print("SERVICES:", a.get_services())
print("RECEIVERS:", a.get_receivers())
print("PROVIDERS:", a.get_providers())
print("MAIN ACTIVITY:", a.get_main_activity())
print("PERMISSIONS:", a.get_permissions())
print("FEATURES:", a.get_features())

xml = a.get_android_manifest_xml()
pathlib.Path(r"D:\lumaboth\_recon\AndroidManifest.pretty.xml").write_text(
    xml.toprettyxml() if hasattr(xml, "toprettyxml") else str(xml), encoding="utf-8"
)

print("\n=== STRINGS (app namespace) ===")
res = a.get_android_resources()
if res:
    for locale in res.get_locales():
        try:
            strings = res.get_string_resources(locale)
        except Exception as e:
            continue
        if not strings:
            continue
        # only print base/likely app strings
        vals = sorted(set(str(v) for v in strings.values() if v))
        with open(rf"D:\lumaboth\_recon\strings_res_{locale.replace('-','_')}.txt", "w", encoding="utf-8") as f:
            f.write("\n".join(vals))
        print(f"locale {locale}: {len(vals)} strings -> file")

print("\n=== COLORS (base) ===")
try:
    colors = res.get_color_resources("")
    for k, v in list(colors.items())[:200]:
        print(k, v)
except Exception as e:
    print("colors err", e)
