#!/usr/bin/env python3
"""Turns what tools/old-data/make.js recorded from each old build into real files:
  log.xlsx  the cells (and merged cells) that build's Excel export wrote
  log.pdf   a PDF with that build's hidden data (keywords) and the LPN column as text, the way its Email PDF made it
Run after make.js:  python3 tools/old-data/files.py
The files are rebuilt from the recorded content because ExcelJS and jsPDF can't be installed in every place the
checks are made; the content itself comes from the old build's own code."""
import json, os, glob
from openpyxl import Workbook
from openpyxl.utils import get_column_letter
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
for d in sorted(glob.glob(os.path.join(ROOT, "tests/fixtures/old/build-*"))):
    rec = json.load(open(os.path.join(d, "cells.json"), encoding="utf8"))
    wb = Workbook(); ws = wb.active; ws.title = "LPN log"
    for r, c, v in rec["cells"]:
        ws.cell(row=r, column=c, value=v)
    for m in rec.get("merges", []):
        if len(m) == 4 and all(isinstance(x, int) for x in m):
            ws.merge_cells(start_row=m[0], start_column=m[1], end_row=m[2], end_column=m[3])
        elif len(m) == 1 and isinstance(m[0], str):
            ws.merge_cells(m[0])
    # Fixed dates inside the file so a rebuild gives the same bytes.
    import datetime
    wb.properties.created = wb.properties.modified = datetime.datetime(2026, 3, 2, 10, 0, 0)
    wb.save(os.path.join(d, "log.xlsx"))

    kw = open(os.path.join(d, "keywords.txt"), encoding="utf8").read()
    exp = json.load(open(os.path.join(d, "expect.json"), encoding="utf8"))
    pdf = canvas.Canvas(os.path.join(d, "log.pdf"), pagesize=A4, invariant=1)
    pdf.setTitle("LPN log " + exp["delivery"]["date"]); pdf.setSubject("LPN log"); pdf.setKeywords(kw)
    pdf.setFont("Helvetica-Bold", 14); pdf.drawString(40, 800, "Goods-in pallet log")
    pdf.setFont("Helvetica", 10); pdf.drawString(60, 760, "LPN"); pdf.drawString(200, 760, "Pallet Type")
    for i, r in enumerate(exp["rows"]):
        pdf.drawString(60, 744 - i * 16, r["lpn"]); pdf.drawString(200, 744 - i * 16, r["type"])
    pdf.save()
    print(os.path.basename(d) + ": log.xlsx and log.pdf")
