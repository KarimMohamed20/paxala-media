"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Folder, Loader2, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Project {
  id: string;
  title: string;
  slug: string;
  status: string;
  category: string;
  client: { name: string | null; email: string } | null;
  staff: { id: string; name: string | null; email: string }[];
  milestones: {
    tasks: { id: string; status: string }[];
  }[];
}

const statusColors = {
  DRAFT: "secondary",
  IN_PROGRESS: "warning",
  REVIEW: "default",
  COMPLETED: "success",
  ARCHIVED: "secondary",
} as const;

export default function StaffProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await fetch("/api/staff/projects");
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-white/40" size={32} />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-white mb-2">My Projects</h1>
        <p className="text-white/60">Projects you have been assigned to work on</p>
      </motion.div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Folder size={48} className="text-white/20 mx-auto mb-4" />
            <p className="text-white/60">No projects assigned yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project, index) => {
            const totalTasks = project.milestones.reduce(
              (sum, m) => sum + m.tasks.length,
              0
            );
            const completedTasks = project.milestones.reduce(
              (sum, m) => sum + m.tasks.filter((t) => t.status === "APPROVED").length,
              0
            );
            const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

            return (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link href={`/staff/projects/${project.slug}`}>
                  <Card className="hover:border-blue-500/50 transition-colors cursor-pointer h-full">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-600/20 flex items-center justify-center text-blue-500">
                          <Folder size={24} />
                        </div>
                        <Badge
                          variant={
                            statusColors[project.status as keyof typeof statusColors]
                          }
                        >
                          {project.status.replace("_", " ")}
                        </Badge>
                      </div>

                      <h3 className="text-xl font-semibold text-white mb-2">
                        {project.title}
                      </h3>
                      <p className="text-white/50 text-sm mb-4">
                        {project.category.replace("_", " ")}
                        {project.client?.name && ` • ${project.client.name}`}
                      </p>

                      {/* Progress Bar */}
                      <div className="mb-4">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-white/60">My Progress</span>
                          <span className="text-white">{progress}%</span>
                        </div>
                        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/50">
                          {completedTasks}/{totalTasks} tasks
                        </span>
                        <div className="flex items-center gap-1 text-white/50">
                          <Users size={14} />
                          {project.staff.length}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
