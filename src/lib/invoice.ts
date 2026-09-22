import { db as prisma } from "./db";
import { InvoiceTemplate } from "../components/pdf/InvoiceTemplate";
import { renderToBuffer } from "@react-pdf/renderer";
import { mkdir, rename, writeFile } from "fs/promises";
import path from "path";

/**
 * Invoices: the database row is the record, the PDF is a rendering of it.
 *
 * That distinction is the whole design. A PDF on disk can be lost — until
 * storage was persisted, every deploy recreated the container and deleted
 * every invoice PDF written inside it — but the row keeps everything the PDF
 * shows: number, issue date, currency, line items and amounts. So a missing
 * PDF is re-rendered FROM THE ROW on demand (see the download route), and the
 * result is the same document that was issued.
 *
 * Rendering reads the row's stored amounts, never the milestone's current
 * price. An invoice records what was billed; if a milestone is repriced
 * later, re-rendering an old invoice must not quietly change what it says.
 *
 * Files live in `storage/invoices` and are served only through the
 * authorised download route, never as public URLs — they carry client names
 * and amounts.
 */

export const INVOICE_STORAGE_PATH = path.join(process.cwd(), "storage", "invoices");

type InvoiceItem = {
    description: string;
    quantity: number;
    price: number;
    total: number;
};

/**
 * The file name for an invoice number. Numbers are server-generated
 * (INV-YYYY-NNNN), but this string becomes a filesystem path, so anything
 * outside a conservative set is replaced rather than trusted.
 */
export function invoiceFileName(number: string): string {
    return `${number.replace(/[^A-Za-z0-9._-]/g, "_")}.pdf`;
}

/** The URL stored on the row; the download route maps it back to a file. */
export function invoicePdfUrl(number: string): string {
    return `/storage/invoices/${invoiceFileName(number)}`;
}

/**
 * Line items from the row's JSON column. Written by this module, but read
 * defensively: a malformed entry is dropped rather than crashing a render a
 * client is waiting on.
 */
export function parseInvoiceItems(value: unknown): InvoiceItem[] {
    if (!Array.isArray(value)) return [];
    return value.flatMap((entry) => {
        if (typeof entry !== "object" || entry === null) return [];
        const item = entry as Record<string, unknown>;
        const description = typeof item.description === "string" ? item.description : "";
        const quantity = Number(item.quantity);
        const price = Number(item.price);
        const total = Number(item.total);
        if (!description || ![quantity, price, total].every(Number.isFinite)) return [];
        return [{ description, quantity, price, total }];
    });
}

/** The fields of an invoice row that a PDF shows. Decimals arrive as objects. */
export type InvoiceRow = {
    number: string;
    issueDate: Date;
    dueDate: Date | null;
    currency: string;
    language: string;
    subtotal: unknown;
    taxRate: unknown;
    taxAmount: unknown;
    total: unknown;
    items: unknown;
};

function isoDate(date: Date): string {
    return date.toISOString().split("T")[0];
}

/**
 * Template props for an invoice — pure, built from the ROW alone plus the
 * client's display name. Prisma returns Decimal objects for money columns;
 * Number() goes through their string form, which is exact for two decimals.
 */
export function invoicePdfProps(
    invoice: InvoiceRow,
    client: { name: string; address: string }
): Parameters<typeof InvoiceTemplate>[0] {
    return {
        invoiceNumber: invoice.number,
        issueDate: isoDate(invoice.issueDate),
        ...(invoice.dueDate ? { dueDate: isoDate(invoice.dueDate) } : {}),
        clientName: client.name,
        clientAddress: client.address,
        items: parseInvoiceItems(invoice.items),
        subtotal: Number(invoice.subtotal),
        taxRate: Number(invoice.taxRate),
        taxAmount: Number(invoice.taxAmount),
        total: Number(invoice.total),
        currency: invoice.currency,
        language: invoice.language,
    };
}

/** Render an invoice's PDF to memory. Pure apart from the renderer itself. */
export async function buildInvoicePdf(
    props: Parameters<typeof InvoiceTemplate>[0]
): Promise<Buffer> {
    return renderToBuffer(InvoiceTemplate(props));
}

/**
 * Render and store the PDF for an EXISTING invoice, returning its path.
 *
 * Used when an invoice is created and again whenever its PDF is missing.
 * Idempotent: the same row always renders the same document.
 *
 * Written to a temporary file and renamed into place. A crash mid-write
 * would otherwise leave a truncated PDF that the download route — which
 * only checks that the file exists — would go on serving as if it were fine.
 * The rename is atomic on one filesystem, so two concurrent renders of the
 * same invoice each leave a complete file.
 */
export async function renderInvoicePdf(invoiceId: string): Promise<string> {
    const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: { project: { include: { client: true } } },
    });
    if (!invoice) throw new Error(`Invoice ${invoiceId} not found`);

    const clientName =
        invoice.project.client?.name || invoice.project.clientName || "Client";
    const buffer = await buildInvoicePdf(
        invoicePdfProps(invoice, { name: clientName, address: "" })
    );

    // Created lazily, at the moment of writing — not at module load, where a
    // non-writable directory used to throw during import and take down every
    // route that merely imported this file, including milestone payments.
    await mkdir(INVOICE_STORAGE_PATH, { recursive: true });
    const filePath = path.join(INVOICE_STORAGE_PATH, invoiceFileName(invoice.number));
    const temporary = `${filePath}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(temporary, buffer);
    await rename(temporary, filePath);

    const pdfUrl = invoicePdfUrl(invoice.number);
    if (invoice.pdfUrl !== pdfUrl) {
        await prisma.invoice.update({ where: { id: invoice.id }, data: { pdfUrl } });
    }
    return filePath;
}

export async function generateInvoiceForMilestone(milestoneId: string) {
    const milestone = await prisma.milestone.findUnique({
        where: { id: milestoneId },
        include: {
            project: {
                include: {
                    client: true, // To get client details
                },
            },
        },
    });

    if (!milestone || !milestone.price) {
        throw new Error("Milestone not found or has no price");
    }

    const project = milestone.project;

    // Generate Invoice Number
    // Format: INV-{YEAR}-{SEQUENCE}
    const year = new Date().getFullYear();
    const count = await prisma.invoice.count({
        where: {
            number: {
                startsWith: `INV-${year}-`,
            },
        },
    });
    const sequence = (count + 1).toString().padStart(4, "0");
    const invoiceNumber = `INV-${year}-${sequence}`;

    const subtotal = Number(milestone.price);
    const taxRate = 0; // Default 0 for now, can be configurable later
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;

    const items = [
        {
            description: `Milestone: ${milestone.title}`,
            quantity: 1,
            price: subtotal,
            total: subtotal,
        },
    ];

    // Create Invoice Record — the record of what was billed.
    const invoice = await prisma.invoice.create({
        data: {
            number: invoiceNumber,
            status: "ISSUED", // Automatically issued
            issueDate: new Date(),
            subtotal,
            taxRate,
            taxAmount,
            total,
            projectId: project.id,
            milestoneId: milestone.id,
            items: items, // Json
            currency: "ILS",
        },
    });

    // Then its rendering. If this throws, the row stands and the PDF is
    // re-rendered from it the first time anyone downloads it.
    try {
        await renderInvoicePdf(invoice.id);
    } catch (error) {
        console.error("Error generating invoice PDF:", error);
        throw error;
    }

    return invoice;
}
