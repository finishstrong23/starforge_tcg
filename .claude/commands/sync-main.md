Sync the current branch to main using the project's patch workflow.

1. Run `git status` to check for uncommitted changes — commit them first if needed
2. Generate a patch: `./scripts/generate-patch.sh main <current-branch-name>`
3. Switch to main: `git checkout main`
4. Apply the patch: `./scripts/apply-patch.sh --all`
5. If patch apply fails, use full sync: `./scripts/sync-to-main.sh`
6. Commit and push main
7. Switch back to the feature branch
