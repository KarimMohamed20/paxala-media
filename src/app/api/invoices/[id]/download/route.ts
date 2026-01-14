import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { readFile } from "fs/promises";
import path from "path";
import fs from "fs";

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

        if (!invoice.pdfUrl) {
            return NextResponse.json(
                { error: "PDF not generated yet" },
                { status: 404 }
            );
        }

        // pdfUrl is stored as relative path: /storage/invoices/filename.pdf
        // But we need to map it to the actual file system path
        // Assuming pdfUrl starts with /storage/invoices/
        const filename = path.basename(invoice.pdfUrl);
        const filePath = path.join(process.cwd(), "storage", "invoices", filename);

        if (!fs.existsSync(filePath)) {
            return NextResponse.json(
                { error: "File not found on server" },
                { status: 404 }
            );
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
