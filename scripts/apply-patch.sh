#!/bin/bash
# apply-patch.sh — Apply patch files to the current branch
#
# Usage:
#   ./scripts/apply-patch.sh [patch-file]     # Apply a specific patch
#   ./scripts/apply-patch.sh --all            # Apply all unapplied patches in order
#
# Examples:
#   ./scripts/apply-patch.sh patches/0001-initial-sync.patch
#   ./scripts/apply-patch.sh --all

set -euo pipefail

PATCHES_DIR="$(git rev-parse --show-toplevel)/patches"
APPLIED_FILE="$PATCHES_DIR/.applied"

touch "$APPLIED_FILE"

apply_one() {
  local patch="$1"
  local basename=$(basename "$patch")

  if grep -qxF "$basename" "$APPLIED_FILE" 2>/dev/null; then
    echo "SKIP: $basename (already applied)"
    return 0
  fi

  echo "Applying: $basename"

  if git apply --check "$patch" 2>/dev/null; then
    git apply "$patch"
    echo "$basename" >> "$APPLIED_FILE"
    echo "  OK"
  else
    echo "  Trying with 3-way merge..."
    if git apply --3way "$patch"; then
      echo "$basename" >> "$APPLIED_FILE"
      echo "  OK (3-way)"
    else
      echo "  FAILED: $basename — resolve conflicts manually, then add '$basename' to patches/.applied"
      return 1
    fi
  fi
}

if [ "${1:-}" = "--all" ]; then
  echo "Applying all patches in order..."
  echo ""
  for patch in "$PATCHES_DIR"/*.patch; do
    [ -f "$patch" ] || continue
    apply_one "$patch" || exit 1
  done
  echo ""
  echo "All patches applied."
elif [ -n "${1:-}" ]; then
  apply_one "$1"
else
  echo "Usage:"
  echo "  $0 <patch-file>   Apply a specific patch"
  echo "  $0 --all          Apply all unapplied patches in order"
  exit 1
fi
