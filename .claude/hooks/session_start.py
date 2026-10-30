#!/usr/bin/env python3
"""SessionStart hook for the LPN Pallet Log repo.

- Makes git track every branch on GitHub and fetches, so origin/main is current. The git guard compares
  the cache number with origin/main, and a clone that only tracks some branches reports new branches
  as "unpushed".
- Gives the current branch an upstream when GitHub already has it.
- Sets NODE_PATH for the session so `npm test` finds the globally installed Playwright.
- Prints one status line, which Claude sees at the start of the session.

Never blocks the session: any problem is reported in the status line and the hook exits 0.
"""
import json, os, re, subprocess, sys

# Never wait for a password or passphrase: the hook has no terminal to ask on.
QUIET = dict(os.environ, GIT_TERMINAL_PROMPT="0", GIT_SSH_COMMAND="ssh -o BatchMode=yes")

def git(args, cwd, timeout=30):
    try:
        return subprocess.run(["git"] + args, cwd=cwd, capture_output=True, text=True, timeout=timeout, env=QUIET)
    except Exception as e:
        return subprocess.CompletedProcess(args, 1, "", str(e))

def is_lpn(d):
    return d and os.path.isfile(os.path.join(d, "sw.js")) and os.path.isfile(os.path.join(d, "tests", "run.js"))

def find_repo(data):
    """The repo may be the project folder itself or one folder below it (cloud sessions start in /home/claude)."""
    starts = [os.environ.get("CLAUDE_PROJECT_DIR"), data.get("cwd"), os.getcwd()]
    for s in [x for x in starts if x]:
        top = git(["rev-parse", "--show-toplevel"], s).stdout.strip()
        if is_lpn(top):
            return top
        try:
            for name in sorted(os.listdir(s)):
                d = os.path.join(s, name)
                if os.path.isdir(os.path.join(d, ".git")) and is_lpn(d):
                    return d
        except Exception:
            pass
    return None

def cache_of(text):
    m = re.search(r'const CACHE="lpn-log-v(\d+)"', text or "")
    return int(m.group(1)) if m else None

def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        data = {}
    top = find_repo(data)
    if not top:
        return 0
    notes = []

    if git(["remote", "get-url", "origin"], top).returncode == 0:
        git(["config", "--replace-all", "remote.origin.fetch", "+refs/heads/*:refs/remotes/origin/*"], top)
        f = git(["fetch", "--prune", "-q", "origin"], top, timeout=45)
        if f.returncode != 0:
            notes.append("couldn't fetch from GitHub, so origin/* may be out of date")
    else:
        notes.append("no GitHub remote")

    branch = git(["rev-parse", "--abbrev-ref", "HEAD"], top).stdout.strip()
    if branch == "HEAD":
        notes.append("detached HEAD (not on a branch)")
    elif branch:
        has_up = git(["rev-parse", "--abbrev-ref", branch + "@{u}"], top).returncode == 0
        if not has_up and git(["rev-parse", "--verify", "-q", "refs/remotes/origin/" + branch], top).returncode == 0:
            git(["branch", "-u", "origin/" + branch], top)
            has_up = True
        if has_up:
            ab = git(["rev-list", "--left-right", "--count", branch + "...@{u}"], top).stdout.split()
            if len(ab) == 2:
                notes.append("%s ahead, %s behind GitHub" % (ab[0], ab[1]))
        else:
            notes.append("not on GitHub yet")

    dirty = [l for l in git(["status", "--porcelain"], top).stdout.splitlines() if l.strip()]
    if dirty:
        notes.append("%d uncommitted file(s)" % len(dirty))

    try:
        here = cache_of(open(os.path.join(top, "sw.js"), encoding="utf8").read())
    except Exception:
        here = None
    live = cache_of(git(["show", "origin/main:sw.js"], top).stdout)
    if here and live:
        notes.append("build here %d, live build %d" % (here, live) + (" (bump needed before committing app changes)" if branch not in ("main", "docs", "HEAD") and here <= live else ""))

    app = ["index.html", "styles.css", "core.js", "scan.js", "export.js", "compare.js", "panels.js", "sw.js", "tests/run.js"]
    behind = git(["rev-list", "--count", "origin/docs..origin/main", "--"] + app, top).stdout.strip()
    if behind and behind != "0":
        notes.append("docs branch is %s app commit(s) behind main (run docs-updater)" % behind)

    env_file = os.environ.get("CLAUDE_ENV_FILE")
    if env_file:
        try:
            root = subprocess.run(["npm", "root", "-g"], capture_output=True, text=True, timeout=20).stdout.strip()
            if root:
                with open(env_file, "a") as fh:
                    fh.write('export NODE_PATH="%s${NODE_PATH:+:$NODE_PATH}"\n' % root)
        except Exception:
            pass

    print("LPN Pallet Log repo at %s, branch %s: %s." % (top, branch or "?", "; ".join(notes) or "up to date"))
    return 0

if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as e:
        print("LPN session-start check didn't finish: %s" % e)
        sys.exit(0)
