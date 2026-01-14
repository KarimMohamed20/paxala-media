import { db as prisma } from "./db";
import { InvoiceTemplate } from "../components/pdf/InvoiceTemplate";
import { renderToStream } from "@react-pdf/renderer";
import { InvoiceStatus } from "@prisma/client";
import { writeFile } from "fs/promises";
import path from "path";
import fs from "fs";

// Ensure invoices directory exists in public folder for easy access or secure folder?
// For CLIENT access, it should probably be via a secure route that serves the file, 
// rather than a public URL if it contains sensitive info.
// However, the requirement says "Client can download invoice PDF from portal".
// We'll store it in a local directory `storage/invoices` and serve via API.
// For now, let's just save to disk.

const INVOICE_STORAGE_PATH = path.join(process.cwd(), "storage", "invoices");

// Ensure storage directory exists
if (!fs.existsSync(INVOICE_STORAGE_PATH)) {
    fs.mkdirSync(INVOICE_STORAGE_PATH, { recursive: true });
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
    const clientName = project.client?.name || project.clientName || "Client";
    // Assuming we have some way to get client address, otherwise empty
    const clientAddress = "";

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

    // Create Invoice Record
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

    // Generate PDF
    try {
        const stream = await renderToStream(
            InvoiceTemplate({
                invoiceNumber,
                issueDate: invoice.issueDate.toISOString().split("T")[0],
                clientName,
                clientAddress,
                items,
                subtotal,
                taxRate,
                taxAmount,
                total,
                currency: "ILS",
            })
        );

        const fileName = `${invoiceNumber}.pdf`;
        const filePath = path.join(INVOICE_STORAGE_PATH, fileName);

        // Convert stream to buffer manually or write stream to file
        // renderToStream returns a NodeJS.ReadableStream
        const writeStream = fs.createWriteStream(filePath);
        stream.pipe(writeStream);

        await new Promise((resolve, reject) => {
            writeStream.on("finish", resolve);
            writeStream.on("error", reject);
        });

        // Update Invoice with PDF URL (relative path for serving)
        // We will create a route /api/invoices/[id]/download to serve this.
        await prisma.invoice.update({
            where: { id: invoice.id },
            data: { pdfUrl: `/storage/invoices/${fileName}` },
        });

        return invoice;

    } catch (error) {
        console.error("Error generating invoice PDF:", error);
        // Should we delete the invoice record if PDF fails? 
        // Maybe keep it but mark as DRAFT?
        throw error;
    }
}
