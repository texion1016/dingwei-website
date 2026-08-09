"""Deploy the Cloudflare gateway that protects the Dingwei admin pages.

All credentials are provided only through process environment variables so they
never enter Git or the browser-delivered website.
"""
import json
import os
import pathlib
import sys

import requests

ACCOUNT_ID = "9242649f2d6bdcc4290e2b5ff3f3e320"
WORKER = "dingwei-realty-gateway"
ROOT = pathlib.Path(__file__).resolve().parent
ENTRY = ROOT / "gateway.js"
LOCAL_CREDENTIALS = ROOT.parent / ".cloudflare-deploy.env"


def fail(response):
    try:
        detail = response.json()
    except ValueError:
        detail = response.text
    raise RuntimeError(f"Cloudflare API {response.status_code}: {detail}")


def deployment_token():
    """Prefer a CI environment variable, then use the ignored local vault."""
    token = os.environ.get("DW_CF_API_TOKEN")
    if token:
        return token
    if LOCAL_CREDENTIALS.exists():
        for line in LOCAL_CREDENTIALS.read_text(encoding="utf-8").splitlines():
            if line.startswith("DW_CF_API_TOKEN="):
                return line.split("=", 1)[1].strip()
    return None


def main():
    token = deployment_token()
    secrets = {
        "ADMIN_USERNAME": os.environ.get("DW_ADMIN_USERNAME"),
        "ADMIN_PASSWORD": os.environ.get("DW_ADMIN_PASSWORD"),
        "SESSION_SECRET": os.environ.get("DW_SESSION_SECRET"),
    }
    if not token:
        raise RuntimeError("A deployment token is required")
    supplied_secrets = {name: value for name, value in secrets.items() if value}
    if supplied_secrets and len(supplied_secrets) != len(secrets):
        raise RuntimeError("Provide all three login secrets together, or leave them unchanged")

    response = requests.put(
        f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/workers/scripts/{WORKER}",
        headers={"Authorization": f"Bearer {token}"},
        files={
            "metadata": (
                None,
                json.dumps({
                    "main_module": "gateway.js",
                    "compatibility_date": "2026-08-09",
                    "bindings": [{"type": "service", "name": "ORIGIN", "service": "dingwei-realty-site"}],
                }),
                "application/json",
            ),
            "gateway.js": ("gateway.js", ENTRY.read_bytes(), "application/javascript+module"),
        },
        timeout=90,
    )
    if not response.ok:
        fail(response)

    secret_url = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/workers/scripts/{WORKER}/secrets"
    for name, value in supplied_secrets.items():
        response = requests.put(
            secret_url,
            headers={"Authorization": f"Bearer {token}"},
            json={"type": "secret_text", "name": name, "text": value},
            timeout=30,
        )
        if not response.ok:
            fail(response)
    print("Cloudflare login gateway deployed.")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(str(exc), file=sys.stderr)
        sys.exit(1)
