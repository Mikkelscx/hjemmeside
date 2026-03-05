#!/bin/zsh
set -euo pipefail

# Simple auto-commit watcher. Commits whenever there are changes.
while true; do
	# Check for any changes (modified, untracked, staged)
	if [[ -n "$(git status --porcelain)" ]]; then
		git add -A
		now=$(date "+%Y-%m-%d %H:%M:%S")
		git commit -m "auto: save at ${now}"
	fi
	sleep 3
done