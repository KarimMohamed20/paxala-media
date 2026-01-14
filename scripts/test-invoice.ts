import { db } from "../src/lib/db";
import { generateInvoiceForMilestone } from "../src/lib/invoice";
import fs from "fs";
import path from "path";

async function main() {
    console.log("Starting Invoice Verification...");

    // 1. Create a dummy User (Startups/Clients usually exist, but let's create one if needed or use existing)
    // Let's create a temp user for safety
    const user = await db.user.create({
        data: {
            username: `testuser-${Date.now()}`,
            email: `test-${Date.now()}@example.com`,
            password: "password",
            name: "Test Client",
            role: "CLIENT",
        },
    });
    console.log("Created User:", user.id);

    // 2. Create a dummy Project
    const project = await db.project.create({
        data: {
            title: "Test Invoice Project",
            slug: `test-invoice-project-${Date.now()}`,
            description: "Test Description",
            category: "WEB_DEVELOPMENT",
            clientId: user.id,
        },
    });
    console.log("Created Project:", project.id);

    // 3. Create a dummy Milestone
    const milestone = await db.milestone.create({
        data: {
            title: "Test Milestone",
            order: 1,
            price: 1000,
            paymentStatus: "UNPAID",
            projectId: project.id,
        },
    });
    console.log("Created Milestone:", milestone.id);

    // 4. Trigger Invoice Generation
    console.log("Triggering Invoice Generation...");
    const invoice = await generateInvoiceForMilestone(milestone.id);
    console.log("Invoice Created:", invoice.number);

    // 5. Verify Invoice Record
    const savedInvoice = await db.invoice.findUnique({
        where: { id: invoice.id },
    });

    if (!savedInvoice) throw new Error("Invoice record not found!");
    if (savedInvoice.status !== "ISSUED") throw new Error("Invoice status incorrect");
    console.log("Invoice Verified in DB");

    // 6. Verify PDF File
    if (!savedInvoice.pdfUrl) throw new Error("Invoice PDF URL missing");
    // Adjust path logic: pdfUrl is /storage/invoices/..., relative to web root?
    // In `invoice.ts`, we saved it to `storage/invoices` in process.cwd()
    // and set pdfUrl to `/storage/invoices/...`
    const filename = path.basename(savedInvoice.pdfUrl);
    const filePath = path.join(process.cwd(), "storage", "invoices", filename);

    if (fs.existsSync(filePath)) {
        console.log("PDF File Exists at:", filePath);
        const stats = fs.statSync(filePath);
        console.log("PDF Size:", stats.size, "bytes");
    } else {
        throw new Error(`PDF File missing at ${filePath}`);
    }

    // Clean up
    await db.invoice.delete({ where: { id: invoice.id } });
    await db.milestone.delete({ where: { id: milestone.id } });
    await db.project.delete({ where: { id: project.id } });
    await db.user.delete({ where: { id: user.id } });

    // Optional: delete file?
    // fs.unlinkSync(filePath);

    console.log("Verification Successful! Cleanup done.");
}

main()
    .catch((e) => {
        console.error("Verification Failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await db.$disconnect();
    });
