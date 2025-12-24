"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  Folder,
  Search,
  Plus,
  MoreVertical,
  Trash2,
  Edit,
  Eye,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Project {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  status: string;
  clientName: string | null;
  clientId: string | null;
  featured: boolean;
  deadline: string | null;
  createdAt: string;
}

interface Client {
  id: string;
  name: string | null;
  email: string;
}

const statusColors = {
  DRAFT: "secondary",
  IN_PROGRESS: "warning",
  REVIEW: "default",
  COMPLETED: "success",
  ARCHIVED: "secondary",
} as const;

const categories = [
  "VIDEO_PRODUCTION",
  "PHOTOGRAPHY",
  "GRAPHIC_DESIGN",
  "WEB_DEVELOPMENT",
  "APP_DEVELOPMENT",
  "THREE_D_MODELING",
  "ANIMATION",
  "SOCIAL_MEDIA",
];

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: "",
    slug: "",
    description: "",
    category: "VIDEO_PRODUCTION",
    clientId: "",
    status: "DRAFT",
    deadline: "",
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = async () => {
    try {
      const params = new URLSearchParams();
      params.append("admin", "true");
      if (statusFilter) params.append("status", statusFilter);

      const response = await fetch(`/api/projects?${params}`);
      if (!response.ok) throw new Error("Failed to fetch projects");
      const data = await response.json();

      // Extract projects array from response (API returns {projects, total, hasMore})
      let projectsList: Project[] = Array.isArray(data) ? data : data.projects || [];

      // Filter by search on client side
      if (search) {
        projectsList = projectsList.filter(
          (p: Project) =>
            p.title.toLowerCase().includes(search.toLowerCase()) ||
            p.clientName?.toLowerCase().includes(search.toLowerCase())
        );
      }

      setProjects(projectsList);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await fetch("/api/users?role=CLIENT");
      if (!response.ok) throw new Error("Failed to fetch clients");
      const data = await response.json();
      setClients(data);
    } catch (err) {
      console.error("Failed to fetch clients:", err);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [search, statusFilter]);

  useEffect(() => {
    fetchClients();
  }, []);

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setError(null);

    try {
      const selectedClient = clients.find((c) => c.id === createForm.clientId);
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...createForm,
          slug: createForm.slug || generateSlug(createForm.title),
          clientId: createForm.clientId || null,
          clientName: selectedClient?.name || selectedClient?.email || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create project");
      }

      setIsCreateModalOpen(false);
      setCreateForm({
        title: "",
        slug: "",
        description: "",
        category: "VIDEO_PRODUCTION",
        clientId: "",
        status: "DRAFT",
        deadline: "",
      });
      fetchProjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm("Are you sure you want to delete this project?")) return;

    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete project");
      }

      fetchProjects();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete project");
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update status");
      }

      fetchProjects();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-8"
      >
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Projects</h1>
          <p className="text-white/60">Manage client projects and portfolio.</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus size={18} className="mr-2" />
          New Project
        </Button>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex gap-4 mb-6"
      >
        <div className="relative flex-1 max-w-md">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["DRAFT", "IN_PROGRESS", "REVIEW", "COMPLETED"].map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? "default" : "secondary"}
              size="sm"
              onClick={() =>
                setStatusFilter(statusFilter === status ? null : status)
              }
            >
              {status.replace("_", " ")}
            </Button>
          ))}
        </div>
      </motion.div>

      {/* Projects List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="animate-spin text-white/40" size={24} />
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-12">
                <Folder size={48} className="text-white/20 mx-auto mb-4" />
                <p className="text-white/40">No projects found</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left p-4 text-white/60 font-medium">
                      Project
                    </th>
                    <th className="text-left p-4 text-white/60 font-medium">
                      Category
                    </th>
                    <th className="text-left p-4 text-white/60 font-medium">
                      Client
                    </th>
                    <th className="text-left p-4 text-white/60 font-medium">
                      Status
                    </th>
                    <th className="text-left p-4 text-white/60 font-medium">
                      Created
                    </th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project) => (
                    <tr
                      key={project.id}
                      className="border-b border-white/5 hover:bg-white/5"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center text-purple-500">
                            <Folder size={18} />
                          </div>
                          <div>
                            <p className="text-white font-medium">
                              {project.title}
                            </p>
                            <p className="text-white/40 text-xs">
                              /{project.slug}
                            </p>
                            {project.deadline && (
                              <p className="text-orange-400 text-xs mt-0.5">
                                Deadline: {format(new Date(project.deadline), "MMM d, yyyy")}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-white/60 text-sm">
                          {project.category.replace("_", " ")}
                        </span>
                      </td>
                      <td className="p-4 text-white/60">
                        {project.clientName || "-"}
                      </td>
                      <td className="p-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="cursor-pointer">
                              <Badge
                                variant={
                                  statusColors[
                                    project.status as keyof typeof statusColors
                                  ] || "secondary"
                                }
                              >
                                {project.status.replace("_", " ")}
                              </Badge>
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            {Object.keys(statusColors).map((status) => (
                              <DropdownMenuItem
                                key={status}
                                onClick={() =>
                                  handleStatusChange(project.id, status)
                                }
                              >
                                {status.replace("_", " ")}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                      <td className="p-4 text-white/60 text-sm">
                        {format(new Date(project.createdAt), "MMM d, yyyy")}
                      </td>
                      <td className="p-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical size={16} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <a href={`/admin/projects/${project.id}`}>
                                <Edit size={16} className="mr-2" />
                                Manage
                              </a>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <a
                                href={`/portfolio/${project.slug}`}
                                target="_blank"
                              >
                                <Eye size={16} className="mr-2" />
                                View
                              </a>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteProject(project.id)}
                              className="text-red-500"
                            >
                              <Trash2 size={16} className="mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Create Project Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateProject} className="space-y-4">
            {error && (
              <div className="bg-red-600/10 border border-red-600/20 rounded-lg p-3">
                <p className="text-red-500 text-sm">{error}</p>
              </div>
            )}
            <div>
              <label className="block text-sm text-white/70 mb-2">Title</label>
              <Input
                value={createForm.title}
                onChange={(e) => {
                  setCreateForm({
                    ...createForm,
                    title: e.target.value,
                    slug: generateSlug(e.target.value),
                  });
                }}
                placeholder="Project title"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-2">Slug</label>
              <Input
                value={createForm.slug}
                onChange={(e) =>
                  setCreateForm({ ...createForm, slug: e.target.value })
                }
                placeholder="project-slug"
              />
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-2">
                Description
              </label>
              <Textarea
                value={createForm.description}
                onChange={(e) =>
                  setCreateForm({ ...createForm, description: e.target.value })
                }
                placeholder="Project description"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-2">
                Deadline
              </label>
              <Input
                type="date"
                value={createForm.deadline}
                onChange={(e) =>
                  setCreateForm({ ...createForm, deadline: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Category
                </label>
                <Select
                  value={createForm.category}
                  onValueChange={(value) =>
                    setCreateForm({ ...createForm, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Status
                </label>
                <Select
                  value={createForm.status}
                  onValueChange={(value) =>
                    setCreateForm({ ...createForm, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(statusColors).map((status) => (
                      <SelectItem key={status} value={status}>
                        {status.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-2">
                Client
              </label>
              <Select
                value={createForm.clientId || "none"}
                onValueChange={(value) =>
                  setCreateForm({ ...createForm, clientId: value === "none" ? "" : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="No client selected" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No client selected</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name || client.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsCreateModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createLoading}>
                {createLoading ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={16} />
                    Creating...
                  </>
                ) : (
                  "Create Project"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
