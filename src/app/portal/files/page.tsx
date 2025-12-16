"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  Download,
  FileText,
  Image,
  Video,
  File,
  Folder,
  Search,
  Loader2,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ProjectFile {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  createdAt: string;
  project: {
    id: string;
    title: string;
    slug: string;
  };
}

const fileIcons: Record<string, React.ElementType> = {
  image: Image,
  video: Video,
  pdf: FileText,
  document: FileText,
  other: File,
};

const fileColors: Record<string, string> = {
  image: "bg-blue-600/20 text-blue-500",
  video: "bg-purple-600/20 text-purple-500",
  pdf: "bg-red-600/20 text-red-500",
  document: "bg-yellow-600/20 text-yellow-500",
  other: "bg-white/10 text-white/60",
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export default function FilesPage() {
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  useEffect(() => {
    async function fetchFiles() {
      try {
        // First get all projects
        const projectsResponse = await fetch("/api/projects");
        if (!projectsResponse.ok) throw new Error("Failed to fetch projects");
        const projects = await projectsResponse.json();

        // Then get files for each project
        const allFiles: ProjectFile[] = [];
        for (const project of projects) {
          try {
            const filesResponse = await fetch(
              `/api/files?projectId=${project.id}`
            );
            if (filesResponse.ok) {
              const projectFiles = await filesResponse.json();
              allFiles.push(
                ...projectFiles.map((f: ProjectFile) => ({
                  ...f,
                  project: {
                    id: project.id,
                    title: project.title,
                    slug: project.slug,
                  },
                }))
              );
            }
          } catch (e) {
            // Skip if files fetch fails for a project
          }
        }

        setFiles(allFiles.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ));
      } catch (error) {
        console.error("Error fetching files:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchFiles();
  }, []);

  const filteredFiles = files.filter((file) => {
    const matchesSearch = file.name
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesType = !typeFilter || file.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const fileTypes = [...new Set(files.map((f) => f.type))];
  const totalSize = files.reduce((acc, f) => acc + f.size, 0);

  // Group files by project
  const filesByProject = filteredFiles.reduce((acc, file) => {
    const projectId = file.project.id;
    if (!acc[projectId]) {
      acc[projectId] = {
        project: file.project,
        files: [],
      };
    }
    acc[projectId].files.push(file);
    return acc;
  }, {} as Record<string, { project: ProjectFile["project"]; files: ProjectFile[] }>);

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-white mb-2">My Files</h1>
        <p className="text-white/60">
          Access and download files from your projects.
        </p>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
      >
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-600/20 text-blue-500">
                <FileText size={24} />
              </div>
              <div>
                <p className="text-3xl font-bold text-white">{files.length}</p>
                <p className="text-sm text-white/60">Total Files</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-purple-600/20 text-purple-500">
                <Folder size={24} />
              </div>
              <div>
                <p className="text-3xl font-bold text-white">
                  {Object.keys(filesByProject).length}
                </p>
                <p className="text-sm text-white/60">Projects</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-600/20 text-green-500">
                <Download size={24} />
              </div>
              <div>
                <p className="text-3xl font-bold text-white">
                  {formatFileSize(totalSize)}
                </p>
                <p className="text-sm text-white/60">Total Size</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
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
            placeholder="Search files..."
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={typeFilter === null ? "default" : "secondary"}
            size="sm"
            onClick={() => setTypeFilter(null)}
          >
            All
          </Button>
          {fileTypes.map((type) => (
            <Button
              key={type}
              variant={typeFilter === type ? "default" : "secondary"}
              size="sm"
              onClick={() => setTypeFilter(type)}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </Button>
          ))}
        </div>
      </motion.div>

      {/* Files List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-white/40" size={32} />
        </div>
      ) : filteredFiles.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <FileText size={64} className="text-white/20 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            No files found
          </h3>
          <p className="text-white/60 mb-6">
            {search || typeFilter
              ? "No files match your filters."
              : "Files from your projects will appear here."}
          </p>
          <Link href="/portal/projects">
            <Button variant="secondary">View Projects</Button>
          </Link>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-8"
        >
          {Object.values(filesByProject).map(({ project, files: projectFiles }) => (
            <Card key={project.id}>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-red-600/20 flex items-center justify-center text-red-500">
                      <Folder size={20} />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{project.title}</CardTitle>
                      <p className="text-white/40 text-xs">
                        {projectFiles.length} file
                        {projectFiles.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <Link href={`/portal/projects/${project.slug}`}>
                    <Button variant="ghost" size="sm">
                      View Project
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {projectFiles.map((file) => {
                    const Icon = fileIcons[file.type] || File;
                    const colorClass = fileColors[file.type] || fileColors.other;

                    return (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClass}`}
                          >
                            <Icon size={20} />
                          </div>
                          <div>
                            <p className="text-white font-medium">{file.name}</p>
                            <div className="flex items-center gap-3 text-white/40 text-xs">
                              <span>{formatFileSize(file.size)}</span>
                              <span>•</span>
                              <span>
                                {format(new Date(file.createdAt), "MMM d, yyyy")}
                              </span>
                            </div>
                          </div>
                        </div>
                        <a href={file.url} download target="_blank">
                          <Button variant="ghost" size="sm">
                            <Download size={16} className="mr-2" />
                            Download
                          </Button>
                        </a>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>
      )}
    </div>
  );
}
