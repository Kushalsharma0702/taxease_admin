"""
Shared async engine settings for maintenance scripts (RDS-friendly).
"""
from __future__ import annotations

import os
import ssl
from typing import Any

from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine


def create_script_engine(database_url: str, **extra: Any) -> AsyncEngine:
    """
    Async engine for one-off scripts: long connect timeout, optional TLS for cloud PG.

    Environment:
      DB_CONNECT_TIMEOUT — seconds for TCP+SSL handshake (default 180).
      DATABASE_SSL — ``require`` | ``disable`` | empty (auto: require if host looks like RDS).
      DATABASE_SSL_INSECURE — if ``1``, disable cert hostname check (dev only).
    """
    timeout = int(os.environ.get("DB_CONNECT_TIMEOUT", "180"))
    connect_args: dict = {"timeout": timeout}

    ssl_mode = os.environ.get("DATABASE_SSL", "").strip().lower()
    url_l = database_url.lower()
    auto_ssl = "rds.amazonaws.com" in url_l or ".azure." in url_l or "sslmode=require" in url_l

    if ssl_mode == "disable":
        pass
    elif ssl_mode in ("require", "true", "1") or auto_ssl:
        ctx = ssl.create_default_context()
        if os.environ.get("DATABASE_SSL_INSECURE", "").strip().lower() in ("1", "true", "yes"):
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
        connect_args["ssl"] = ctx

    kwargs: dict = {
        "echo": False,
        "pool_pre_ping": True,
        "connect_args": connect_args,
    }
    kwargs.update(extra)
    return create_async_engine(database_url, **kwargs)
