const test = require('node:test');
const assert = require('node:assert');
const invoice = require('../lib/invoice');
const pricing = require('../lib/pricing');

// Synthetic orders only. Undefined gstRate models HSN-only stored lines;
// an explicit numeric gstRate models the separate invoice override branch.
// The #1001-style fixture intentionally uses the requested 5% / 12% mix,
// rather than reproducing historical database contents.
function item(id, name, price, qty, hsn, gstRate) {
  return { id, name, sku: 'TEST-' + id, price, qty, hsn, gstRate };
}

function totals(result) {
  const { subtotal, discount, tax, cgst, sgst, total } = result;
  return { subtotal, discount, tax, cgst, sgst, total };
}

const cases = [
  {
    name: 'CURRENT BEHAVIOUR: #1001-style HSN-only lines use 5% and 12% GST',
    order: {
      id: 1001,
      coupon: '',
      items: [item(1, 'Pulses', 165, 2, '0713'), item(2, 'Butter', 260, 1, '0405')]
    },
    invoice: { subtotal: 590, discount: 0, tax: 47.7, cgst: 23.85, sgst: 23.85, total: 637.7 },
    checkout: { subtotal: 590, discount: 0, tax: 47.7, cgst: 23.85, sgst: 23.85, total: 637.7 },
    invoiceRates: [5, 12], invoiceLineTaxes: [16.5, 31.2],
    checkoutRates: [5, 12], checkoutLineTaxes: [16.5, 31.2]
  },
  {
    name: 'CURRENT BEHAVIOUR: #1002-style SAVE10 discounts invoice subtotal before GST',
    order: {
      id: 1002,
      coupon: 'SAVE10',
      items: [item(1, 'Rice', 640, 1, '1006'), item(4, 'Sunflower oil', 190, 2, '1512')]
    },
    invoice: { subtotal: 1020, discount: 102, tax: 45.9, cgst: 22.95, sgst: 22.95, total: 963.9 },
    checkout: { subtotal: 1020, discount: 102, tax: 45.9, cgst: 22.95, sgst: 22.95, total: 963.9 },
    invoiceRates: [5, 5], invoiceLineTaxes: [28.8, 17.1],
    checkoutRates: [5, 5], checkoutLineTaxes: [28.8, 17.1]
  },
  {
    name: 'CURRENT BEHAVIOUR: #1004-style SAVE10 invoice respects the Rs 150 cap',
    order: {
      id: 1004,
      coupon: 'SAVE10',
      items: [item(5, 'Groundnut oil', 1120, 2, '1508')]
    },
    invoice: { subtotal: 2240, discount: 150, tax: 104.5, cgst: 52.25, sgst: 52.25, total: 2194.5 },
    checkout: { subtotal: 2240, discount: 150, tax: 104.5, cgst: 52.25, sgst: 52.25, total: 2194.5 },
    invoiceRates: [5], invoiceLineTaxes: [104.5],
    checkoutRates: [5], checkoutLineTaxes: [104.5]
  },
  {
    name: 'CURRENT BEHAVIOUR: #1008-style all-18% order without coupon matches checkout',
    order: {
      id: 1008,
      coupon: '',
      items: [item(8, 'Tea', 140, 1, '0902'), item(12, 'Concentrate', 180, 2, '2106')]
    },
    invoice: { subtotal: 500, discount: 0, tax: 90, cgst: 45, sgst: 45, total: 590 },
    checkout: { subtotal: 500, discount: 0, tax: 90, cgst: 45, sgst: 45, total: 590 },
    invoiceRates: [18, 18], invoiceLineTaxes: [25.2, 64.8],
    checkoutRates: [18, 18], checkoutLineTaxes: [25.2, 64.8]
  },
  {
    name: 'CURRENT BEHAVIOUR: explicit percentage gstRate values are honored without coupon',
    order: {
      coupon: '',
      items: [item(1, 'Pulses', 165, 2, '0713', 5), item(2, 'Butter', 260, 1, '0405', 12)]
    },
    invoice: { subtotal: 590, discount: 0, tax: 47.7, cgst: 23.85, sgst: 23.85, total: 637.7 },
    checkout: { subtotal: 590, discount: 0, tax: 47.7, cgst: 23.85, sgst: 23.85, total: 637.7 },
    invoiceRates: [5, 12], invoiceLineTaxes: [16.5, 31.2],
    checkoutRates: [5, 12], checkoutLineTaxes: [16.5, 31.2]
  }
];

test('invoice matches checkout totals and per-line GST after capped pre-tax discounts', () => {
  for (const { order } of cases) {
    const billed = pricing.computeTotals(order.items, order.coupon);
    const printed = invoice.computeInvoiceFigures(order);
    assert.deepStrictEqual(totals(printed), totals(billed), 'order ' + order.id);
    assert.deepStrictEqual(
      printed.rows.map(row => ({ gstPercent: row.gstPercent, tax: row.lineTax })),
      billed.lines.map(line => ({ gstPercent: line.gstPercent, tax: line.tax }))
    );
  }
});

for (const fixture of cases) {
  test(fixture.name, () => {
    const { order } = fixture;
    const actualInvoice = invoice.computeInvoiceFigures(order);
    const actualCheckout = pricing.computeTotals(order.items, order.coupon);

    // Literal expected values pin today's behavior, including discrepancies.
    assert.deepStrictEqual(totals(actualInvoice), fixture.invoice);
    assert.deepStrictEqual(totals(actualCheckout), fixture.checkout);
    assert.deepStrictEqual(actualInvoice.rows, order.items.map((line, index) => ({
      name: line.name,
      sku: line.sku,
      hsn: line.hsn,
      qty: line.qty,
      price: line.price,
      gstPercent: fixture.invoiceRates[index],
      line: line.price * line.qty,
      lineTax: fixture.invoiceLineTaxes[index]
    })));
    assert.deepStrictEqual(actualCheckout.lines.map(line => line.gstPercent), fixture.checkoutRates);
    assert.deepStrictEqual(actualCheckout.lines.map(line => line.tax), fixture.checkoutLineTaxes);
  });
}
