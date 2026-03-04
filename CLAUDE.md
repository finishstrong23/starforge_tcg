# STARFORGE TCG — Development Workflow

## Branch Strategy
- `main` — deployed branch (Vercel auto-deploys from here)
- Feature branches — create from `main`, merge back via PR or sync script

## Patch System
We use a patch-based workflow to track and replay changes.

### Creating a patch (after finishing work on a feature branch)
```bash
./scripts/generate-patch.sh main my-feature-name
```
This creates `patches/NNNN-my-feature-name.patch` with the diff from main.

### Applying patches to main
```bash
git checkout main
./scripts/apply-patch.sh --all        # apply all unapplied patches
./scripts/apply-patch.sh patches/0002-foo.patch  # apply one specific patch
git commit -am "Apply patch: description"
git push origin main
```

### Full sync (when branches have diverged too far)
```bash
./scripts/sync-to-main.sh
```
This replaces main's content with the current branch. Use when patch apply fails.

## Key Commands
```bash
npm run dev          # Start dev server (port 3000)
npm run build:ui     # Build for production (Vite)
npm run build        # TypeScript compile only
npm test             # Run tests (Jest)
npm run lint         # Lint
```

## Project Structure
- `src/ui/` — React UI components (Vite + React)
- `src/engine/` — Game engine logic
- `src/types/` — TypeScript type definitions
- `src/data/` — Card data and sample decks
- `src/ai/` — AI player logic
- `src/combat/` — Combat resolution
- `patches/` — Saved patch files for incremental updates
- `scripts/` — Build/deploy/patch helper scripts

## Asset URLs
Logo and images use raw GitHub URLs with commit SHAs to bypass CDN caching:
```
https://raw.githubusercontent.com/finishstrong23/starforge_tcg/{commit-sha}/src/assets/logo.png
```
When updating assets, update the commit SHA in `src/ui/components/StarforgeLogo.tsx`.
