#!/bin/bash
# sync-to-main.sh — One-command sync: replaces main with the current branch content
#
# This is the nuclear option when branches have diverged too far.
# It replaces main's content entirely with the current branch,
# preserving main's git history with a single merge commit.
#
# Usage:
#   ./scripts/sync-to-main.sh

set -euo pipefail

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

if [ "$CURRENT_BRANCH" = "main" ]; then
  echo "ERROR: You're already on main. Switch to your feature branch first."
  exit 1
fi

echo "=== STARFORGE Sync to Main ==="
echo "Source branch: $CURRENT_BRANCH"
echo "Target branch: main"
echo ""
echo "This will replace ALL content on main with $CURRENT_BRANCH."
read -p "Continue? (y/N) " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
  echo "Aborted."
  exit 0
fi

echo ""
echo "Step 1: Switching to main..."
git checkout main

echo "Step 2: Merging with strategy to take all changes from $CURRENT_BRANCH..."
git merge "$CURRENT_BRANCH" --strategy-option=theirs --allow-unrelated-histories -m "Sync main with $CURRENT_BRANCH — full content replacement"

echo "Step 3: Pushing to origin..."
git push origin main

echo ""
echo "Done! Main is now in sync with $CURRENT_BRANCH."
echo "Switching back to $CURRENT_BRANCH..."
git checkout "$CURRENT_BRANCH"
