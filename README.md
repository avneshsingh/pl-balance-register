# PL Balance Register

A Windows desktop app for maintaining Privilege Leave (PL) balance registers of government/judicial employees — replacing the repetitive Excel register with **click-based entry**.

Replicates the exact calculation pattern of the office Excel form:

| Excel formula | App equivalent |
|---|---|
| `Days = To − From + 1` | Auto-calculated from date pickers |
| `Bal = PL Earned + previous Bal` | Running balance, recomputed live |
| `Bal = Bal − PL Taken` | Running balance, recomputed live |
| 15 per half-year / 30 per year | One-click credit buttons |
| Prorated credits (121d → 10, 92d → 7.5) | `days/365 × 30`, rounded to nearest 0.5 |
| "PL Surrender YYYY-YY" rows | One click — FY label auto-generated, default 15 |
| "Joining Time" rows | Two clicks — enter days only |

## Features

- **Multiple employees**, saved automatically (no server, no database install — data lives in a local JSON file in AppData)
- **One-click entries**: Half-Year Credit auto-detects the *next pending period*; Surrender auto-labels the financial year
- **Leave Taken**: pick two dates on a calendar, PL days computed instantly
- **300-day cap warning** — rows and balance highlight when balance exceeds 300
- **Export to Excel** — same register layout as the original form, with live formulas and *no* `#VALUE!` errors
- **Export to PDF** — formal A4 statement with signature block
- **Backup / Restore** — copy the whole register to a JSON file and move it between computers
- Edit, delete, and reorder any entry; balances recompute automatically

## Dev setup (one time)

Requires Node.js 18+ (LTS recommended).

```bash
npm install
npm run dev        # opens the Electron app with hot reload
```

`npm run dev:web` runs it in a browser (uses localStorage; Excel export disabled).

## Build the Windows installer

```bash
npm run dist
```

Output: `release/PL Balance Register Setup 1.0.0.exe` — a normal NSIS installer anyone can run. No Node.js, no npm, nothing else needed on the target computer. Double-click → Next → Install → desktop shortcut.

For a **portable single .exe** (no installation at all, runs from a pen drive):

```bash
npm run dist:portable
```

> Note: unsigned installers show a Windows SmartScreen warning ("Windows protected your PC") on first run. Users click **More info → Run anyway**. Code-signing certificates remove this but cost money; for office-internal distribution the warning is normal.

## Where is my data?

`%APPDATA%/pl-balance-register/pl-register-data.json`
Use **Backup** in the app to export it, **Restore** to import on another machine.

## Project structure

```
electron/main.js        Window, storage, Excel + PDF export (main process)
electron/preload.js     Safe bridge between UI and system
electron/exportExcel.js Register-format .xlsx generator (exceljs)
src/lib/plRules.js      ★ The calculation engine (all leave rules live here)
src/lib/printTemplate.js PDF/print statement template
src/App.jsx             Main UI: sidebar, header, autosave
src/components/         Toolbar (quick-entry buttons), Ledger table, Entry form
```

To change a rule (e.g., surrender default from 15 to another value, or the credit rate), edit `src/lib/plRules.js` — everything else follows automatically.
