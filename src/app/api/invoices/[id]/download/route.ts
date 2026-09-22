import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { readFile } from "fs/promises";
import path from "path";
import fs from "fs";
import { INVOICE_STORAGE_PATH, invoiceFileName, renderInvoicePdf } from "@/lib/invoice";

// GET download invoice PDF
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        const invoice = await db.invoice.findUnique({
            where: { id },
            include: {
                project: true,
            },
        });

        if (!invoice) {
            return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
        }

        // Access control
        const userRole = session.user.role;
        const isAdminOrStaff = userRole === "ADMIN" || userRole === "STAFF";
        const isClient = invoice.project.clientId === session.user.id;

        if (!isAdminOrStaff && !isClient) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // The stored pdfUrl names the file; basename() keeps a malformed value
        // from reaching outside the invoices directory.
        let filePath = path.join(
            INVOICE_STORAGE_PATH,
            invoice.pdfUrl ? path.basename(invoice.pdfUrl) : invoiceFileName(invoice.number)
        );

        // SELF-HEALING. A missing PDF is re-rendered from the invoice's own row
        // — same number, date and amounts — instead of answering 404. This is
        // what recovers the invoices lost while storage lived inside the
        // container (every deploy deleted them), and ones whose PDF failed to
        // render when the invoice was created. The row is the record; the file
        // is only its rendering.
        if (!invoice.pdfUrl || !fs.existsSync(filePath)) {
            try {
                filePath = await renderInvoicePdf(invoice.id);
            } catch (error) {
                console.error(`Invoice ${invoice.id}: could not re-render missing PDF`, error);
                return NextResponse.json(
                    { error: "The invoice PDF could not be generated. Please try again." },
                    { status: 500 }
                );
            }
        }

        const fileBuffer = await readFile(filePath);

        return new NextResponse(fileBuffer, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="${invoice.number}.pdf"`,
            },
        });
    } catch (error) {
        console.error("Download invoice error:", error);
        return NextResponse.json(
            { error: "Failed to download invoice" },
            { status: 500 }
        );
    }
}
