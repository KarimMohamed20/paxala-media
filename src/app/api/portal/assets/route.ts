import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getActor, resolveTargetClientId } from "@/lib/content-authz";

// GET /api/portal/assets
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const actor = getActor(session);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const query = searchParams.get("query");

    const clientId = await resolveTargetClientId(
      actor,
      searchParams.get("clientId")
    );
    if (!clientId) {
      return NextResponse.json({ error: "Unknown client" }, { status: 400 });
    }

    // Find all projects belonging to this client. `slug` is included so the UI can
    // deep-link an asset's project without a second lookup.
    const userProjects = await db.project.findMany({
      where: { clientId },
      orderBy: { title: "asc" },
      select: { id: true, title: true, slug: true },
    });

    const projectIds = userProjects.map((p) => p.id);

    const filesWhere: Prisma.ProjectFileWhereInput = {
      projectId: { in: projectIds },
    };

    if (category && category !== "ALL") {
      filesWhere.category = category;
    }

    if (query) {
      filesWhere.name = { contains: query, mode: "insensitive" };
    }

    const files = await db.projectFile.findMany({
      where: filesWhere,
      orderBy: { createdAt: "desc" },
      include: {
        project: {
          select: { id: true, title: true, slug: true },
        },
        folderRef: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({ files, projects: userProjects });
  } catch (error) {
    console.error("Asset library GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch assets" },
      { status: 500 }
    );
  }
}
