"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  Folder,
  CheckCircle2,
  ListTodo,
  Users,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Import tab components (we'll create these)
import { ProjectOverviewTab } from "@/components/admin/project/overview-tab";
import { ProjectMilestonesTab } from "@/components/admin/project/milestones-tab";
import { ProjectTeamTab } from "@/components/admin/project/team-tab";
import { ProjectFilesTab } from "@/components/admin/project/files-tab";

interface Project {
  id: string;
  title: string;
  slug: string;
  description: string;
  status: string;
  category: string;
  clientName: string | null;
  deadline: string | null;
}

export default function ProjectManagePage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setProject(data);
    } catch (error) {
      console.error("Error fetching project:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-white/40" size={48} />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-8">
        <div className="text-white">Project not found</div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/admin/projects")}
        >
          <ArrowLeft size={18} />
        </Button>
        <div className="flex items-center gap-4 flex-1">
          <div className="p-3 rounded-xl bg-red-600/10">
            <Folder className="text-red-500" size={24} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              {project.title}
            </h1>
            <p className="text-white/60 text-sm">
              {project.status} • {project.category}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-white/5 border border-white/10">
          <TabsTrigger value="overview" className="data-[state=active]:bg-red-600">
            <FileText size={16} className="mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="milestones" className="data-[state=active]:bg-red-600">
            <CheckCircle2 size={16} className="mr-2" />
            Milestones & Tasks
          </TabsTrigger>
          <TabsTrigger value="team" className="data-[state=active]:bg-red-600">
            <Users size={16} className="mr-2" />
            Team
          </TabsTrigger>
          <TabsTrigger value="files" className="data-[state=active]:bg-red-600">
            <Folder size={16} className="mr-2" />
            Files
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <ProjectOverviewTab projectId={projectId} project={project} onUpdate={fetchProject} />
        </TabsContent>

        <TabsContent value="milestones">
          <ProjectMilestonesTab projectId={projectId} />
        </TabsContent>

        <TabsContent value="team">
          <ProjectTeamTab projectId={projectId} />
        </TabsContent>

        <TabsContent value="files">
          <ProjectFilesTab projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
