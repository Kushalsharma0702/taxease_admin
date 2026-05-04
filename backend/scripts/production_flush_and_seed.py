"""
Flush all data in the connected PostgreSQL database (schemas unchanged), then seed:

  • 2 admin_users (dashboard login)
  • 2 client users + filings + t1_forms + t1_answers (client API + admin T1 views)
  • 2 clients rows (id = filing id) so /documents and /payments ORM paths work

Requires DATABASE_URL in the environment (same as tax-hub-dashboard-admin backend .env).

Usage (from backend directory, with venv active):

  python scripts/production_flush_and_seed.py --confirm-flush

Optional dry run (lists tables only, no changes):

  python scripts/production_flush_and_seed.py --dry-run
"""
from __future__ import annotations

import argparse
import asyncio
import os
import sys
import uuid
from pathlib import Path

# Allow `python scripts/production_flush_and_seed.py` from backend/
_BACKEND = Path(__file__).resolve().parents[1]
_SCRIPTS = Path(__file__).resolve().parent
for _p in (_SCRIPTS, _BACKEND):
    if str(_p) not in sys.path:
        sys.path.insert(0, str(_p))

from sqlalchemy import text
from passlib.context import CryptContext

from db_connect import create_script_engine

pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --- Seeded credentials (document for your team) --------------------------------
ADMIN_SUPER_EMAIL = "superadmin@taxease.ca"
ADMIN_SUPER_PASSWORD = "demo123"
ADMIN_REGULAR_EMAIL = "admin@taxease.ca"
ADMIN_REGULAR_PASSWORD = "demo123"

CLIENT_1_EMAIL = "dummy.client1@diamondaccounts.ca"
CLIENT_2_EMAIL = "dummy.client2@diamondaccounts.ca"
CLIENT_PASSWORD = "ClientDemo123!"


def _dotenv_paths() -> list[Path]:
    """Env files to load (later entries override earlier ones)."""
    backend = _BACKEND
    dashboard = backend.parent
    repo = dashboard.parent if dashboard.name == "tax-hub-dashboard-admin" else None
    paths: list[Path] = []
    if repo is not None:
        paths.append(repo / "services" / "client-api" / ".env")
    paths.extend(
        [
            dashboard / ".env",
            dashboard / ".env.local",
            backend / ".env",
            backend / ".env.local",
        ]
    )
    return paths


def _load_database_url() -> str:
    url = os.environ.get("DATABASE_URL")
    if url:
        return url

    from dotenv import load_dotenv

    loaded_from: list[Path] = []
    for path in _dotenv_paths():
        if path.is_file():
            load_dotenv(path, override=True)
            loaded_from.append(path)

    url = os.environ.get("DATABASE_URL")
    if url:
        return url

    tried = "\n".join(f"  - {p}" for p in _dotenv_paths())
    loaded = "\n".join(f"  - {p}" for p in loaded_from) if loaded_from else "  (none of these files exist)"
    raise SystemExit(
        "DATABASE_URL is not set.\n\n"
        "Either export it in the shell:\n"
        "  export DATABASE_URL='postgresql+asyncpg://user:pass@host:5432/dbname'\n\n"
        "Or add DATABASE_URL to one of these files (last match wins):\n" + tried + "\n\n"
        "Files that were loaded:\n" + loaded
    )


async def _list_public_tables(conn) -> list[str]:
    r = await conn.execute(
        text(
            """
            SELECT tablename
            FROM pg_tables
            WHERE schemaname = 'public'
              AND tablename NOT IN ('alembic_version', 'spatial_ref_sys')
            ORDER BY tablename
            """
        )
    )
    return [row[0] for row in r.fetchall()]


async def _table_exists(conn, name: str) -> bool:
    r = await conn.execute(
        text(
            """
            SELECT EXISTS (
              SELECT 1 FROM information_schema.tables
              WHERE table_schema = 'public' AND table_name = :t
            )
            """
        ),
        {"t": name},
    )
    return bool(r.scalar())


