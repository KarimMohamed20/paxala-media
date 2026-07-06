import { db } from "@/lib/db";
import { sendLeadCreatedNotification } from "@/lib/email/service";

interface AutoLeadInput {
  clientName: string;
  email: string;
  phone?: string | null;
  interestedIn?: string | null;
  notes?: string | null;
}

/**
 * Create a Lead (stage NEW, source WEBSITE) from an incoming contact
 * inquiry or booking, unless a lead with that email already exists.
 * Never throws — lead creation must not break the public form flow.
 */
export async function autoCreateLeadFromWebsite(input: AutoLeadInput) {
  try {
    const existing = await db.lead.findFirst({
      where: { email: { equals: input.email, mode: "insensitive" } },
      select: { id: true },
    });
    if (existing) return null;

    const lead = await db.lead.create({
      data: {
        clientName: input.clientName,
        email: input.email,
        phone: input.phone || null,
        interestedIn: input.interestedIn || null,
        notes: input.notes || null,
        source: "WEBSITE",
        stage: "NEW",
      },
    });

    await sendLeadCreatedNotification({
      clientName: lead.clientName,
      email: lead.email,
      phone: lead.phone,
      source: lead.source,
      interestedIn: lead.interestedIn,
    });

    return lead;
  } catch (error) {
    console.error("Auto-create lead failed:", error);
    return null;
  }
}
