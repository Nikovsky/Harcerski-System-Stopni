# HSS Documentation Taxonomy

Root router dla dokumentacji HSS. Uzywaj go jako pierwszego pliku kontekstu.

## Zasady adresacji

- `0000-overview.md` - root router i mapa dokumentacji.
- `0100-*.md` - domena produktowa.
- `0200-*.md` - domena architektury, kontraktow i jakosci.
- `0300-*.md` - domena runtime, instalacji i operacji lokalnych.
- `9999-backlog.pl.md` - parking/backlog, nie zrodlo prawdy dla kontraktow.

## Routing

| Potrzeba | Start |
|---|---|
| Produkt, zakres, uzytkownicy, user stories, UX | [0100-product.md](./0100-product.md) |
| Architektura, API, dane, NFR, observability, security fixes | [0200-architecture.md](./0200-architecture.md) |
| Instalacja, uruchamianie, Docker, Prisma, stack lokalny | [0300-runtime.md](./0300-runtime.md) |
| Zadania i parking | [9999-backlog.pl.md](./9999-backlog.pl.md) |

## Minimalny kontekst dla agenta

1. [0101-product-overview.pl.md](./0101-product-overview.pl.md)
2. [0103-scope-mvp-next.pl.md](./0103-scope-mvp-next.pl.md)
3. [0201-architecture-mvp.pl.md](./0201-architecture-mvp.pl.md)
4. [0203-api-spec.pl.md](./0203-api-spec.pl.md)

