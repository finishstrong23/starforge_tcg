# STARFORGE: Shattered Reach — Agent Guide

See **[CLAUDE.md](./CLAUDE.md)** — the single source of truth for AI-assistant
guidance in this repository (project overview, commands, architecture rules,
testing, CI/CD, and conventions). This file intentionally defers to it so the
two never drift apart.

Quick orientation:
- This repo is a single-player roguelite deck-builder (the original 1v1 TCG
  and its Express/PostgreSQL backend were removed).
- The live game is `src/dungeon/`; run state mutates only through
  `src/dungeon/engine/runReducer.ts`; all run-affecting randomness is seeded.
- `npm test` must pass and `npm run release:beta:check` gates the auto-merge
  of `claude/**` branches into `main` (which deploys to production).
