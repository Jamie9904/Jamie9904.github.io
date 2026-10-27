#!/usr/bin/env python3
"""Stop hook: if main has app changes that the docs branch doesn't have yet,
remind Claude once (per main commit) to update the docs branch with the docs-updater agent."""
import json, os, subprocess, sys

def git(args, cwd):
    return subprocess.run(["git"] + args, cwd=cwd, capture_output=True, text=True, timeout=30)

def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        data = {}
    if data.get("stop_hook_active"):
        return 0
    top = os.environ.get("CLAUDE_PROJECT_DIR") or data.get("cwd") or os.getcwd()
    t = git(["rev-parse", "--show-toplevel"], top).stdout.strip()
    if not t or not os.path.isfile(os.path.join(t, "sw.js")):
        return 0
    if git(["rev-parse", "--verify", "-q", "refs/remotes/origin/docs"], t).returncode != 0:
        return 0
    main_sha = git(["rev-parse", "refs/remotes/origin/main"], t).stdout.strip()
    if not main_sha:
        return 0
    app = ["index.html", "styles.css", "core.js", "scan.js", "export.js", "compare.js", "panels.js", "sw.js", "tests/run.js"]
    pending = git(["log", "--oneline", "refs/remotes/origin/docs..refs/remotes/origin/main", "--"] + app, t).stdout.strip()
    if not pending:
        return 0
    marker = os.path.join(t, ".git", "lpn-docs-reminded")
    try:
        if open(marker).read().strip() == main_sha:
            return 0
    except Exception:
        pass
    try:
        open(marker, "w").write(main_sha)
    except Exception:
        pass
    print(json.dumps({"decision": "block", "reason":
        "The docs branch is behind main for these app changes:\n" + pending +
        "\nThe user asked for the docs branch to be updated whenever features are added. Run the docs-updater agent now (it works in its own worktree and never touches main), then finish."}))
    return 0

if __name__ == "__main__":
    sys.exit(main())
