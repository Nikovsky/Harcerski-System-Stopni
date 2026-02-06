```yaml
title: "91-START"
language: "pl"
document_type: "start-guide"
project:
  code: "HSS"
  name: "Harcerski System Stopni"
created_at: "2026-02-05"
last_updated: "2026-02-05"

requirements:
  node: ">=24.12.0"
  pnpm: ">=10.26.0"
  docker: "required for infra stack"
```
- [Cold start](#cold-start)
  - [4) Start infrastruktury (Docker Compose)](#4-start-infrastruktury-docker-compose)
  - [5) Instalacja zależności (pnpm)](#5-instalacja-zależności-pnpm)
  - [6) Uruchomienie aplikacji (dev)](#6-uruchomienie-aplikacji-dev)
    - [6.1 API (NestJS)](#61-api-nestjs)
    - [6.2 WEB (Next.js)](#62-web-nextjs)
  - [7) Weryfikacja](#7-weryfikacja)
- [Warm start](#warm-start)
  - [1) Start infrastruktury](#1-start-infrastruktury)
  - [2) Start aplikacji](#2-start-aplikacji)
- [Operacje pomocnicze (Docker)](#operacje-pomocnicze-docker)
- [Najczęstsze problemy](#najczęstsze-problemy)


## Wymagania wstępne

- **Git**
- **Node.js** (zgodnie z repo / CI)
- **pnpm**
- **Docker** + Docker Compose

---

## 1) Pobranie repozytorium

```bash
git clone <REPO_URL>
cd <REPO_DIR>
```

---

## 2) Konfiguracja plików `.env`

### 2.1 Pliki do skopiowania

Skopiuj (jeśli w repo istnieją warianty `.env.example` / `.env.template`, użyj ich jako źródła):

* `./docker/.env.example` -> `./docker/.env`
* `./apps/api/.env.example` -> `./apps/api/.env`
* `./apps/web/.env.example` -> `./apps/web/.env`
* `./packages/database/.env.example` -> `./packages/database/.env`

### 2.2 Uzupełnij hasła i sekrety

* hasła do Postgresa,
* hasła admina Keycloak,
* sekrety klientów (`hss-web`, `hss-api`),
* MinIO root user/password (jeśli używasz).

> [!IMPORTANT]
> **Sekrety Keycloak muszą być spójne** pomiędzy:
>
> * `./docker/.env` (źródło prawdy dla importu realmów / stacka)
> * `./apps/web/.env` (client secret dla `hss-web`)
> * `./apps/api/.env` (client secret dla `hss-api`)
>
> W praktyce oznacza to:
>
> * `KEYCLOAK_HSS_WEB_CLIENT_SECRET` w `./docker/.env` = secret użyty w `./apps/web/.env`
> * `KEYCLOAK_HSS_API_CLIENT_SECRET` w `./docker/.env` = secret użyty w `./apps/api/.env`
>
> **Sekret można wygenerować:**
> ```powershell
> $b = New-Object byte[] 32; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); [Convert]::ToBase64String($b)
> ```


---

## 3) Kontrola końcówek linii w skryptach init Postgres (CRLF vs LF)

> [!IMPORTANT]
> Przed uruchomieniem Dockera upewnij się, że wszystkie pliki:
> `./docker/postgres/init/*.sh`
> mają końcówki linii **LF**, a nie **CRLF**.
>
> Jeśli pliki mają CRLF, Postgres init może nie wykonać skryptów poprawnie (typowe na Windows).
>
> Szybka weryfikacja:
>
> * VS Code: w prawym dolnym rogu “CRLF/LF”

---

# Cold start

> Użyj, gdy uruchamiasz projekt pierwszy raz albo chcesz pełny reset (DB/Keycloak/MinIO).

## 4) Start infrastruktury (Docker Compose)

```bash
docker compose -f ./docker/docker-compose.yml up -d
```

Sprawdź status:

```bash
docker compose -f ./docker/docker-compose.yml ps
```

> [!TIP]
> Logi (np. Keycloak):
>
> ```bash
> docker compose -f ./docker/docker-compose.yml logs -f keycloak
> ```

## 5) Instalacja zależności (pnpm)

W katalogu głównym repo:

```bash
pnpm install
```

## 6) Uruchomienie aplikacji (dev)

```bash
pnpm dev
```

### 6.1 API (NestJS)

```bash
pnpm --filter @hss/api dev
```

### 6.2 WEB (Next.js)

```bash
pnpm --filter @hss/web dev
```

## 7) Weryfikacja

* WEB: `https://hss.local`
* API: `https://api.hss.local/health` (lub inny endpoint health)
* Keycloak: `https://auth.hss.local`
* Admin Keycloak: `https://authconsole.hss.local/admin/`

---

# Warm start

> Użyj, gdy infrastruktura już działała wcześniej i masz już zainstalowane zależności.

## 1) Start infrastruktury

```bash
docker compose -f ./docker/docker-compose.yml up -d
```

## 2) Start aplikacji

```bash
pnpm dev
```

> Jeśli nie masz jednego wspólnego skryptu `dev` dla całego monorepo, użyj:
>
> ```bash
> pnpm --filter @hss/api dev
> pnpm --filter @hss/web dev
> ```

---

# Operacje pomocnicze (Docker)

> [!TIP]
> **Zatrzymanie stacka**
>
> ```bash
> docker compose -f ./docker/docker-compose.yml down
> ```
>
> **Zatrzymanie + usunięcie wolumenów (pełny reset danych)**
>
> ```bash
> docker compose -f ./docker/docker-compose.yml down -v
> ```
>
> **Restart stacka (bez kasowania wolumenów)**
>
> ```bash
> docker compose -f ./docker/docker-compose.yml restart
> ```

---

# Najczęstsze problemy

* **403 na authconsole**: restrykcje `allow/deny` w nginx — sprawdź `remote_addr`.
* **404 na `/` w Keycloak**: normalne — używaj `/admin/` lub `/realms/...`.
* **Problemy z importem realm**: niespójne sekrety klientów między `docker/.env` i `apps/*/.env`.
* **Skrypty init Postgres nie działają**: CRLF zamiast LF w `./docker/postgres/init/*.sh`.
