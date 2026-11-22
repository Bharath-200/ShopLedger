# ShopLedger

## Stack
- Node.js with CommonJS modules; Express 4 and body-parser 1.
- Plain HTML, CSS and browser JavaScript in `public/`.
- `lib/store.js` synchronously reads and rewrites `data/db.json`.
- `server.js` serves static files, mounts routers at `/api`, and serves printable invoices.
- `config.js` defines shop details, port, admin key, coupons and GST slabs.

## Module map
- `routes/customers.js`: lists customer accounts and records Khata settlements.
- `routes/orders.js`: lists, retrieves, creates and cancels orders.
- `routes/products.js`: lists products with stock/GST details and active coupons.
- `routes/reports.js`: dashboard, GST reconciliation, pricing preview and keyed database export.
- `lib/coupons.js`: normalizes, validates and lists coupons; computes discounts.
- `lib/dates.js`: local date formatting, date-key normalization and fiscal-year labels.
- `lib/inventory.js`: product lookup, sellable-stock checks, stock deductions, release and summaries.
- `lib/invoice.js`: independently calculates invoice figures and renders printable HTML.
- `lib/ledger.js`: customer lookup, balances, credit charges, reversals and settlements.
- `lib/orders.js`: creates, retrieves, filters and cancels orders in the supplied database object.
- `lib/pricing.js`: subtotal, coupon allocation and per-line post-discount GST totals.
- `lib/reports.js`: dashboard summaries and stored-order versus invoice reconciliation.
- `lib/store.js`: JSON database read/write, structure defaults and audit-log recording.
- `lib/tax.js`: item GST-rate resolution, slab percentages and CGST/SGST splitting.

## Commands
- Start the app: `node server.js` (the command behind `npm start`).
- Run tests with Node's built-in runner: `node --test`.
- No project test files currently exist; `npm test` is a placeholder that exits with failure.

## Rules
1. Write characterization tests before changing behaviour.
2. Change only the module(s) the ticket is about.
3. Tests never read or write `data/db.json`; use in-memory data.
4. Add no dependencies.
5. Make the smallest fix that works.

## Current ticket
- Invoice total and GST breakdown do not match what the customer was billed.
- Allowed files: `lib/invoice.js`; `lib/tax.js` only if truly needed.
- Checkout uses `lib/pricing.js` to apply coupons before per-item GST.
- Invoice calculations currently use separate GST and coupon logic in `lib/invoice.js`.
