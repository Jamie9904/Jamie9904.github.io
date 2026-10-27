#!/usr/bin/env python3
"""PreToolUse hook for Bash commands in the LPN Pallet Log repo.

- git commit: blocks when app files changed but the cache name in sw.js did not.
- git commit on main: blocks changes to docs/ (the documentation lives only on the docs branch).
- git merge of the docs branch into main, or pushing docs to main: blocked.
- git push (except pushes of the docs branch): runs the automatic checks first and
  blocks the push if any fail.

Exit code 2 blocks the tool call and shows stderr to Claude.
"""
import json, os, re, shlex, subprocess, sys

APP = re.compile(r"^(index\.html|styles\.css|core\.js|scan\.js|export\.js|compare\.js|panels\.js|manifest\.webmanifest|icon-192\.png|icon-512\.png|apple-touch-icon\.png|fonts/.+)$")

def run(args, cwd, timeout=60):
    return subprocess.run(args, cwd=cwd, capture_output=True, text=True, timeout=timeout)

def repo_for(cmd, cwd):
    m = re.search(r"git\s+-C\s+(\"[^\"]+\"|'[^']+'|\S+)", cmd)
    path = os.path.expandvars(os.path.expanduser(m.group(1).strip("'\""))) if m else cwd
    m2 = re.match(r"\s*cd\s+(\"[^\"]+\"|'[^']+'|\S+)", cmd)
    if not m and m2:
        path = os.path.expandvars(os.path.expanduser(m2.group(1).strip("'\"")))
    try:
        top = run(["git", "rev-parse", "--show-toplevel"], path).stdout.strip()
    except Exception:
        return None
    if top and os.path.isfile(os.path.join(top, "sw.js")) and os.path.isfile(os.path.join(top, "tests", "run.js")):
        try:
            if "lpn-log-v" in open(os.path.join(top, "sw.js"), encoding="utf8").read():
                return top
        except Exception:
            pass
    return None

def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        return 0
    cmd = (data.get("tool_input") or {}).get("command", "") or ""
    cwd = data.get("cwd") or os.getcwd()
    is_commit = re.search(r"\bgit\b[^;&|]*\bcommit\b", cmd)
    is_push = re.search(r"\bgit\b[^;&|]*\bpush\b", cmd)
    is_merge = re.search(r"\bgit\b[^;&|]*\bmerge\b[^;&|]*\bdocs\b", cmd)
    if not (is_commit or is_push or is_merge):
        return 0
    top = repo_for(cmd, cwd)
    if not top:
        return 0
    branch = run(["git", "rev-parse", "--abbrev-ref", "HEAD"], top).stdout.strip()

    if is_merge and branch == "main":
        print("Docs guard: the docs branch must never be merged into main. The documentation stays on its own branch.", file=sys.stderr)
        return 2
    if is_push and re.search(r"\bdocs:(refs/heads/)?main\b", cmd) or (is_push and branch == "docs" and re.search(r":(refs/heads/)?main\b|\bpush\b[^;&|]*\bmain\b", cmd)):
        print("Docs guard: pushing the docs branch to main is not allowed. Push it to the docs branch only.", file=sys.stderr)
        return 2
    if is_commit and branch == "main":
        changed = set(run(["git", "diff", "HEAD", "--name-only"], top).stdout.split())
        changed |= set(run(["git", "ls-files", "--others", "--exclude-standard"], top).stdout.split())
        docs = sorted(f for f in changed if f.startswith("docs/"))
        if docs:
            print("Docs guard: these documentation files would be committed to main: " + ", ".join(docs)
                  + ". The documentation lives only on the docs branch (use the docs-updater agent). Remove them from main and commit again.", file=sys.stderr)
            return 2

    if is_commit:
        changed = set(run(["git", "diff", "HEAD", "--name-only"], top).stdout.split())
        changed |= set(run(["git", "ls-files", "--others", "--exclude-standard"], top).stdout.split())
        app = sorted(f for f in changed if APP.match(f))
        if app:
            sw = run(["git", "diff", "HEAD", "--", "sw.js"], top).stdout
            if not re.search(r'^\+const CACHE="lpn-log-v\d+"', sw, re.M):
                print("Cache-bump guard: these app files changed but the cache name in sw.js did not: "
                      + ", ".join(app) + ". Increase CACHE in sw.js (lpn-log-vN -> vN+1) so phones pick up the update, then commit again.",
                      file=sys.stderr)
                return 2

    if is_push:
        # Pushing only the docs branch doesn't change the site, so skip the checks.
        if re.search(r"\bpush\b.*\bdocs\b", cmd) and not re.search(r"\bmain\b", cmd):
            return 0
        env = dict(os.environ)
        try:
            env["NODE_PATH"] = run(["npm", "root", "-g"], top).stdout.strip() + (":" + env["NODE_PATH"] if env.get("NODE_PATH") else "")
        except Exception:
            pass
        try:
            r = subprocess.run(["node", "tests/run.js"], cwd=top, capture_output=True, text=True, timeout=280, env=env)
        except subprocess.TimeoutExpired:
            print("Run-tests-before-push: the checks took too long, so the push was stopped. Run npm test and try again.", file=sys.stderr)
            return 2
        if r.returncode != 0:
            fails = [l.strip() for l in r.stdout.splitlines() if l.strip().startswith("FAIL") or "passed," in l]
            print("Run-tests-before-push: the automatic checks failed, so the push was stopped.\n" + "\n".join(fails[-15:] or [r.stderr[-1500:]]), file=sys.stderr)
            return 2
    return 0

if __name__ == "__main__":
    sys.exit(main())
