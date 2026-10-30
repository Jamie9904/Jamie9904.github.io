#!/usr/bin/env python3
"""Stop hook: if the user's download copy (/mnt/user-data/outputs/lpn-site and lpn-site.zip) no longer matches
main on GitHub, remind Claude once per main commit to sync it, as release-lpn describes.

Compares each site file in origin/main (everything except .claude/, docs/ and .mcp.json) with the copy in the
outputs folder by git blob hash, and checks the zip isn't older than the folder. Never blocks twice for the same
main commit, and does nothing when there is no outputs folder (for example on the user's own computer).
"""
import json, os, re, subprocess, sys, zipfile

OUT = "/mnt/user-data/outputs"
SITE = os.path.join(OUT, "lpn-site")
ZIP = os.path.join(OUT, "lpn-site.zip")

def git(args, cwd, inp=None):
    return subprocess.run(["git"] + args, cwd=cwd, capture_output=True, text=True, timeout=30, input=inp)

def find_repo(data):
    for s in [os.environ.get("CLAUDE_PROJECT_DIR"), data.get("cwd"), os.getcwd()]:
        if not s:
            continue
        top = git(["rev-parse", "--show-toplevel"], s).stdout.strip()
        if top and os.path.isfile(os.path.join(top, "sw.js")):
            return top
        try:
            for n in sorted(os.listdir(s)):
                d = os.path.join(s, n)
                if os.path.isdir(os.path.join(d, ".git")) and os.path.isfile(os.path.join(d, "sw.js")):
                    return d
        except Exception:
            pass
    return None

def site_file(p):
    return not (p.startswith(".claude/") or p.startswith("docs/") or p == ".mcp.json")

def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        data = {}
    if data.get("stop_hook_active") or not os.path.isdir(SITE):
        return 0
    top = find_repo(data)
    if not top:
        return 0
    main_sha = git(["rev-parse", "refs/remotes/origin/main"], top).stdout.strip()
    if not main_sha:
        return 0
    marker = os.path.join(top, ".git", "lpn-outputs-reminded")
    try:
        if open(marker).read().strip() == main_sha:
            return 0
    except Exception:
        pass

    want = {}
    for line in git(["ls-tree", "-r", "refs/remotes/origin/main"], top).stdout.splitlines():
        meta, p = line.split("\t", 1)
        if site_file(p):
            want[p] = meta.split()[2]
    present = [p for p in want if os.path.isfile(os.path.join(SITE, p))]
    hashes = git(["hash-object", "--stdin-paths"], top, "\n".join(os.path.join(SITE, p) for p in present) + "\n").stdout.split()
    have = dict(zip(present, hashes))
    stale = sorted(p for p in want if have.get(p) != want[p])
    # The outputs folder's storage rewrites media files' metadata after they're saved, so for pictures and
    # video compare what they show (decoded frames), not the raw bytes.
    def same_media(p):
        try:
            sums = []
            for src in (os.path.join(top, p), os.path.join(SITE, p)):
                r = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", src, "-map", "0:v:0", "-f", "md5", "-"], capture_output=True, text=True, timeout=60)
                if r.returncode != 0 or not r.stdout.strip():
                    return False
                sums.append(r.stdout.strip())
            return sums[0] == sums[1] and git(["cat-file", "-e", "refs/remotes/origin/main:" + p], top).returncode == 0 and \
                git(["diff", "--quiet", "refs/remotes/origin/main", "--", p], top).returncode == 0
        except Exception:
            return False
    stale = [p for p in stale if not (p in have and re.search(r"\.(mp4|webm|jpe?g|png)$", p, re.I) and same_media(p))]

    zip_note = ""
    try:
        newest = max(os.path.getmtime(os.path.join(SITE, p)) for p in present) if present else 0
        if not os.path.isfile(ZIP) or os.path.getmtime(ZIP) + 1 < newest:
            zip_note = "lpn-site.zip is older than the folder."
        else:
            with zipfile.ZipFile(ZIP) as z:
                if any(n.startswith("lpn-site/docs/") or n.startswith("lpn-site/.claude/") or n.endswith(".mcp.json") for n in z.namelist()):
                    zip_note = "lpn-site.zip contains docs or Claude settings, which must stay out of it."
    except Exception as e:
        zip_note = "couldn't check lpn-site.zip (%s)." % e

    if not stale and not zip_note:
        return 0
    try:
        open(marker, "w").write(main_sha)
    except Exception:
        pass
    parts = []
    if stale:
        parts.append("%d site file(s) differ from main: %s" % (len(stale), ", ".join(stale[:8]) + (" and more" if len(stale) > 8 else "")))
    if zip_note:
        parts.append(zip_note)
    print(json.dumps({"decision": "block", "reason":
        "The user's download copy in /mnt/user-data/outputs is out of step with main (" + main_sha[:7] + "): " + " ".join(parts) +
        " Sync it as the release-lpn skill shows (tar the tracked site files, excluding .claude/, docs/ and .mcp.json, into lpn-site/, then zip -qrFS lpn-site.zip lpn-site), then finish."}))
    return 0

if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception:
        sys.exit(0)
