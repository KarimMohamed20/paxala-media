"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { useTranslations } from "next-intl";
import {
  Folder,
  Search,
  Clock,
  FileText,
  MessageSquare,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Project {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    files: number;
    comments: number;
  };
}

const statusColors = {
  DRAFT: "secondary",
  IN_PROGRESS: "warning",
  REVIEW: "default",
  COMPLETED: "success",
  ARCHIVED: "secondary",
} as const;

const statusProgress = {
  DRAFT: 10,
  IN_PROGRESS: 50,
  REVIEW: 85,
  COMPLETED: 100,
  ARCHIVED: 100,
} as const;

export default function ProjectsPage() {
  const t = useTranslations('portal');
  const tc = useTranslations('common');
  const { data: session } = useSession();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProjects() {
      try {
        const response = await fetch("/api/portal/projects");
        if (!response.ok) throw new Error("Failed to fetch projects");
        const data = await response.json();
        setProjects(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error fetching projects:", error);
        setProjects([]);
      } finally {
        setLoading(false);
      }
    }

    fetchProjects();
  }, []);

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.title.toLowerCase().includes(search.toLowerCase()) ||
      project.description.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-white mb-2">{t('projects')}</h1>
        <p className="text-white/60">
          View and track the progress of your projects.
        </p>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex gap-4 mb-8 flex-wrap"
      >
        <div className="relative flex-1 max-w-md">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`${tc('search')} ${t('projects').toLowerCase()}...`}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={statusFilter === null ? "default" : "secondary"}
            size="sm"
            onClick={() => setStatusFilter(null)}
          >
            {tc('all')}
          </Button>
          {["IN_PROGRESS", "REVIEW", "COMPLETED"].map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? "default" : "secondary"}
              size="sm"
              onClick={() => setStatusFilter(status)}
            >
              {status === "IN_PROGRESS" ? tc('inProgress') : status === "REVIEW" ? tc('review') : tc('completed')}
            </Button>
          ))}
        </div>
      </motion.div>

      {/* Projects Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-white/40" size={32} />
        </div>
      ) : filteredProjects.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <Folder size={64} className="text-white/20 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            {t('noProjectsYet')}
          </h3>
          <p className="text-white/60 mb-6">
            {search || statusFilter
              ? tc('noResults')
              : "Your projects will appear here once started."}
          </p>
          <Link href="/booking">
            <Button>{tc('bookConsultation')}</Button>
          </Link>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredProjects.map((project, index) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
            >
              <Link href={`/portal/projects/${project.slug}`}>
                <Card className="h-full hover:border-white/20 transition-colors group">
                  <CardContent className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-red-600/20 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform">
                        <Folder size={24} />
                      </div>
                      <Badge
                        variant={
                          statusColors[
                            project.status as keyof typeof statusColors
                          ] || "secondary"
                        }
                      >
                        {project.status.replace("_", " ")}
                      </Badge>
                    </div>

                    {/* Title & Description */}
                    <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-red-500 transition-colors">
                      {project.title}
                    </h3>
                    <p className="text-white/60 text-sm mb-4 line-clamp-2">
                      {project.description}
                    </p>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-xs text-white/40 mb-1">
                        <span>{t('progress')}</span>
                        <span>
                          {statusProgress[
                            project.status as keyof typeof statusProgress
                          ] || 0}
                          %
                        </span>
                      </div>
                      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-600 rounded-full transition-all"
                          style={{
                            width: `${
                              statusProgress[
                                project.status as keyof typeof statusProgress
                              ] || 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Meta */}
                    <div className="flex items-center justify-between text-xs text-white/40">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <FileText size={14} />
                          {project._count?.files || 0} {tc('files').toLowerCase()}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare size={14} />
                          {project._count?.comments || 0}
                        </span>
                      </div>
                      <span className="flex items-center gap-1">
                        <Clock size={14} />
                        {format(new Date(project.updatedAt), "MMM d")}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
