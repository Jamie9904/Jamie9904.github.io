#!/bin/sh
# PostToolUse hook: run node --check on any .js file that was just edited or written.
f=$(python3 -c 'import sys,json;d=json.load(sys.stdin);print((d.get("tool_input") or {}).get("file_path",""))' 2>/dev/null)
case "$f" in
  *.js) node --check "$f" 1>&2 || { echo "Syntax error in $f" 1>&2; exit 2; } ;;
esac
exit 0
