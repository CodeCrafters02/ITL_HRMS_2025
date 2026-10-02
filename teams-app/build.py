"""Build the Teams app package (hrms-teams.zip).

Usage:  python teams-app/build.py [--domain hrms.innovyxtechlabs.com] [--api-domain apihrms.innovyxtechlabs.com]
The client ID is read from backend/.env (MICROSOFT_CLIENT_ID) unless --client-id is given.
"""
import argparse
import json
import re
import zipfile
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
LOGO = ROOT / "free-react-tailwind-admin-dashboard-main/src/assets/logo/hrms-logo.png"


def env_client_id():
    env = (ROOT / "backend/.env").read_text(encoding="utf-8", errors="ignore")
    m = re.search(r'^(?:MICROSOFT|MS|AZURE)_CLIENT_ID\s*=\s*"?([0-9a-fA-F-]{36})', env, re.M)
    return m.group(1) if m else ""


def make_icons(out):
    logo = Image.open(LOGO).convert("RGBA")
    color = Image.new("RGBA", (192, 192), (255, 255, 255, 255))
    fit = logo.copy()
    fit.thumbnail((150, 150))
    color.paste(fit, ((192 - fit.width) // 2, (192 - fit.height) // 2), fit)
    color.save(out / "color.png")

    # Outline: white silhouette on transparent background (Teams requirement).
    small = logo.copy()
    small.thumbnail((28, 28))
    alpha = small.split()[-1].point(lambda a: 255 if a > 100 else 0)
    outline = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
    white = Image.new("RGBA", small.size, (255, 255, 255, 255))
    outline.paste(white, ((32 - small.width) // 2, (32 - small.height) // 2), alpha)
    outline.save(out / "outline.png")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--domain", default="hrms.innovyxtechlabs.com")
    ap.add_argument("--api-domain", default="apihrms.innovyxtechlabs.com")
    ap.add_argument("--client-id", default="")
    a = ap.parse_args()
    client_id = a.client_id or env_client_id()
    if not client_id:
        raise SystemExit("MICROSOFT_CLIENT_ID not found; pass --client-id")

    out = HERE / "build"
    out.mkdir(exist_ok=True)
    manifest = (HERE / "manifest.template.json").read_text(encoding="utf-8")
    manifest = manifest.replace("{{DOMAIN}}", a.domain).replace("{{API_DOMAIN}}", a.api_domain).replace("{{CLIENT_ID}}", client_id)
    json.loads(manifest)  # validate
    (out / "manifest.json").write_text(manifest, encoding="utf-8")
    make_icons(out)

    pkg = HERE / "hrms-teams.zip"
    with zipfile.ZipFile(pkg, "w", zipfile.ZIP_DEFLATED) as z:
        for f in ("manifest.json", "color.png", "outline.png"):
            z.write(out / f, f)
    print(f"Built {pkg}  (domain={a.domain}, api={a.api_domain}, client={client_id})")


if __name__ == "__main__":
    main()
