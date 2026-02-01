# @file: ./scripts/schemas/schema.py
# @description: Environment schemas catalog used by doctor decorators

from __future__ import annotations

from dataclasses import dataclass
from typing import Final, Mapping


@dataclass(frozen=True, slots=True)
class EnvVarSpec:
    """Single ENV key specification."""
    required: bool
    default: str | None
    allowed: frozenset[str] | None
    help: str
    quote: bool = False  # when True, always wrap value in double quotes


@dataclass(frozen=True, slots=True)
class EnvSchema:
    """ENV schema definition (name + key specs)."""
    name: str
    keys: Mapping[str, EnvVarSpec]


@dataclass(frozen=True, slots=True)
class SchemaCatalog:
    """Named schemas exposed as `schema.<name>`."""
    prisma: EnvSchema
    nest: EnvSchema
    next: EnvSchema
    compose: EnvSchema


schema: Final[SchemaCatalog] = SchemaCatalog(
    prisma=EnvSchema(
        name="schema.prisma",
        keys={
            "DATABASE_URL": EnvVarSpec(
                required=True,
                default="postgresql://hss:rootsecret@localhost:5432/hss?schema=public",
                allowed=None,
                help="PostgreSQL connection string for Prisma.",
                quote=True,  # <-- always: DATABASE_URL="..."
            ),
        },
    ),
    nest=EnvSchema(
        name="schema.nest",
        keys={
            "NODE_ENV": EnvVarSpec(
                required=True,
                default="development",
                allowed=frozenset({"development", "test", "production"}),
                help="Node runtime environment.",
            ),
            "APP_PORT": EnvVarSpec(
                required=True,
                default="3000",
                allowed=None,
                help="Main HTTP port for the app.",
            ),
            "DATABASE_URL": EnvVarSpec(
                required=True,
                default="postgresql://hss:rootsecret@localhost:5432/hss?schema=public",
                allowed=None,
                help="PostgreSQL connection string.",
                quote=True,
            ),
        },
    ),
    next=EnvSchema(
        name="schema.next",
        keys={
            # Auth.js / NextAuth
            "AUTH_SECRET": EnvVarSpec(
                required=True,
                default="CHANGE_ME__GENERATE_STRONG_SECRET",
                allowed=None,
                help="Auth.js secret used to sign/encrypt tokens/cookies (must be strong).",
                quote=True,
            ),
            "AUTH_URL": EnvVarSpec(
                required=True,
                default="https://auth.hss.local",
                allowed=None,
                help="Auth.js base URL (publicly reachable URL of the auth endpoint/app).",
                quote=True,
            ),
            "AUTH_TRUST_HOST": EnvVarSpec(
                required=True,
                default="true",
                allowed=frozenset({"true", "false"}),
                help="Trust host headers (often needed behind reverse proxies).",
                quote=False,
            ),

            # Keycloak (client for Next.js)
            "AUTH_KEYCLOAK_ID": EnvVarSpec(
                required=True,
                default="hss-web",
                allowed=None,
                help="Keycloak client_id used by Auth.js provider.",
                quote=False,
            ),
            "AUTH_KEYCLOAK_SECRET": EnvVarSpec(
                required=True,
                default="CHANGE_ME__CLIENT_SECRET",
                allowed=None,
                help="Keycloak client secret used by Auth.js provider.",
                quote=True,
            ),
            "AUTH_KEYCLOAK_ISSUER": EnvVarSpec(
                required=True,
                default="https://auth.hss.local/auth/realms/hss",
                allowed=None,
                help="Keycloak issuer URL for Auth.js provider.",
                quote=True,
            ),

            # Next public (exposed to browser)
            "NEXT_PUBLIC_KEYCLOAK_ISSUER": EnvVarSpec(
                required=True,
                default="https://auth.hss.local/auth/realms/hss",
                allowed=None,
                help="Keycloak issuer URL exposed to the browser.",
                quote=True,
            ),
            "NEXT_PUBLIC_APP_URL": EnvVarSpec(
                required=True,
                default="https://api.hss.local",
                allowed=None,
                help="Public base URL of the Next.js app.",
                quote=True,
            ),
            "NEXT_PUBLIC_KEYCLOAK_CLIENT_ID": EnvVarSpec(
                required=True,
                default="hss-web",
                allowed=None,
                help="Keycloak client_id exposed to the browser.",
                quote=False,
            ),

            # Session warning timers (seconds)
            "NEXT_PUBLIC_SESSION_WARN_SECONDS": EnvVarSpec(
                required=True,
                default="720",
                allowed=None,
                help="Seconds before session expiry to show warning (optional).",
                quote=False,
            ),
            "NEXT_PUBLIC_SESSION_HARD_WARN_SECONDS": EnvVarSpec(
                required=True,
                default="600",
                allowed=None,
                help="Seconds before expiry for hard warning (optional).",
                quote=False,
            ),
        },
    ),
    compose=EnvSchema(
        name="schema.compose",
        keys={
            # ===[GENERAL]===
            "ENV_MODE": EnvVarSpec(
                required=True,
                default="dev",
                allowed=frozenset({"dev", "test", "prod", "production"}),
                help="Compose environment mode.",
            ),
            "STACK_NAME": EnvVarSpec(
                required=True,
                default="hss",
                allowed=None,
                help="Logical stack name used for container naming.",
            ),
            "TZ": EnvVarSpec(
                required=True,
                default="Europe/Warsaw",
                allowed=None,
                help="Container timezone.",
            ),

            # ===[POSTGRES]===
            "POSTGRES_IMAGE": EnvVarSpec(
                required=True,
                default="postgres:18-alpine",
                allowed=None,
                help="PostgreSQL container image.",
            ),
            "PG_USER": EnvVarSpec(
                required=True,
                default="hss",
                allowed=None,
                help="PostgreSQL username.",
            ),
            "PG_DB": EnvVarSpec(
                required=True,
                default="hss",
                allowed=None,
                help="PostgreSQL database name.",
            ),
            "PG_PASSWORD": EnvVarSpec(
                required=True,
                default="rootsecret",
                allowed=None,
                help="PostgreSQL password (dev only).",
                quote=True,
            ),
            "PG_PORT": EnvVarSpec(
                required=True,
                default="5432",
                allowed=None,
                help="PostgreSQL port exposed on host.",
            ),
            "LOG_MAX_SIZE": EnvVarSpec(
                required=True,
                default="10m",
                allowed=None,
                help="Docker logging max size per file.",
            ),
            "LOG_MAX_FILE": EnvVarSpec(
                required=True,
                default="3",
                allowed=None,
                help="Docker logging max rotated files.",
            ),
            "PG_MEM_LIMIT": EnvVarSpec(
                required=True,
                default="1g",
                allowed=None,
                help="PostgreSQL container memory limit.",
            ),
            "PG_CPUS": EnvVarSpec(
                required=True,
                default="1.0",
                allowed=None,
                help="PostgreSQL container CPU limit.",
            ),
            "PG_SHM_SIZE": EnvVarSpec(
                required=True,
                default="512m",
                allowed=None,
                help="PostgreSQL container shm_size.",
            ),
            "PG_INITDB_ARGS": EnvVarSpec(
                required=True,
                default="--data-checksums",
                allowed=None,
                help="Initdb args for PostgreSQL initialization.",
            ),

            # ===[KEYCLOAK]===
            "KC_PG_USER": EnvVarSpec(
                required=True,
                default="keycloak",
                allowed=None,
                help="Keycloak PostgreSQL username.",
            ),
            "KC_PG_DB": EnvVarSpec(
                required=True,
                default="keycloak",
                allowed=None,
                help="Keycloak PostgreSQL database name.",
            ),
            "KC_PG_PASSWORD": EnvVarSpec(
                required=True,
                default="rootsecret",
                allowed=None,
                help="Keycloak PostgreSQL password (dev only).",
                quote=True,
            ),
            "KEYCLOAK_IMAGE": EnvVarSpec(
                required=True,
                default="keycloak/keycloak:26.5.2",
                allowed=None,
                help="Keycloak container image.",
            ),
            "KEYCLOAK_PORT": EnvVarSpec(
                required=True,
                default="8080",
                allowed=None,
                help="Keycloak HTTP port (internal/exposed depending on compose).",
            ),
            "KEYCLOAK_ADMIN": EnvVarSpec(
                required=True,
                default="admin",
                allowed=None,
                help="Keycloak bootstrap admin username.",
            ),
            "KEYCLOAK_ADMIN_PASSWORD": EnvVarSpec(
                required=True,
                default="rootsecret",
                allowed=None,
                help="Keycloak bootstrap admin password (dev only).",
                quote=True,
            ),
            "KEYCLOAK_CPUS": EnvVarSpec(
                required=True,
                default="4.0",
                allowed=None,
                help="Keycloak container CPU limit.",
            ),
            "KC_HTTP_RELATIVE_PATH": EnvVarSpec(
                required=True,
                default="/",
                allowed=None,
                help="Keycloak HTTP relative path.",
            ),
            "KC_PROXY_HEADERS": EnvVarSpec(
                required=True,
                default="xforwarded",
                allowed=None,
                help="Keycloak proxy headers mode (e.g. xforwarded).",
            ),
            "KC_HOSTNAME": EnvVarSpec(
                required=True,
                default="auth.hss.local",
                allowed=None,
                help="Keycloak public hostname.",
            ),
            "KC_HOSTNAME_STRICT": EnvVarSpec(
                required=True,
                default="false",
                allowed=frozenset({"true", "false"}),
                help="Keycloak hostname strict mode.",
            ),
            "KC_HTTP_ENABLED": EnvVarSpec(
                required=True,
                default="true",
                allowed=frozenset({"true", "false"}),
                help="Allow HTTP (dev/local).",
            ),
            "KEYCLOAK_hss_WEB_CLIENT_SECRET": EnvVarSpec(
                required=True,
                default="CHANGE_ME__CLIENT_SECRET",
                allowed=None,
                help="Keycloak client secret for web app.",
                quote=True,  # good idea because it often ends with '='
            ),
            "KC_HOSTNAME_DEBUG": EnvVarSpec(
                required=True,
                default="true",
                allowed=frozenset({"true", "false"}),
                help="Keycloak hostname debug.",
            ),

            # ===[MINIO]===
            "MINIO_IMAGE": EnvVarSpec(
                required=True,
                default="minio/minio:RELEASE.2025-09-07T16-13-09Z",
                allowed=None,
                help="MinIO container image.",
            ),
            "MINIO_ROOT_USER": EnvVarSpec(
                required=True,
                default="minioadmin",
                allowed=None,
                help="MinIO root user.",
            ),
            "MINIO_ROOT_PASSWORD": EnvVarSpec(
                required=True,
                default="rootsecret",
                allowed=None,
                help="MinIO root password (dev only).",
                quote=True,
            ),
            "MINIO_REGION": EnvVarSpec(
                required=True,
                default="eu-central-1",
                allowed=None,
                help="MinIO region.",
            ),
            "MINIO_PORT": EnvVarSpec(
                required=True,
                default="9000",
                allowed=None,
                help="MinIO API port.",
            ),
            "MINIO_CONSOLE_PORT": EnvVarSpec(
                required=True,
                default="9001",
                allowed=None,
                help="MinIO console port.",
            ),
            "S3_ENDPOINT": EnvVarSpec(
                required=True,
                default="https://s3.hss.local",
                allowed=None,
                help="Public S3 endpoint URL.",
                quote=True,
            ),
            "S3CONSOLE_ENDPOINT": EnvVarSpec(
                required=True,
                default="https://s3console.hss.local",
                allowed=None,
                help="Public MinIO console endpoint URL.",
                quote=True,
            ),
            "MINIO_BROWSER_REDIRECT_URL": EnvVarSpec(
                required=True,
                default="https://s3console.hss.local",
                allowed=None,
                help="MinIO browser redirect URL.",
                quote=True,
            ),
            "MINIO_MEM_LIMIT": EnvVarSpec(
                required=True,
                default="1g",
                allowed=None,
                help="MinIO container memory limit.",
            ),
            "MINIO_CPUS": EnvVarSpec(
                required=True,
                default="1.0",
                allowed=None,
                help="MinIO container CPU limit.",
            ),

            # ===[NGINX]===
            "NGINX_IMAGE": EnvVarSpec(
                required=True,
                default="nginx:1.29.4-alpine-slim",
                allowed=None,
                help="Nginx container image.",
            ),
            "NGINX_HTTP_PORT": EnvVarSpec(
                required=True,
                default="80",
                allowed=None,
                help="Nginx HTTP port.",
            ),
            "NGINX_HTTPS_PORT": EnvVarSpec(
                required=True,
                default="443",
                allowed=None,
                help="Nginx HTTPS port.",
            ),
            "NGINX_MEM_LIMIT": EnvVarSpec(
                required=True,
                default="256m",
                allowed=None,
                help="Nginx container memory limit.",
            ),

            # ===[PUBLIC URLS]===
            "APP_URL": EnvVarSpec(
                required=True,
                default="https://hss.local",
                allowed=None,
                help="Public app URL.",
                quote=True,
            ),
            "API_URL": EnvVarSpec(
                required=True,
                default="https://api.hss.local",
                allowed=None,
                help="Public API URL.",
                quote=True,
            ),
            "AUTH_URL": EnvVarSpec(
                required=True,
                default="https://auth.hss.local",
                allowed=None,
                help="Public auth URL.",
                quote=True,
            ),
            "S3_URL": EnvVarSpec(
                required=True,
                default="https://s3.hss.local",
                allowed=None,
                help="Public S3 URL.",
                quote=True,
            ),
            "S3CONSOLE_URL": EnvVarSpec(
                required=True,
                default="https://s3console.hss.local",
                allowed=None,
                help="Public S3 console URL.",
                quote=True,
            ),
        },
    ),
)
