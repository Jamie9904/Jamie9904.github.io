# LPN Pallet Log: design system

Written from the colours, fonts and sizes already in `styles.css` and `panels.js`. It was not based on a comparison with other websites. This is an internal goods-in tool used on phones, tablets and desktops, often with one hand or gloves, so clarity and big targets matter more than decoration.

## Principles
- Plain and quick: one clear action per area, nothing decorative.
- Phone first. Touch targets at least 44px (48px on touch screens).
- Type colours mean the pallet type and nothing else. Colour is never the only signal: every state also has text or a symbol.
- Print and export output is black on white with grey fills only.

## Colour
The whole theme comes from two user-chosen colours (background and accent) in `applyTheme()`; the rest is derived. Defaults:

| Token | Default | Role |
|---|---|---|
| `--bg` | #0c1830 | Page background (chosen by the user) |
| `--paper` | #13264a | Cards and the main sheet (bg mixed with white 8% on dark) |
| `--ink` | #eaf0fa | Body text |
| `--mu` | #9db0d0 | Secondary text, labels, hints |
| `--rule` / `--line` | #223a63 / #35507f | Dividers / input and button borders |
| `--ac` | #ff8a2a | Primary actions, focus, selected states (chosen by the user) |
| `--ac2` | #ffa24f | Accent hover |
| `--sel` / `--acs` | #1a3562 / #3a3550 | Selected row / accent tint backgrounds |
| `--onac` | auto (#111 or #fff) | Text on accent fills |
| `--bb` `--fm` `--fp` `--mx` | #dba56c #6fa8ff #a9c95a #c79bf0 | Pallet types: Brown Box, FMCG, FPP, Mixed (darker values on light themes) |
| `--dg` | #ff7b6e | Destructive and error text |
| `--wn` / `--wns` | #ffcf8a / #3a3020 | Warnings and their background |

Rules: text contrast at least 4.5:1 (the Settings tab warns when a chosen pair is too low). Row tint is 9 to 10% of the type colour plus a left stripe.

## Typography
- Body and headings: Atkinson Hyperlegible (400, 700), chosen for legibility. Fallback system-ui.
- Numbers and LPNs: IBM Plex Mono (500, 600).
- Scale (rem, multiplied by the user's Text size setting 1, 1.12 or 1.25): page title 1.3, section headings 1.25, body 1.03, labels and buttons 0.95, hints 0.82 to 0.9.
- Body line height 1.55; headings 1.15 to 1.2.

## Spacing and shape
- Spacing: 4px steps, mostly 8, 12, 14, 18. Page padding 18px; content max width 720px (two columns from 1100px; tablet delivery grid 760 to 1099px).
- Radius: 6px everywhere (`--r`). No shadows; depth comes from borders and tint.

## Components
- **Buttons**: default (outlined), primary (`.p`, accent fill, one per area), danger (`.d`, red text, transparent). Minimum height 46px. Visible focus: 2px accent outline.
- **Type buttons**: four equal buttons, selected one filled with its type colour.
- **Inputs**: 46px high, 1px line border; the LPN input has a 2px accent border and mono type.
- **Menus**: the Export menu is a full-width list of 48px buttons, the same on the Pallet log and Manifest check.
- **Notices**: `.undo` bar for undo, date reminder and offline notice; `.upd` bar for new versions; `.msg` for inline results.
- **Table rows**: type tint, left stripe, 44px or larger controls, FSDU as a checkbox.

## Exports
Spreadsheet and PDF: black on white, title band, # column, Courier New LPNs, medium inner lines with a thick outline, light-grey zebra rows, grey fills for Missing and Log only, footer with page numbers, UK dates by default. See `project-conventions` for the compatibility rules.

## Imagery and icons
Inline 2px stroke SVG icons (rounded caps). The user's logo, if set, appears in the header and on exports. No photos or illustrations.

## Open decisions
- Whether to add an `og:image` and social preview (low value for an internal tool).
- Whether to host the two fonts on the site itself so it looks the same offline (see README).
