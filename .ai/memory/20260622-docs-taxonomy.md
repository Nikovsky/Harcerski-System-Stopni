# Docs Taxonomy Handoff

Date: 2026-06-22

## Summary

Documentation was reorganized into a four-digit taxonomy under `docs/`.

## Current Routing

- `docs/0000-overview.md` is the root documentation router.
- `docs/0100-product.md` routes product docs.
- `docs/0200-architecture.md` routes architecture, API, data, quality, observability, and security-fix docs.
- `docs/0300-runtime.md` routes setup and runtime docs.
- `docs/9999-backlog.pl.md` is the backlog/parking lot, not the contract source of truth.

## Moved AI Context

The former `docs/ai/*` content was moved to `.ai/*`.

Use `.ai/000-overview.md` as the repo-memory map.

## Validation

Markdown link check passed after the taxonomy change.

