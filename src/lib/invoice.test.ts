import { describe, expect, it } from "vitest";
import {
  buildInvoicePdf,
  invoiceFileName,
  invoicePdfProps,
  invoicePdfUrl,
  parseInvoiceItems,
  type InvoiceRow,
} from "./invoice";

/**
 * The invoice rendering contract that self-healing depends on: a PDF rebuilt
 * from a stored row must say exactly what the row recorded — the amounts
 * that were billed, the date it was issued — never anything recomputed.
 */

/** Prisma returns Decimal objects for money columns; this mimics one. */
function decimal(value: string) {
  return { toString: () => value, valueOf: () => value };
}

function row(overrides: Partial<InvoiceRow> = {}): InvoiceRow {
  return {
    number: "INV-2026-0042",
    issueDate: new Date("2026-03-15T10:30:00Z"),
    dueDate: null,
    currency: "ILS",
    language: "en",
    subtotal: decimal("1500.00"),
    taxRate: decimal("0.00"),
    taxAmount: decimal("0.00"),
    total: decimal("1500.00"),
    items: [{ description: "Milestone: Launch video", quantity: 1, price: 1500, total: 1500 }],
    ...overrides,
  };
}

describe("invoiceFileName", () => {
  it("names the file after the invoice number", () => {
    expect(invoiceFileName("INV-2026-0042")).toBe("INV-2026-0042.pdf");
    expect(invoicePdfUrl("INV-2026-0042")).toBe("/storage/invoices/INV-2026-0042.pdf");
  });

  it("can never produce a path that leaves the invoices directory", () => {
    const name = invoiceFileName("../../etc/passwd");
    expect(name).not.toContain("/");
    expect(name.endsWith(".pdf")).toBe(true);
  });
});

describe("parseInvoiceItems", () => {
  it("reads well-formed line items", () => {
    expect(parseInvoiceItems(row().items)).toEqual([
      { description: "Milestone: Launch video", quantity: 1, price: 1500, total: 1500 },
    ]);
  });

  it("drops malformed entries instead of failing the render", () => {
    expect(
      parseInvoiceItems([
        { description: "", quantity: 1, price: 1, total: 1 },
        { description: "No amounts" },
        "not an object",
        { description: "Kept", quantity: "2", price: "10", total: "20" },
      ])
    ).toEqual([{ description: "Kept", quantity: 2, price: 10, total: 20 }]);
    expect(parseInvoiceItems(null)).toEqual([]);
    expect(parseInvoiceItems({ not: "an array" })).toEqual([]);
  });
});

describe("invoicePdfProps", () => {
  it("renders the amounts the ROW recorded", () => {
    // A re-rendered invoice must match what was billed, even if the
    // milestone has since been repriced.
    const props = invoicePdfProps(
      row({ subtotal: decimal("1234.56"), total: decimal("1234.56") }),
      { name: "Acme", address: "" }
    );
    expect(props.subtotal).toBe(1234.56);
    expect(props.total).toBe(1234.56);
    expect(props.invoiceNumber).toBe("INV-2026-0042");
  });

  it("uses the original issue date, not today", () => {
    expect(invoicePdfProps(row(), { name: "Acme", address: "" }).issueDate).toBe(
      "2026-03-15"
    );
  });

  it("carries currency, language and a due date only when there is one", () => {
    const without = invoicePdfProps(row(), { name: "Acme", address: "" });
    expect(without).not.toHaveProperty("dueDate");
    expect(without.currency).toBe("ILS");
    expect(without.language).toBe("en");

    const withDue = invoicePdfProps(row({ dueDate: new Date("2026-04-15T00:00:00Z") }), {
      name: "Acme",
      address: "",
    });
    expect(withDue.dueDate).toBe("2026-04-15");
  });
});

describe("buildInvoicePdf", () => {
  it("produces a real PDF from row data alone", async () => {
    // The whole self-healing path minus the database: row -> props -> PDF.
    const pdf = await buildInvoicePdf(invoicePdfProps(row(), { name: "Acme", address: "" }));
    expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(1000);
  }, 20_000);
});