async def _columns(conn, table: str) -> set[str]:
    r = await conn.execute(
        text(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = :t
            """
        ),
        {"t": table},
    )
    return {row[0] for row in r.fetchall()}


async def flush_all(conn, tables: list[str]) -> None:
    if not tables:
        return
    quoted = ", ".join(f'"{t}"' for t in tables)
    await conn.execute(text(f"TRUNCATE TABLE {quoted} RESTART IDENTITY CASCADE"))


async def seed(conn) -> dict[str, str]:
    super_id = uuid.uuid4()
    admin_id = uuid.uuid4()
    admins_super_id = uuid.uuid4()   # row in the 'admins' table (FK target for payments)
    u1, u2 = uuid.uuid4(), uuid.uuid4()
    f1, f2 = uuid.uuid4(), uuid.uuid4()
    t1, t2 = uuid.uuid4(), uuid.uuid4()

    h_super = pwd.hash(ADMIN_SUPER_PASSWORD)
    h_admin = pwd.hash(ADMIN_REGULAR_PASSWORD)
    h_client = pwd.hash(CLIENT_PASSWORD)

    # ── dashboard admin_users table (used by admin dashboard login) ──
    await conn.execute(
        text(
            """
            INSERT INTO admin_users (
              id, email, name, password_hash, role, permissions, is_active,
              created_at, updated_at
            ) VALUES
            (:sid, :semail, 'Super Admin', :shash, 'superadmin',
             CAST(ARRAY['*'] AS text[]), true, NOW(), NOW()),
            (:aid, :aemail, 'Admin User', :ahash, 'admin',
             CAST(ARRAY['view_clients','edit_clients','view_documents','edit_documents'] AS text[]),
             true, NOW(), NOW())
            """
        ),
        {
            "sid": super_id,
            "semail": ADMIN_SUPER_EMAIL,
            "shash": h_super,
            "aid": admin_id,
            "aemail": ADMIN_REGULAR_EMAIL,
            "ahash": h_admin,
        },
    )

    # ── admins table (FK target for payments.created_by_id / audit_logs etc.) ──
    if await _table_exists(conn, "admins"):
        await conn.execute(
            text(
                """
                INSERT INTO admins (id, email, name, password_hash, role, permissions, is_active, created_at, updated_at)
                VALUES (:id, :email, 'Super Admin', :ph, 'superadmin', CAST('[]' AS json), true, NOW(), NOW())
                """
            ),
            {"id": admins_super_id, "email": ADMIN_SUPER_EMAIL, "ph": h_super},
        )
    else:
        admins_super_id = super_id  # fallback: use admin_users id if admins table absent

    ucols = await _columns(conn, "users")
    accept_sql = ""
    if "accept_terms" in ucols:
        accept_sql = ", accept_terms"
    user_insert = f"""
            INSERT INTO users (
              id, email, first_name, last_name, phone, password_hash,
              email_verified, is_active{accept_sql}, created_at, updated_at
            ) VALUES
            (:u1, :e1, 'Dummy', 'ClientOne', '+1-416-555-0001', :p1, true, true{', false' if accept_sql else ''}, NOW(), NOW()),
            (:u2, :e2, 'Dummy', 'ClientTwo', '+1-416-555-0002', :p2, true, true{', false' if accept_sql else ''}, NOW(), NOW())
            """
    await conn.execute(
        text(user_insert),
        {
            "u1": u1,
            "e1": CLIENT_1_EMAIL,
            "p1": h_client,
            "u2": u2,
            "e2": CLIENT_2_EMAIL,
            "p2": h_client,
        },
    )

    await conn.execute(
        text(
            """
            INSERT INTO filings (
              id, user_id, filing_year, status, total_fee, email_thread_id,
              created_at, updated_at
            ) VALUES
            (:f1, :u1, 2025, 'documents_pending', 1200.00, NULL, NOW(), NOW()),
            (:f2, :u2, 2025, 'in_preparation', 950.00, NULL, NOW(), NOW())
            """
        ),
        {"f1": f1, "f2": f2, "u1": u1, "u2": u2},
    )

    if await _table_exists(conn, "clients"):
        await conn.execute(
            text(
                """
                INSERT INTO clients (
                  id, name, email, phone, filing_year, status, payment_status,
                  assigned_admin_id, total_amount, paid_amount, created_at, updated_at
                ) VALUES
                (:f1, 'Dummy ClientOne', :e1, '+1-416-555-0001', 2025,
                 'documents_pending', 'pending', :super_id, 1200.00, 0, NOW(), NOW()),
                (:f2, 'Dummy ClientTwo', :e2, '+1-416-555-0002', 2025,
                 'in_preparation', 'pending', :super_id, 950.00, 0, NOW(), NOW())
                """
            ),
            {"f1": f1, "f2": f2, "e1": CLIENT_1_EMAIL, "e2": CLIENT_2_EMAIL, "super_id": super_id},
        )

    await conn.execute(
        text(
            """
            INSERT INTO t1_forms (
              id, filing_id, user_id, status, is_locked, completion_percentage,
              last_saved_step_id, submitted_at, reviewed_by, reviewed_at, review_notes,
              created_at, updated_at
            ) VALUES
            (:t1, :f1, :u1, 'draft', false, 35, 'personal_info', NULL, NULL, NULL, NULL, NOW(), NOW()),
            (:t2, :f2, :u2, 'draft', false, 20, 'questionnaire', NULL, NULL, NULL, NULL, NOW(), NOW())
            """
        ),
        {"t1": t1, "t2": t2, "f1": f1, "f2": f2, "u1": u1, "u2": u2},
    )

    def ans_rows(form_uuid: uuid.UUID, first: str, last: str, email: str) -> list[dict]:
        rows = [
            (form_uuid, "personalInfo.firstName", "text", first),
            (form_uuid, "personalInfo.lastName", "text", last),
            (form_uuid, "personalInfo.email", "text", email),
            (form_uuid, "personalInfo.phoneNumber", "text", "+1-416-555-0199"),
            (form_uuid, "questionnaire.hasForeignProperty", "bool", False),
            (form_uuid, "questionnaire.hasMedicalExpenses", "bool", True),
            (form_uuid, "questionnaire.isSelfEmployed", "bool", False),
        ]
        out = []
        for form_id, key, kind, val in rows:
            rid = uuid.uuid4()
            if kind == "bool":
                out.append(
                    {
                        "id": rid,
                        "fid": form_id,
                        "k": key,
                        "vb": val,
                        "vt": None,
                        "vn": None,
                        "vd": None,
                        "va": None,
                    }
                )
            else:
                out.append(
                    {
                        "id": rid,
                        "fid": form_id,
                        "k": key,
                        "vb": None,
                        "vt": val,
                        "vn": None,
                        "vd": None,
                        "va": None,
                    }
                )
        return out

    all_answers = ans_rows(t1, "Dummy", "ClientOne", CLIENT_1_EMAIL) + ans_rows(
        t2, "Dummy", "ClientTwo", CLIENT_2_EMAIL
    )
    for row in all_answers:
        await conn.execute(
            text(
                """
                INSERT INTO t1_answers (
                  id, t1_form_id, field_key,
                  value_boolean, value_text, value_numeric, value_date, value_array,
                  created_at, updated_at
                ) VALUES (
                  :id, :fid, :k, :vb, :vt, :vn, :vd, :va, NOW(), NOW()
                )
                """
            ),
            row,
        )

    if await _table_exists(conn, "documents") and await _table_exists(conn, "clients"):
        d1, d2 = uuid.uuid4(), uuid.uuid4()
        doc_cols = await _columns(conn, "documents")
        # Use the actual production schema for documents (all NOT NULL columns filled)
        await conn.execute(
            text(
                """
                INSERT INTO documents (
                  id, filing_id, client_id,
                  name, original_filename, file_type, file_size, file_path,
                  encrypted, document_type, status, version,
                  uploaded_at, created_at, updated_at,
                  notes, is_approved, type
                ) VALUES
                (:d1, :f1, :f1,
                 'Sample T4 Slip', 'T4_slip.pdf', 'application/pdf', 0, '/seeded/T4_slip.pdf',
                 false, 'income', 'pending', 1,
                 NOW(), NOW(), NOW(),
                 'Seeded sample', false, 'income'),
                (:d2, :f2, :f2,
                 'Sample Receipt', 'receipt.pdf', 'application/pdf', 0, '/seeded/receipt.pdf',
                 false, 'deduction', 'pending', 1,
                 NOW(), NOW(), NOW(),
                 'Seeded sample', false, 'deduction')
                """
            ),
            {"d1": d1, "d2": d2, "f1": f1, "f2": f2},
        )

    if await _table_exists(conn, "payments"):
        p1 = uuid.uuid4()
        await conn.execute(
            text(
                """
                INSERT INTO payments (id, filing_id, client_id, amount, method, note, created_by_id, created_at)
                VALUES (:p1, :f1, :f1, 200.00, 'E-Transfer', 'Seeded partial payment', :admin, NOW())
                """
            ),
            {"p1": p1, "f1": f1, "admin": admins_super_id},
        )
        if await _table_exists(conn, "clients"):
            await conn.execute(
                text(
                    """
                    UPDATE clients SET paid_amount = 200.00, payment_status = 'partial', updated_at = NOW()
                    WHERE id = :f1
                    """
                ),
                {"f1": f1},
            )

    return {
        "admin_super": f"{ADMIN_SUPER_EMAIL} / {ADMIN_SUPER_PASSWORD}",
        "admin_regular": f"{ADMIN_REGULAR_EMAIL} / {ADMIN_REGULAR_PASSWORD}",
        "client_1": f"{CLIENT_1_EMAIL} / {CLIENT_PASSWORD}",
        "client_2": f"{CLIENT_2_EMAIL} / {CLIENT_PASSWORD}",
        "filing_ids": f"{f1}, {f2}",
        "user_ids": f"{u1}, {u2}",
    }


async def main_async(args: argparse.Namespace) -> None:
    database_url = _load_database_url()
    engine = create_script_engine(database_url)
    try:
        async with engine.connect() as conn:
            tables = await _list_public_tables(conn)

        if args.dry_run:
            print("Dry run — would TRUNCATE these tables:")
            for t in tables:
                print(f"  - {t}")
            print("\nNo changes made.")
            return

        if not args.confirm_flush:
            raise SystemExit("Refusing to run without --confirm-flush (destructive).")

        async with engine.begin() as conn:
            await flush_all(conn, tables)
            creds = await seed(conn)

        print("Flush + seed completed.\n")
        print("Dashboard (admin_users):")
        print(f"  {creds['admin_super']}")
        print(f"  {creds['admin_regular']}")
        print("\nClient API (users):")
        print(f"  {creds['client_1']}")
        print(f"  {creds['client_2']}")
        print(f"\nFiling UUIDs (used as client id in admin UI when filing exists): {creds['filing_ids']}")

    except TimeoutError:
        raise SystemExit(
            "Database connection timed out.\n"
            "  • export DB_CONNECT_TIMEOUT=300\n"
            "  • Check RDS security group, public accessibility, and DATABASE_URL.\n"
            "  • TLS: export DATABASE_SSL=require or DATABASE_SSL=disable (local)."
        ) from None
    finally:
        await engine.dispose()


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument(
        "--confirm-flush",
        action="store_true",
        help="Required to perform TRUNCATE on all public tables.",
    )
    p.add_argument("--dry-run", action="store_true", help="List tables that would be truncated.")
    args = p.parse_args()
    asyncio.run(main_async(args))


if __name__ == "__main__":
    main()
