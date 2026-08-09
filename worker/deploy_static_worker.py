"""Deploy the public static site to the Cloudflare origin Worker.

This uses Cloudflare's Workers Static Assets direct-upload API, so no Node.js
or Wrangler installation is needed.  It deliberately stages only committed
site files: unrelated local edits are never published by accident.
"""

from __future__ import annotations

import base64
import hashlib
import json
import mimetypes
import os
import subprocess
from pathlib import Path

import requests


ROOT = Path(__file__).resolve().parents[1]
LOCAL_CREDENTIALS = ROOT / ".cloudflare-deploy.env"
ACCOUNT_ID = "9242649f2d6bdcc4290e2b5ff3f3e320"
WORKER = "dingwei-realty-site"
API = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}"
ENTRY = """export default {
  fetch(request, env) {
    return env.ASSETS.fetch(request);
  },
};
"""


def local_setting(name: str) -> str | None:
    if value := os.environ.get(name):
        return value
    if LOCAL_CREDENTIALS.exists():
        for line in LOCAL_CREDENTIALS.read_text(encoding="utf-8").splitlines():
            if line.startswith(f"{name}="):
                return line.split("=", 1)[1].strip()
    return None


def committed_bytes(path: Path) -> bytes:
    """Use HEAD for changed files, preserving someone else's local work."""
    relative = path.relative_to(ROOT).as_posix()
    changed = subprocess.run(
        ["git", "diff", "--quiet", "--", relative], cwd=ROOT, check=False
    ).returncode != 0
    if not changed:
        return path.read_bytes()
    result = subprocess.run(
        ["git", "show", f"HEAD:{relative}"], cwd=ROOT, capture_output=True, check=True
    )
    return result.stdout


def site_files() -> dict[str, tuple[bytes, str]]:
    files: dict[str, tuple[bytes, str]] = {}
    for path in sorted(ROOT.glob("*.html")):
        files["/" + path.name] = (committed_bytes(path), "text/html; charset=utf-8")
    for path in sorted((ROOT / "assets").rglob("*")):
        if not path.is_file():
            continue
        web_path = "/" + path.relative_to(ROOT).as_posix()
        mime = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
        files[web_path] = (committed_bytes(path), mime)
    return files


def response_json(response: requests.Response) -> dict:
    try:
        body = response.json()
    except ValueError as error:
        raise RuntimeError(f"Cloudflare returned invalid JSON ({response.status_code})") from error
    if not response.ok or not body.get("success"):
        detail = body.get("errors") or body
        raise RuntimeError(f"Cloudflare API {response.status_code}: {detail}")
    return body["result"]


def main() -> None:
    token = local_setting("DW_CF_API_TOKEN")
    if not token:
        raise RuntimeError("DW_CF_API_TOKEN is required")
    headers = {"Authorization": f"Bearer {token}"}
    files = site_files()
    manifest = {
        web_path: {"hash": hashlib.md5(content).hexdigest(), "size": len(content)}
        for web_path, (content, _) in files.items()
    }
    session = requests.post(
        f"{API}/workers/scripts/{WORKER}/assets-upload-session",
        headers={**headers, "content-type": "application/json"},
        json={"manifest": manifest},
        timeout=60,
    )
    upload = response_json(session)
    jwt = upload["jwt"]
    completion_jwt = jwt if not upload.get("buckets") else None
    by_hash = {metadata["hash"]: files[web_path] for web_path, metadata in manifest.items()}
    for bucket in upload.get("buckets", []):
        payload = {
            file_hash: (
                None,
                base64.b64encode(by_hash[file_hash][0]).decode("ascii"),
                by_hash[file_hash][1],
            )
            for file_hash in bucket
        }
        result = requests.post(
            f"{API}/workers/assets/upload?base64=true",
            headers={"Authorization": f"Bearer {jwt}"},
            files=payload,
            timeout=120,
        )
        completion_jwt = response_json(result).get("jwt") or completion_jwt
    if not completion_jwt:
        raise RuntimeError("Cloudflare did not provide an asset completion token")
    metadata = {
        "main_module": "entry.js",
        "compatibility_date": "2026-08-09",
        "assets": {"jwt": completion_jwt, "config": {"html_handling": "auto-trailing-slash"}},
    }
    deploy = requests.put(
        f"{API}/workers/scripts/{WORKER}",
        headers=headers,
        files={
            "metadata": (None, json.dumps(metadata), "application/json"),
            "entry.js": ("entry.js", ENTRY, "application/javascript+module"),
        },
        timeout=120,
    )
    response_json(deploy)
    print(f"Deployed {len(files)} static files to {WORKER}.")


if __name__ == "__main__":
    main()
