#!/bin/bash
# generate-patch.sh — Create a numbered patch from the current branch's new commits
#
# Usage:
#   ./scripts/generate-patch.sh [base-branch] [patch-name]
#
# Examples:
#   ./scripts/generate-patch.sh main logo-fix
#   ./scripts/generate-patch.sh              # defaults: main, auto-numbered

set -euo pipefail

BASE="${1:-main}"
NAME="${2:-}"
PATCHES_DIR="$(git rev-parse --show-toplevel)/patches"

mkdir -p "$PATCHES_DIR"

# Auto-number the patch
NEXT_NUM=$(printf "%04d" "$(( $(ls "$PATCHES_DIR"/*.patch 2>/dev/null | wc -l) + 1 ))")

if [ -z "$NAME" ]; then
  # Use current branch name, cleaned up
  BRANCH=$(git rev-parse --abbrev-ref HEAD)
  NAME=$(echo "$BRANCH" | sed 's|[/:]|-|g' | sed 's|^claude-||')
fi

PATCH_FILE="$PATCHES_DIR/${NEXT_NUM}-${NAME}.patch"

# Generate the patch as a format-patch bundle (preserves commits)
echo "Generating patch: $PATCH_FILE"
echo "Base: $BASE"
echo "Head: $(git rev-parse --abbrev-ref HEAD)"
echo ""

# Use diff instead of format-patch for cross-history compatibility
git diff "$BASE" HEAD -- . ':!patches' > "$PATCH_FILE"

LINES=$(wc -l < "$PATCH_FILE")
echo "Created $PATCH_FILE ($LINES lines)"
echo ""
echo "To apply this patch on another branch:"
echo "  git apply patches/${NEXT_NUM}-${NAME}.patch"
