import { PrismaClient, Role, TeamType, ProjectCategory, ProjectStatus, BookingStatus, BlogCategory } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...\n");

  // ==================== USERS ====================
  console.log("👤 Creating users...");

  const adminPassword = await bcrypt.hash("admin123", 12);
  const staffPassword = await bcrypt.hash("staff123", 12);
  const clientPassword = await bcrypt.hash("client123", 12);

  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      email: "admin@paxalamedia.com",
      name: "Ahmed Hajuj",
      password: adminPassword,
      role: Role.ADMIN,
      image: "/images/team/Ahmed Hajuj.png",
    },
  });

  const staff1 = await prisma.user.upsert({
    where: { username: "karim" },
    update: {},
    create: {
      username: "karim",
      email: "karim@paxalamedia.com",
      name: "Karim Mohamed",
      password: staffPassword,
      role: Role.STAFF,
      image: "/images/team/Karim Mohamed.jpg",
      managerId: admin.id,
    },
  });

  const staff2 = await prisma.user.upsert({
    where: { username: "ahmed.khalil" },
    update: {},
    create: {
      username: "ahmed.khalil",
      email: "ahmed.khalil@paxalamedia.com",
      name: "Ahmed Khalil",
      password: staffPassword,
      role: Role.STAFF,
      image: "/images/team/Ahmed Khalil.png",
      managerId: admin.id,
    },
  });

  const staff3 = await prisma.user.upsert({
    where: { username: "mustafa" },
    update: {},
    create: {
      username: "mustafa",
      email: "mustafa@paxalamedia.com",
      name: "Mustafa Khalil",
      password: staffPassword,
      role: Role.STAFF,
      image: "/images/team/Mustafa Khalil.png",
      managerId: admin.id,
    },
  });

  const client1 = await prisma.user.upsert({
    where: { username: "roma" },
    update: {},
    create: {
      username: "roma",
      email: "roma@example.com",
      name: "Roma Restaurant",
      password: clientPassword,
      role: Role.CLIENT,
    },
  });

  const client2 = await prisma.user.upsert({
    where: { username: "client" },
    update: {},
    create: {
      username: "client",
      email: "client@example.com",
      name: "Demo Client",
      password: clientPassword,
      role: Role.CLIENT,
    },
  });

  console.log("   ✅ Users created\n");

  // ==================== TEAM MEMBERS ====================
  console.log("👥 Creating team members...");

  const teamMembers = [
    // Production Team
    {
      name: "Ahmed Hajuj",
      role: "Founder",
      bio: "Founder of Paxala Media Production with extensive experience in photography and videography.",
      image: "/images/team/Ahmed Hajuj.png",
      team: TeamType.PRODUCTION,
      order: 1,
      skills: ["Photographer", "Videographer"],
      social: { instagram: "https://instagram.com/ahmedhajuj" },
    },
    {
      name: "Basel Hajuj",
      role: "Photographer",
      bio: "Professional photographer and videographer specializing in commercial and event photography.",
      image: "/images/team/Basel Hajuj.png",
      team: TeamType.PRODUCTION,
      order: 2,
      skills: ["Photographer", "Videographer"],
      social: { instagram: "https://instagram.com/baselhajuj" },
    },
    {
      name: "Ahmed Khalil",
      role: "Drone Specialist",
      bio: "Expert drone pilot and FPV specialist with years of aerial cinematography experience.",
      image: "/images/team/Ahmed Khalil.png",
      team: TeamType.PRODUCTION,
      order: 3,
      skills: ["Drone Pilot/FPV", "Videographer", "Photographer"],
      social: { instagram: "https://instagram.com/ahmedkhalil" },
    },
    {
      name: "Ahmed Hassan",
      role: "Video Editor",
      bio: "Creative video editor specializing in color grading and motion graphics.",
      image: "/images/team/Ahmed Hassan.jpeg",
      team: TeamType.PRODUCTION,
      order: 4,
      skills: ["Video Editing", "Color Grading", "Motion Graphics"],
      social: { instagram: "https://instagram.com/ahmedhassan" },
    },
    // IT/Dev Team
    {
      name: "Karim Mohamed",
      role: "Developer",
      bio: "Full stack developer specializing in modern web applications and cloud architecture.",
      image: "/images/team/Karim Mohamed.jpg",
      team: TeamType.IT_DEV,
      order: 1,
      skills: ["Full Stack Development", "Web Applications"],
      social: { linkedin: "https://linkedin.com/in/karimmohamed" },
    },
    {
      name: "Mustafa Khalil",
      role: "Developer",
      bio: "Full stack developer with expertise in building scalable web applications.",
      image: "/images/team/Mustafa Khalil.png",
      team: TeamType.IT_DEV,
      order: 2,
      skills: ["Full Stack Development", "Web Applications"],
      social: { linkedin: "https://linkedin.com/in/mustafakhalil" },
    },
    {
      name: "Mahmoud Khalil",
      role: "Developer",
      bio: "Mobile and full stack developer specializing in cross-platform applications.",
      image: "/images/team/Mahmoud Khalil.png",
      team: TeamType.IT_DEV,
      order: 3,
      skills: ["Full Stack Development", "Mobile Apps"],
      social: { linkedin: "https://linkedin.com/in/mahmoudkhalil" },
    },
  ];

  for (const member of teamMembers) {
    await prisma.teamMember.upsert({
      where: { id: `team-${member.name.toLowerCase().replace(/\s+/g, "-")}` },
      update: member,
      create: {
        id: `team-${member.name.toLowerCase().replace(/\s+/g, "-")}`,
        ...member,
      },
    });
  }

  console.log("   ✅ Team members created\n");

  // ==================== SERVICES ====================
  console.log("🛠️  Creating services...");

  const services = [
    {
      name: "Video Production",
      slug: "video-production",
      description: "Professional video production services including commercials, corporate videos, documentaries, and social media content.",
      icon: "Video",
      features: ["Commercial Production", "Corporate Videos", "Event Coverage", "Drone Footage", "Post-Production"],
      order: 1,
    },
    {
      name: "Photography",
      slug: "photography",
      description: "High-quality photography services for products, portraits, events, and commercial purposes.",
      icon: "Camera",
      features: ["Product Photography", "Portrait Sessions", "Event Photography", "Commercial Shoots", "Photo Editing"],
      order: 2,
    },
    {
      name: "Graphic Design",
      slug: "graphic-design",
      description: "Creative graphic design solutions including branding, marketing materials, and digital assets.",
      icon: "Palette",
      features: ["Brand Identity", "Logo Design", "Marketing Materials", "Social Media Graphics", "Print Design"],
      order: 3,
    },
    {
      name: "3D Modeling",
      slug: "3d-modeling",
      description: "Professional 3D modeling and visualization for products, architecture, and animations.",
      icon: "Box",
      features: ["Product Visualization", "Architectural Rendering", "Character Modeling", "Animation", "VFX"],
      order: 4,
    },
    {
      name: "Web Development",
      slug: "web-development",
      description: "Custom website development with modern technologies for businesses of all sizes.",
      icon: "Code",
      features: ["Custom Websites", "E-commerce Solutions", "CMS Development", "Web Applications", "SEO Optimization"],
      order: 5,
    },
    {
      name: "App Development",
      slug: "app-development",
      description: "Mobile and web application development for iOS, Android, and cross-platform solutions.",
      icon: "Smartphone",
      features: ["iOS Development", "Android Development", "Cross-Platform Apps", "UI/UX Design", "App Maintenance"],
      order: 6,
    },
    {
      name: "Social Media",
      slug: "social-media",
      description: "Comprehensive social media management and campaign strategies to grow your brand online.",
      icon: "Share2",
      features: ["Content Strategy", "Campaign Management", "Content Creation", "Analytics & Reporting", "Community Management"],
      order: 7,
    },
    {
      name: "Concept & Strategy",
      slug: "concept-strategy",
      description: "Strategic creative consulting to help brands develop compelling concepts and campaigns.",
      icon: "Lightbulb",
      features: ["Brand Strategy", "Creative Direction", "Campaign Planning", "Market Research", "Content Strategy"],
      order: 8,
    },
  ];

  for (const service of services) {
    await prisma.service.upsert({
      where: { slug: service.slug },
      update: service,
      create: service,
    });
  }

  console.log("   ✅ Services created\n");

  // ==================== PROJECTS ====================
  console.log("📁 Creating projects...");

  const videoService = await prisma.service.findUnique({ where: { slug: "video-production" } });
  const photoService = await prisma.service.findUnique({ where: { slug: "photography" } });
  const webService = await prisma.service.findUnique({ where: { slug: "web-development" } });
  const socialService = await prisma.service.findUnique({ where: { slug: "social-media" } });

  const projects = [
    {
      title: "Roma Restaurant Brand 360 Campaign",
      slug: "roma-restaurant-brand-360",
      description: "Complete Brand 360 Package including video content, photography, social media management, and paid advertising for Roma Restaurant.",
      content: "A comprehensive 360° marketing campaign that elevated Roma Restaurant's brand presence across all digital platforms. This ongoing retainer includes monthly video reels, professional photography sessions, social media management, and paid ads optimization.",
      category: ProjectCategory.VIDEO_PRODUCTION,
      tags: ["Restaurant", "Brand 360", "Social Media", "Package 01"],
      clientName: "Roma Restaurant",
      clientId: client1.id,
      serviceId: videoService?.id,
      status: ProjectStatus.IN_PROGRESS,
      featured: true,
      thumbnail: "/images/portfolio/roma-thumbnail.jpg",
      startDate: new Date("2024-01-01"),
    },
    {
      title: "Corporate Event Coverage - Tech Summit 2024",
      slug: "tech-summit-2024-coverage",
      description: "Professional event coverage for annual Tech Summit including photography, videography, and drone footage.",
      content: "Full event documentation with same-day highlights reel and comprehensive post-event deliverables including edited photos and video content.",
      category: ProjectCategory.PHOTOGRAPHY,
      tags: ["Corporate", "Event", "Photography", "Drone"],
      clientName: "Tech Corp",
      serviceId: photoService?.id,
      status: ProjectStatus.COMPLETED,
      featured: true,
      thumbnail: "/images/portfolio/techsummit-thumbnail.jpg",
      startDate: new Date("2024-03-15"),
      endDate: new Date("2024-03-17"),
    },
    {
      title: "E-commerce Platform - Fashion Hub",
      slug: "fashion-hub-ecommerce",
      description: "Custom e-commerce website with inventory management, payment integration, and mobile-responsive design.",
      content: "Built a scalable e-commerce platform using Next.js with seamless user experience, integrated payment gateways, and admin dashboard for inventory management.",
      category: ProjectCategory.WEB_DEVELOPMENT,
      tags: ["E-commerce", "Web Development", "UI/UX", "Next.js"],
      clientName: "Fashion Hub",
      clientId: client2.id,
      serviceId: webService?.id,
      status: ProjectStatus.COMPLETED,
      featured: true,
      thumbnail: "/images/portfolio/fashionhub-thumbnail.jpg",
      startDate: new Date("2024-02-01"),
      endDate: new Date("2024-04-30"),
    },
    {
      title: "Luxury Watch Product Photography",
      slug: "luxury-watch-photography",
      description: "High-end product photography for luxury watch brand catalog and marketing materials.",
      content: "Professional studio photography showcasing luxury timepieces with meticulous attention to detail, lighting, and composition for both print and digital use.",
      category: ProjectCategory.PHOTOGRAPHY,
      tags: ["Product", "Luxury", "Catalog", "Studio"],
      clientName: "Chrono Luxury",
      serviceId: photoService?.id,
      status: ProjectStatus.COMPLETED,
      featured: false,
      thumbnail: "/images/portfolio/watches-thumbnail.jpg",
      startDate: new Date("2024-05-01"),
      endDate: new Date("2024-05-15"),
    },
    {
      title: "Restaurant Menu Redesign",
      slug: "gourmet-kitchen-menu",
      description: "Complete menu redesign with food photography and modern graphic design.",
      content: "Modern menu design combining appetizing food photography with elegant typography and brand-consistent design elements.",
      category: ProjectCategory.GRAPHIC_DESIGN,
      tags: ["Restaurant", "Menu", "Design", "Photography"],
      clientName: "Gourmet Kitchen",
      status: ProjectStatus.COMPLETED,
      featured: false,
      thumbnail: "/images/portfolio/menu-thumbnail.jpg",
      startDate: new Date("2024-04-01"),
      endDate: new Date("2024-04-20"),
    },
    {
      title: "Real Estate Drone Showcase",
      slug: "skyview-properties-drone",
      description: "Aerial photography and videography for luxury real estate listings.",
      content: "Comprehensive drone coverage of premium properties including aerial tours, cinematic videos, and high-resolution photography for marketing materials.",
      category: ProjectCategory.VIDEO_PRODUCTION,
      tags: ["Real Estate", "Drone", "Aerial", "Video"],
      clientName: "Skyview Properties",
      serviceId: videoService?.id,
      status: ProjectStatus.COMPLETED,
      featured: true,
      thumbnail: "/images/portfolio/realestate-thumbnail.jpg",
      startDate: new Date("2024-06-01"),
      endDate: new Date("2024-06-10"),
    },
    {
      title: "Social Media Campaign - Fitness Brand",
      slug: "fitlife-social-campaign",
      description: "3-month social media campaign including content creation, community management, and paid advertising.",
      content: "Comprehensive social media strategy with daily content, influencer collaborations, and targeted ad campaigns resulting in 200% follower growth.",
      category: ProjectCategory.SOCIAL_MEDIA,
      tags: ["Social Media", "Fitness", "Campaign", "Ads"],
      clientName: "FitLife Gym",
      serviceId: socialService?.id,
      status: ProjectStatus.IN_PROGRESS,
      featured: false,
      thumbnail: "/images/portfolio/fitlife-thumbnail.jpg",
      startDate: new Date("2024-10-01"),
    },
  ];

  for (const project of projects) {
    const created = await prisma.project.upsert({
      where: { slug: project.slug },
      update: project,
      create: project,
    });

    // Create milestones for in-progress projects
    if (project.status === ProjectStatus.IN_PROGRESS) {
      const milestones = [
        { title: "Project Kickoff", description: "Initial meeting and requirements gathering", order: 1, price: 0 },
        { title: "Content Creation", description: "Creating video and photo content", order: 2, price: 3000 },
        { title: "Review & Revisions", description: "Client review and feedback implementation", order: 3, price: 2000 },
        { title: "Final Delivery", description: "Delivering final assets and documentation", order: 4, price: 5000 },
      ];

      for (const milestone of milestones) {
        await prisma.milestone.upsert({
          where: { id: `${created.id}-milestone-${milestone.order}` },
          update: {},
          create: {
            id: `${created.id}-milestone-${milestone.order}`,
            ...milestone,
            projectId: created.id,
            paymentStatus: milestone.order === 1 ? "PAID" : "UNPAID",
          },
        });
      }
    }
  }

  console.log("   ✅ Projects created\n");

  // ==================== CLIENT LOGOS ====================
  console.log("🏢 Creating client logos...");

  const clientLogos = [
    { name: "Roma Restaurant", logo: "/images/clients/roma.png", website: "https://roma-restaurant.com", order: 1 },
    { name: "Tech Corp", logo: "/images/clients/techcorp.png", website: "https://techcorp.com", order: 2 },
    { name: "Fashion Hub", logo: "/images/clients/fashionhub.png", website: "https://fashionhub.com", order: 3 },
    { name: "Chrono Luxury", logo: "/images/clients/chronoluxury.png", website: "https://chronoluxury.com", order: 4 },
    { name: "Gourmet Kitchen", logo: "/images/clients/gourmetkitchen.png", website: "https://gourmetkitchen.com", order: 5 },
    { name: "Skyview Properties", logo: "/images/clients/skyview.png", website: "https://skyviewproperties.com", order: 6 },
    { name: "FitLife Gym", logo: "/images/clients/fitlife.png", website: "https://fitlifegym.com", order: 7 },
  ];

  for (const logo of clientLogos) {
    await prisma.clientLogo.upsert({
      where: { id: `logo-${logo.name.toLowerCase().replace(/\s+/g, "-")}` },
      update: logo,
      create: {
        id: `logo-${logo.name.toLowerCase().replace(/\s+/g, "-")}`,
        ...logo,
      },
    });
  }

  console.log("   ✅ Client logos created\n");

  // ==================== BOOKINGS ====================
  console.log("📅 Creating sample bookings...");

  await prisma.booking.deleteMany({});

  const bookings = [
    {
      name: "John Smith",
      email: "john@example.com",
      phone: "+972 50-123-4567",
      serviceType: "Video Production",
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      timeSlot: "10:00",
      duration: 60,
      notes: "Interested in promotional video for new product launch.",
      status: BookingStatus.PENDING,
    },
    {
      name: "Sarah Johnson",
      email: "sarah@example.com",
      phone: "+972 52-987-6543",
      serviceType: "Photography",
      date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      timeSlot: "14:00",
      duration: 90,
      notes: "Corporate headshots for team of 15 people.",
      status: BookingStatus.CONFIRMED,
    },
    {
      name: "Michael Brown",
      email: "michael@example.com",
      phone: "+972 54-111-2222",
      serviceType: "Web Development",
      date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      timeSlot: "11:00",
      duration: 60,
      notes: "Need a new website for my restaurant. Looking for Package 02.",
      status: BookingStatus.PENDING,
    },
  ];

  for (const booking of bookings) {
    await prisma.booking.create({ data: booking });
  }

  console.log("   ✅ Bookings created\n");

  // ==================== BLOG POSTS ====================
  console.log("📝 Creating blog posts...");

  const blogPosts = [
    {
      title: "The Future of Video Marketing in 2025",
      slug: "future-video-marketing-2025",
      excerpt: "Discover the latest trends in video marketing and how businesses can leverage them for growth in the coming year.",
      content: `# The Future of Video Marketing in 2025

Video content continues to dominate the digital landscape. Here's what you need to know to stay ahead...

## Key Trends

### 1. Short-form Content Dominance
Platforms like TikTok, Instagram Reels, and YouTube Shorts are driving demand for bite-sized, engaging content. The sweet spot? 15-60 seconds of pure value.

### 2. AI-Enhanced Production
AI tools are revolutionizing video production, making professional-quality content more accessible than ever. From script writing to editing, AI is becoming an essential part of the workflow.

### 3. Interactive Video Experiences
Engagement through clickable elements, choose-your-own-adventure style content, and shoppable videos are changing how audiences interact with brands.

### 4. Authentic Storytelling
Audiences crave authenticity. Behind-the-scenes content, employee stories, and raw, unpolished moments often outperform highly produced content.

## How to Adapt Your Strategy

1. **Embrace vertical video** - Optimize for mobile-first viewing
2. **Invest in consistency** - Regular posting beats occasional viral attempts
3. **Focus on the first 3 seconds** - Hook viewers immediately
4. **Repurpose content** - Turn one video into multiple formats

## Conclusion

The brands that win in 2025 will be those that combine technological innovation with authentic human connection. Start experimenting now to find what resonates with your audience.`,
      coverImage: "/images/blog/video-marketing.jpg",
      authorId: admin.id,
      category: BlogCategory.INDUSTRY_INSIGHTS,
      tags: ["Video Marketing", "Trends", "2025", "Digital Marketing"],
      published: true,
      publishedAt: new Date(),
    },
    {
      title: "Behind the Scenes: Roma Restaurant Campaign",
      slug: "bts-roma-restaurant-campaign",
      excerpt: "Take an exclusive look behind the scenes of our comprehensive Brand 360 campaign for Roma Restaurant.",
      content: `# Behind the Scenes: Roma Restaurant Campaign

Our team spent three months creating a complete brand identity and marketing ecosystem for Roma Restaurant. Here's how we did it...

## The Challenge

Roma Restaurant approached us with a clear goal: establish a stronger presence on social media while maintaining their authentic, family-owned brand voice. They needed:

- Consistent, high-quality content
- Increased engagement on Instagram and Facebook
- More foot traffic from online discovery
- A cohesive visual identity

## Our Approach

### Phase 1: Discovery & Strategy
We started with a deep dive into Roma's brand values, target audience, and competitive landscape. This informed our content strategy and visual direction.

### Phase 2: Content Production
Our production team delivered:
- **12 Reels per month** showcasing dishes, kitchen action, and customer experiences
- **Weekly photography sessions** for fresh social media content
- **Drone footage** of the restaurant exterior and neighborhood

### Phase 3: Community Management
We handled daily engagement, responding to comments and DMs within 2 hours during business hours.

### Phase 4: Paid Advertising
Strategic Meta ads campaigns targeting local foodies and families within a 15km radius.

## Results After 3 Months

- **📈 187% increase** in Instagram followers
- **🔥 320% increase** in engagement rate
- **🍽️ 45% increase** in weekend reservations
- **⭐ 50+ new 5-star Google reviews**

## Key Takeaways

1. Consistency is more important than perfection
2. Authentic content outperforms polished ads
3. Community engagement drives organic growth
4. Paid ads amplify organic efforts, not replace them

Roma Restaurant continues as a Brand 360 Package 01 client, and we're excited to keep growing together!`,
      coverImage: "/images/blog/roma-bts.jpg",
      authorId: admin.id,
      category: BlogCategory.CASE_STUDIES,
      tags: ["Case Study", "Restaurant", "Brand 360", "Success Story"],
      published: true,
      publishedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    },
    {
      title: "5 Tips for Better Product Photography",
      slug: "5-tips-better-product-photography",
      excerpt: "Learn professional techniques to elevate your product photography and make your products stand out.",
      content: `# 5 Tips for Better Product Photography

Great product photography can make or break your sales. Here are our top tips from years of professional experience...

## 1. Master Your Lighting

Natural light is your friend, but controlled light is your best friend. Key principles:
- Use diffused light to avoid harsh shadows
- Consider a light tent for small products
- Golden hour works for lifestyle shots

## 2. Invest in a Good Tripod

Stability is crucial for:
- Consistent framing across product lines
- Longer exposures in low light
- Focus stacking for ultimate sharpness

## 3. Pay Attention to Backgrounds

Your background should complement, not compete:
- White backgrounds for e-commerce
- Contextual backgrounds for lifestyle
- Gradient backgrounds for premium feel

## 4. Show Multiple Angles

Customers want to see:
- Front view (hero shot)
- Side profiles
- Detail close-ups
- Scale reference

## 5. Post-Processing Consistency

Maintain brand consistency through:
- Color correction presets
- Consistent cropping ratios
- Uniform shadow treatment

## Bonus: The 3-Point Checklist

Before every shoot, verify:
1. ✅ Product is clean and prepared
2. ✅ Lighting is consistent
3. ✅ Camera settings are locked

Happy shooting!`,
      coverImage: "/images/blog/product-photography.jpg",
      authorId: admin.id,
      category: BlogCategory.TUTORIALS,
      tags: ["Photography", "Tutorial", "Tips", "Product Photography"],
      published: true,
      publishedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    },
  ];

  for (const post of blogPosts) {
    await prisma.blogPost.upsert({
      where: { slug: post.slug },
      update: post,
      create: post,
    });
  }

  console.log("   ✅ Blog posts created\n");

  // ==================== SITE SETTINGS ====================
  console.log("⚙️  Creating site settings...");

  const settings = [
    { key: "site_name", value: "Paxala Media Production", type: "string" },
    { key: "site_tagline", value: "Full-Service Creative Production Studio", type: "string" },
    { key: "site_description", value: "Professional video production, photography, web development, and digital marketing services.", type: "string" },
    { key: "contact_email", value: "info@paxalamedia.com", type: "string" },
    { key: "contact_phone", value: "+972 52-330-0119", type: "string" },
    { key: "contact_address", value: "Sakhnin, Palestine", type: "string" },
    { key: "social_instagram", value: "https://instagram.com/paxalamedia", type: "string" },
    { key: "social_facebook", value: "https://facebook.com/paxalamedia", type: "string" },
    { key: "social_youtube", value: "https://youtube.com/paxalamedia", type: "string" },
    { key: "social_linkedin", value: "https://linkedin.com/company/paxalamedia", type: "string" },
    { key: "business_hours_weekdays", value: "08:00 - 17:00", type: "string" },
    { key: "business_hours_sunday", value: "09:00 - 17:00", type: "string" },
    { key: "business_hours_friday", value: "Closed", type: "string" },
    { key: "business_hours_saturday", value: "Closed", type: "string" },
  ];

  for (const setting of settings) {
    await prisma.siteSetting.upsert({
      where: { key: setting.key },
      update: setting,
      create: setting,
    });
  }

  console.log("   ✅ Site settings created\n");

  // ==================== LEADS ====================
  console.log("🎯 Creating example leads...");

  const now = new Date();
  const daysFromNow = (d: number) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000);

  const exampleLeads = [
    {
      clientName: "Rami Khalaily",
      company: "Khalaily Furniture",
      email: "rami@khalaily-furniture.example",
      phone: "+972 52-000-0001",
      source: "WEBSITE" as const,
      interestedIn: "Product photography for new showroom",
      stage: "NEW" as const,
      expectedValue: 4500,
      currency: "ILS",
      nextFollowUpAt: daysFromNow(2),
      notes: "Came through the contact form. Wants a quote before end of month.",
    },
    {
      clientName: "Lina Abu Ria",
      company: "Lina's Kitchen",
      email: "lina@linaskitchen.example",
      phone: "+972 52-000-0002",
      source: "INSTAGRAM" as const,
      interestedIn: "Monthly social media content retainer",
      stage: "CONTACTED" as const,
      expectedValue: 3000,
      currency: "ILS",
      nextFollowUpAt: daysFromNow(-3), // overdue on purpose (test red highlight)
      notes: "Replied on Instagram DM. Asked for portfolio examples.",
    },
    {
      clientName: "Yousef Ghanayem",
      company: "Ghanayem Motors",
      email: "yousef@ghanayem-motors.example",
      phone: "+972 52-000-0003",
      source: "REFERRAL" as const,
      interestedIn: "Showroom video + 3 reels",
      stage: "PROPOSAL_SENT" as const,
      expectedValue: 8500,
      currency: "ILS",
      nextFollowUpAt: daysFromNow(5),
      notes: "Referred by Waleed. Proposal sent, waiting for feedback.",
    },
    {
      clientName: "Maha Zoabi",
      company: "Zoabi Dental Clinic",
      email: "maha@zoabi-dental.example",
      phone: "+972 52-000-0004",
      source: "WHATSAPP" as const,
      interestedIn: "Clinic branding video",
      stage: "WON" as const,
      expectedValue: 6000,
      currency: "ILS",
      notes: "Signed! Kickoff scheduled.",
    },
    {
      clientName: "Samir Khatib",
      company: null,
      email: "samir.khatib@example.com",
      phone: "+972 52-000-0005",
      source: "OTHER" as const,
      interestedIn: "Wedding videography",
      stage: "LOST" as const,
      expectedValue: 2500,
      currency: "ILS",
      lostReason: "Went with a cheaper freelancer",
      notes: "Budget was the main blocker.",
    },
  ];

  for (const leadData of exampleLeads) {
    const existingLead = await prisma.lead.findFirst({
      where: { email: leadData.email },
    });
    if (!existingLead) {
      await prisma.lead.create({ data: leadData });
    }
  }

  console.log("   ✅ Example leads created\n");

  // ==================== SUMMARY ====================
  console.log("═══════════════════════════════════════════════════════");
  console.log("🎉 Database seed completed successfully!");
  console.log("═══════════════════════════════════════════════════════");
  console.log("");
  console.log("📧 Default Login Credentials:");
  console.log("   ┌─────────────────────────────────────┐");
  console.log("   │ Role    │ Username    │ Password   │");
  console.log("   ├─────────────────────────────────────┤");
  console.log("   │ Admin   │ admin       │ admin123   │");
  console.log("   │ Staff   │ karim       │ staff123   │");
  console.log("   │ Client  │ client      │ client123  │");
  console.log("   └─────────────────────────────────────┘");
  console.log("");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
