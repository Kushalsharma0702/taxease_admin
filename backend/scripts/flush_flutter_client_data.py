"""
Clear server-side data used by the Flutter mobile app (client-api), without dropping tables.

Targets the same PostgreSQL DATABASE_URL as the admin backend / client-api:

  • t1_forms_main + all related T1 business tables (CASCADE)
  • Legacy t1_personal_forms (encrypted T1)
  • files (+ encrypted_documents when present), reports
  • refresh_tokens, otps (session / verification)

By default this does **not** delete users, filings, t1_forms (admin v2), admin_users,
payments, or documents — only what the Flutter app typically writes through client-api.

The Flutter app may also cache data on-device (Hive/SQLite); clear that separately
in app settings or by reinstalling the app.

Usage (from tax-hub-dashboard-admin/backend, venv active):

  python scripts/flush_flutter_client_data.py --dry-run
  python scripts/flush_flutter_client_data.py --confirm

Also remove all client users and their filings / v2 T1 rows (very destructive):

  python scripts/flush_flutter_client_data.py --confirm --include-users \\
      --i-know-this-deletes-user-accounts
"""
from __future__ import annotations

import argparse
import asyncio
import os
import sys
from pathlib import Path

_BACKEND = Path(__file__).resolve().parents[1]
_SCRIPTS = Path(__file__).resolve().parent
for _p in (_SCRIPTS, _BACKEND):
    if str(_p) not in sys.path:
        sys.path.insert(0, str(_p))

from sqlalchemy import text

from db_connect import create_script_engine


def _dotenv_paths() -> list[Path]:
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

    for path in _dotenv_paths():
        if path.is_file():
            load_dotenv(path, override=True)
    url = os.environ.get("DATABASE_URL")
    if not url:
        tried = "\n".join(f"  - {p}" for p in _dotenv_paths())
        raise SystemExit(
            "DATABASE_URL is not set. Export it or add it to backend/.env / client-api/.env.\n" + tried
        )
    return url


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


async def _truncate_flutter_only(conn) -> list[str]:
    """Truncate Flutter / client-api tables; keep users and admin schema."""
    # Order: children with FK to files first; then t1_forms_main CASCADE pulls all T1 business children.
    phases: list[list[str]] = [
        ["encrypted_documents"],
        ["files", "reports", "t1_personal_forms", "refresh_tokens", "otps"],
        ["t1_forms_main"],
        ["notification_device_tokens"],
    ]
    ran: list[str] = []
    for group in phases:
        existing = [t for t in group if await _table_exists(conn, t)]
        if not existing:
            continue
        quoted = ", ".join(f'"{t}"' for t in existing)
        await conn.execute(text(f"TRUNCATE TABLE {quoted} RESTART IDENTITY CASCADE"))
        ran.extend(existing)
    return ran


async def _truncate_include_users(conn) -> None:
    """Remove users and everything that references them (filings, v2 t1_forms, etc.)."""
    if not await _table_exists(conn, "users"):
        return
    await conn.execute(text('TRUNCATE TABLE "users" RESTART IDENTITY CASCADE'))


async def main_async(args: argparse.Namespace) -> None:
    database_url = _load_database_url()
    engine = create_script_engine(database_url)
    try:
        if args.dry_run:
            try:
                async with engine.connect() as conn:
                    candidates = [
                        "t1_forms_main",
                        "t1_personal_forms",
                        "files",
                        "encrypted_documents",
                        "reports",
                        "refresh_tokens",
                        "otps",
                        "notification_device_tokens",
                    ]
                    print("Dry run — tables that exist and would be truncated (Flutter scope):")
                    for t in candidates:
                        if await _table_exists(conn, t):
                            print(f"  - {t}")
                    if args.include_users:
                        print("\nWith --include-users: would also TRUNCATE users CASCADE (filings, v2 T1, …).")
            except TimeoutError:
                raise SystemExit(
                    "Database connection timed out during dry-run.\n"
                    "  export DB_CONNECT_TIMEOUT=300\n"
                    "  Check RDS security group, public accessibility, and DATABASE_URL."
                ) from None
            return

        if not args.confirm:
            raise SystemExit("Refusing to run without --confirm.")

        if args.include_users and not args.i_know:
            raise SystemExit(
                "Refusing --include-users without --i-know-this-deletes-user-accounts "
                "(this removes all users and dependent rows)."
            )

        try:
            async with engine.begin() as conn:
                ran = await _truncate_flutter_only(conn)
                if args.include_users:
                    await _truncate_include_users(conn)
        except TimeoutError:
            raise SystemExit(
                "Database connection timed out.\n"
                "  • export DB_CONNECT_TIMEOUT=300\n"
                "  • Check RDS security group, public accessibility, and DATABASE_URL.\n"
                "  • TLS: DATABASE_SSL=require or DATABASE_SSL=disable (local PG)."
            ) from None

        print("Done.")
        print("Truncated:", ", ".join(ran) if ran else "(no matching tables found)")
        if args.include_users:
            print("Also ran: TRUNCATE users … CASCADE")

    finally:
        await engine.dispose()


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--confirm", action="store_true", help="Perform truncation.")
    p.add_argument("--dry-run", action="store_true", help="List tables that would be affected.")
    p.add_argument(
        "--include-users",
        action="store_true",
        help="Also truncate users (and CASCADE: filings, t1_forms, …). Requires --i-know-this-deletes-user-accounts.",
    )
    p.add_argument(
        "--i-know-this-deletes-user-accounts",
        action="store_true",
        dest="i_know",
        help="Acknowledge full user wipe when using --include-users.",
    )
    args = p.parse_args()
    asyncio.run(main_async(args))


if __name__ == "__main__":
    main()
