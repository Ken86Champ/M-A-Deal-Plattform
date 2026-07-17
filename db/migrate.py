"""
DB Migration: Fügt contact_email, recipient_email, sender_email, sent_at hinzu.
Lädt Credentials aus ../../apps/web/.env.local
"""
import os
import sys
from pathlib import Path

# Load .env.local
env_file = Path(__file__).parent.parent / "apps" / "web" / ".env.local"
if env_file.exists():
    for line in env_file.read_text().splitlines():
        if '=' in line and not line.startswith('#'):
            k, v = line.split('=', 1)
            os.environ.setdefault(k.strip(), v.strip())

from supabase import create_client

url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("ERROR: Supabase credentials missing")
    sys.exit(1)

sb = create_client(url, key)

# Use raw SQL via Supabase's postgres endpoint
statements = [
    "ALTER TABLE enrichment ADD COLUMN IF NOT EXISTS contact_email text",
    "ALTER TABLE enrichment ADD COLUMN IF NOT EXISTS contact_email_source text",
    "ALTER TABLE outreach ADD COLUMN IF NOT EXISTS recipient_email text",
    "ALTER TABLE outreach ADD COLUMN IF NOT EXISTS sender_email text",
    "ALTER TABLE outreach ADD COLUMN IF NOT EXISTS sent_at timestamptz",
    "COMMENT ON COLUMN enrichment.contact_email IS 'E-Mail aus Impressum-Crawl'",
    "COMMENT ON COLUMN enrichment.contact_email_source IS 'Impressum|Website|Plattform'",
]

success = 0
errors  = 0

for stmt in statements:
    try:
        # Supabase Python client: use rpc or direct postgrest
        result = sb.rpc("execute_sql", {"sql": stmt}).execute()
        print(f"OK: {stmt[:70]}")
        success += 1
    except Exception as e:
        err_msg = str(e)
        if "already exists" in err_msg or "column" in err_msg.lower():
            print(f"SKIP (exists): {stmt[:70]}")
            success += 1
        else:
            print(f"ERR: {stmt[:70]} → {err_msg[:100]}")
            errors += 1

print(f"\nMigration: {success} OK, {errors} Fehler")

# Also try to verify the schema
try:
    # Check if column exists
    result = sb.from_("enrichment").select("contact_email").limit(1).execute()
    print("✓ contact_email column accessible")
except Exception as e:
    print(f"Column not accessible: {e}")
