const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();

async function main() {
  console.log("Seeding DAM assets and Folder models into PostgreSQL...");

  // Ensure demo projects
  let project = await db.project.findFirst();
  if (!project) {
    let clientUser = await db.user.findFirst({ where: { role: "CLIENT" } });
    if (!clientUser) {
      clientUser = await db.user.create({
        data: {
          username: "dokhi",
          name: "M. Dokhi",
          email: "dokhi@paxala.com",
          password: "hashedpassword",
          role: "CLIENT",
        },
      });
    }

    project = await db.project.create({
      data: {
        title: "New Collection Launch",
        slug: "new-collection-launch",
        description: "Visual identity, brand video production, and commercial media launch.",
        category: "VIDEO_PRODUCTION",
        status: "IN_PROGRESS",
        clientId: clientUser.id,
      },
    });
  }

  let project2 = await db.project.findFirst({ where: { id: { not: project.id } } });
  if (!project2) {
    project2 = await db.project.create({
      data: {
        title: "Brand Identity V2",
        slug: "brand-identity-v2",
        description: "Complete visual redesign and logo system.",
        category: "GRAPHIC_DESIGN",
        status: "IN_PROGRESS",
        clientId: project.clientId,
      },
    });
  }

  // Seed Folder models
  const initialFolders = [
    { name: "Brand Identity", slug: "brand-identity", color: "purple", isShared: false },
    { name: "Campaigns 2026", slug: "campaigns-2026", color: "red", isShared: true },
    { name: "Video Masters", slug: "video-masters", color: "blue", isShared: false },
    { name: "Photography", slug: "photography", color: "emerald", isShared: false },
    { name: "Website & Digital", slug: "website-digital", color: "amber", isShared: false },
    { name: "Documents", slug: "documents", color: "purple", isShared: false },
  ];

  const createdFolderMap = {};
  for (const f of initialFolders) {
    let dbFolder = await db.folder.findUnique({ where: { slug: f.slug } });
    if (!dbFolder) {
      dbFolder = await db.folder.create({
        data: {
          name: f.name,
          slug: f.slug,
          color: f.color,
          isShared: f.isShared,
          projectId: project.id,
        },
      });
      console.log(`Created DB Folder: ${f.name}`);
    } else {
      console.log(`Found existing DB Folder: ${f.name}`);
    }
    createdFolderMap[f.name] = dbFolder.id;
  }

  const seedFiles = [
    {
      name: "Brand_Film_Chapter2_FINAL.mp4",
      url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      type: "video",
      size: 2800000000,
      description: "4K Master Commercial Brand Film",
      category: "Video",
      folder: "Video Masters",
      folderId: createdFolderMap["Video Masters"],
      version: "V4 Final",
      status: "Approved Final",
      duration: "00:45",
      thumbnail: "https://images.unsplash.com/photo-1579165466741-7f35e4755660?q=80&w=800&auto=format&fit=crop",
      uploader: "PMP Creative Team",
      resolution: "4K MP4",
      usageRights: "Approved for web and social.",
      isShared: true,
      formats: [
        { name: "4K Master", resolution: "3840 x 2160 • MP4", size: "2.8 GB" },
        { name: "1080p", resolution: "1920 x 1080 • MP4", size: "650 MB" },
        { name: "9:16 Social", resolution: "1080 x 1920 • MP4", size: "420 MB" },
      ],
      versionHistory: [
        { version: "V4 Final", date: "20 Aug 2026", status: "Current" },
        { version: "V3 Approved", date: "18 Aug 2026", status: "Approved" },
        { version: "V2 Archived", date: "15 Aug 2026", status: "Archived" },
      ],
      projectId: project.id,
    },
    {
      name: "New_Collection_Hero_01.jpg",
      url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=1200&auto=format&fit=crop",
      type: "image",
      size: 18400000,
      description: "High Resolution Hero Commercial Photography",
      category: "Photography",
      folder: "Photography",
      folderId: createdFolderMap["Photography"],
      version: "V2",
      status: "Approved",
      duration: null,
      thumbnail: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=800&auto=format&fit=crop",
      uploader: "PMP Lead Photographer",
      resolution: "6000 x 4000 JPG",
      usageRights: "Approved for print and digital campaigns.",
      isShared: false,
      formats: [
        { name: "Original RAW/TIFF", resolution: "6000 x 4000", size: "45 MB" },
        { name: "Web High Res", resolution: "3840 x 2560", size: "18.4 MB" },
      ],
      versionHistory: [
        { version: "V2 Approved", date: "19 Aug 2026", status: "Current" },
        { version: "V1 Draft", date: "17 Aug 2026", status: "Archived" },
      ],
      projectId: project.id,
    },
    {
      name: "Campaign_Carousel_AR.zip",
      url: "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?q=80&w=1200&auto=format&fit=crop",
      type: "archive",
      size: 84000000,
      description: "Social media graphics package for Arabic campaign",
      category: "Design",
      folder: "Campaigns 2026",
      folderId: createdFolderMap["Campaigns 2026"],
      version: "V1",
      status: "Shared",
      duration: null,
      thumbnail: "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?q=80&w=800&auto=format&fit=crop",
      uploader: "PMP Design Lead",
      resolution: "Design Package ZIP",
      usageRights: "Approved for social media placement.",
      isShared: true,
      formats: [
        { name: "Full Package ZIP", resolution: "PSD + PNG Assets", size: "84 MB" },
      ],
      versionHistory: [
        { version: "V1 Shared", date: "18 Aug 2026", status: "Current" },
      ],
      projectId: project.id,
    },
    {
      name: "M_Dokhi_Brand_Guidelines.pdf",
      url: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?q=80&w=1200&auto=format&fit=crop",
      type: "pdf",
      size: 12600000,
      description: "Comprehensive Brand Identity Guidelines PDF",
      category: "Brand Files",
      folder: "Brand Identity",
      folderId: createdFolderMap["Brand Identity"],
      version: "V1 Final",
      status: "Approved",
      duration: null,
      thumbnail: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?q=80&w=800&auto=format&fit=crop",
      uploader: "PMP Brand Strategist",
      resolution: "PDF Document",
      usageRights: "Internal brand guide reference.",
      isShared: false,
      formats: [
        { name: "PDF Vector", resolution: "Print Ready PDF", size: "12.6 MB" },
      ],
      versionHistory: [
        { version: "V1 Final", date: "17 Aug 2026", status: "Current" },
      ],
      projectId: project2.id,
    },
    {
      name: "Showroom_Reel_9x16.mp4",
      url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      type: "video",
      size: 386000000,
      description: "Vertical Reel 9:16 video edit",
      category: "Video",
      folder: "Video Masters",
      folderId: createdFolderMap["Video Masters"],
      version: "V1",
      status: "New",
      duration: "00:30",
      thumbnail: "https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?q=80&w=800&auto=format&fit=crop",
      uploader: "PMP Video Editor",
      resolution: "1080 x 1920 MP4",
      usageRights: "Approved for Instagram Reel / TikTok.",
      isShared: false,
      formats: [
        { name: "Vertical Reel MP4", resolution: "1080 x 1920", size: "386 MB" },
      ],
      versionHistory: [
        { version: "V1 New", date: "16 Aug 2026", status: "Current" },
      ],
      projectId: project.id,
    },
    {
      name: "Website_Homepage_UI.fig",
      url: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?q=80&w=1200&auto=format&fit=crop",
      type: "design",
      size: 48000000,
      description: "Figma UI/UX master components file",
      category: "Web & Digital",
      folder: "Website & Digital",
      folderId: createdFolderMap["Website & Digital"],
      version: "V2 Approved",
      status: "Approved",
      duration: null,
      thumbnail: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?q=80&w=800&auto=format&fit=crop",
      uploader: "PMP UI/UX Designer",
      resolution: "Figma File",
      usageRights: "Approved for developer implementation.",
      isShared: true,
      formats: [
        { name: "Figma Export", resolution: "Interactive Prototype", size: "48 MB" },
      ],
      versionHistory: [
        { version: "V2 Approved", date: "15 Aug 2026", status: "Current" },
      ],
      projectId: project.id,
    },
    {
      name: "Product_Catalogue_Selects.zip",
      url: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=1200&auto=format&fit=crop",
      type: "archive",
      size: 1200000000,
      description: "Select product photography archive",
      category: "Photography",
      folder: "Photography",
      folderId: createdFolderMap["Photography"],
      version: "V3 Final",
      status: "Final",
      duration: null,
      thumbnail: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=800&auto=format&fit=crop",
      uploader: "PMP Photography Team",
      resolution: "High Res Photo Archive",
      usageRights: "Approved for catalogue print.",
      isShared: false,
      formats: [
        { name: "RAW Selects ZIP", resolution: "High Res TIFF", size: "1.2 GB" },
      ],
      versionHistory: [
        { version: "V3 Final", date: "14 Aug 2026", status: "Current" },
      ],
      projectId: project.id,
    },
    {
      name: "Logo_Package_2026.zip",
      url: "https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=1200&auto=format&fit=crop",
      type: "archive",
      size: 36000000,
      description: "Vector logo assets package (SVG, EPS, AI, PNG)",
      category: "Brand Files",
      folder: "Brand Identity",
      folderId: createdFolderMap["Brand Identity"],
      version: "V1",
      status: "Shared",
      duration: null,
      thumbnail: "https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=800&auto=format&fit=crop",
      uploader: "PMP Brand Designer",
      resolution: "Vector Logo Assets",
      usageRights: "Master logo vector assets.",
      isShared: true,
      formats: [
        { name: "Vector SVG/EPS", resolution: "Infinite Scale", size: "36 MB" },
      ],
      versionHistory: [
        { version: "V1 Shared", date: "13 Aug 2026", status: "Current" },
      ],
      projectId: project2.id,
    },
  ];

  for (const item of seedFiles) {
    const existing = await db.projectFile.findFirst({
      where: { name: item.name, projectId: item.projectId },
    });

    if (!existing) {
      await db.projectFile.create({ data: item });
      console.log(`Created DB File: ${item.name}`);
    } else {
      await db.projectFile.update({
        where: { id: existing.id },
        data: item,
      });
      console.log(`Updated DB File: ${item.name}`);
    }
  }

  console.log("Successfully seeded DAM Folder & File records!");
}

main()
  .catch((err) => {
    console.error("Error seeding DAM assets:", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
