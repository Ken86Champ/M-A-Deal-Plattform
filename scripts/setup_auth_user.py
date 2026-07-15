"""
Supabase Auth User anlegen — einmalig beim Setup ausführen.

Usage:
    cd services/pipeline
    python ../../scripts/setup_auth_user.py
"""
import os
import sys
import getpass
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../.env.local"))

url     = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
svc_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

if not url or not svc_key:
    print("ERROR: NEXT_PUBLIC_SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY fehlen in .env.local")
    sys.exit(1)

from supabase import create_client
admin = create_client(url, svc_key)

email    = input("E-Mail: ").strip() or "10xgroup.swiss@gmail.com"
password = getpass.getpass("Passwort: ")

if len(password) < 8:
    print("ERROR: Passwort muss mindestens 8 Zeichen haben")
    sys.exit(1)

try:
    res = admin.auth.admin.create_user({
        "email":          email,
        "password":       password,
        "email_confirm":  True,
    })
    print(f"\nUser angelegt:")
    print(f"  ID:    {res.user.id}")
    print(f"  Email: {res.user.email}")
    print(f"\nJetzt unter http://localhost:3001/login einloggen.")
except Exception as e:
    if "already been registered" in str(e).lower() or "already exists" in str(e).lower():
        print(f"User {email} existiert bereits — kein erneutes Anlegen nötig.")
    else:
        print(f"ERROR: {e}")
        sys.exit(1)
