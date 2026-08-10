"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, formatDistanceToNow } from "date-fns";
import Link from "next/link";
import {
  Folder,
  Search,
  Plus,
  MoreVertical,
  Trash2,
  Edit,
  Eye,
  Loader2,
  Clock,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Upload,
  MessageSquare,
  Film,
  Camera,
  Layout,
  Code,
  Sparkles,
  ChevronRight,
  User,
  LayoutGrid,
  List,
  Kanban,
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
import { useTranslations } from "next-intl";

interface StaffMember {
  id: string;
  name: string;
  image: string | null;
  email: string;
}

interface Project {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  status: string;
  thumbnail: string;
  images: string[];
  clientName: string | null;
  clientId: string | null;
  featured: boolean;
  deadline: string | null;
  createdAt: string;
  updatedAt: string;
  progress: number;
  currentPhase: string;
  nextMilestone: {
    id: string;
    title: string;
    deadline: string | null;
  } | null;
  actionRequired: boolean;
  staff: StaffMember[];
  _count?: {
    files: number;
    comments: number;
    milestones: number;
  };
}

interface Client {
  id: string;
  username: string;
  name: string | null;
  email: string | null;
}

interface StatsData {
  activeProjects: number;
  awaitingClient: number;
  upcomingMilestones: number;
  completedProjects: number;
}

interface UpcomingMilestoneItem {
  id: string;
  title: string;
  deadline: string | null;
  projectTitle: string;
  projectSlug: string;
  projectId: string;
}

interface ClientActionItem {
  id: string;
  title: string;
  dueDate: string | null;
  projectTitle: string;
  projectSlug: string;
  type: string;
  actionUrl: string;
}

interface RecentActivityItem {
  id: string;
  type: "upload" | "comment" | "milestone";
  message: string;
  timestamp: string;
  projectId: string;
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

const categoryIcons: Record<string, React.ElementType> = {
  VIDEO_PRODUCTION: Film,
  PHOTOGRAPHY: Camera,
  GRAPHIC_DESIGN: Sparkles,
  WEB_DEVELOPMENT: Layout,
  APP_DEVELOPMENT: Code,
  THREE_D_MODELING: Sparkles,
  ANIMATION: Film,
  SOCIAL_MEDIA: Sparkles,
};

const categoryLabels: Record<string, string> = {
  VIDEO_PRODUCTION: "Film & Video",
  PHOTOGRAPHY: "Photography",
  GRAPHIC_DESIGN: "Design",
  WEB_DEVELOPMENT: "Website",
  APP_DEVELOPMENT: "App",
  THREE_D_MODELING: "3D",
  ANIMATION: "Animation",
  SOCIAL_MEDIA: "Campaign",
};

const BOARD_STATUSES = ["DRAFT", "IN_PROGRESS", "REVIEW", "COMPLETED"] as const;

const boardAccent: Record<string, string> = {
  DRAFT: "border-t-neutral-500",
  IN_PROGRESS: "border-t-yellow-500",
  REVIEW: "border-t-blue-500",
  COMPLETED: "border-t-green-500",
};

function isProjectOverdue(project: Project) {
  return (
    project.deadline &&
    project.status !== "COMPLETED" &&
    project.status !== "ARCHIVED" &&
    new Date(project.deadline) < new Date()
  );
}

export default function AdminProjectsPage() {
  const ta = useTranslations("adminUI");
  const tc = useTranslations("common");

  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState<StatsData>({
    activeProjects: 0,
    awaitingClient: 0,
    upcomingMilestones: 0,
    completedProjects: 0,
  });
  const [upcomingMilestones, setUpcomingMilestones] = useState<UpcomingMilestoneItem[]>([]);
  const [clientActions, setClientActions] = useState<ClientActionItem[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "table" | "board">("grid");
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropStatus, setDropStatus] = useState<string | null>(null);

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
      setLoading(true);
      const params = new URLSearchParams();
      params.append("admin", "true");
      if (statusFilter) params.append("status", statusFilter);

      const response = await fetch(`/api/projects?${params}`);
      if (!response.ok) throw new Error("Failed to fetch projects");
      const data = await response.json();

      const projectsList: Project[] = Array.isArray(data) ? data : data.projects || [];
      setProjects(projectsList);

      if (data.stats) setStats(data.stats);
      if (data.upcomingMilestones) setUpcomingMilestones(data.upcomingMilestones);
      if (data.clientActions) setClientActions(data.clientActions);
      if (data.recentActivity) setRecentActivity(data.recentActivity);
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
  }, [statusFilter]);

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
    if (!confirm(ta("deleteConfirm"))) return;
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
      alert(err instanceof Error ? err.message : ta("errorOccurred"));
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    // Optimistic, so a drag lands in its new column immediately instead of
    // snapping back for the round-trip. The catch below re-fetches to undo it.
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p))
    );
    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) throw new Error("Failed to update status");
      fetchProjects();
    } catch (err) {
      fetchProjects();
      alert(err instanceof Error ? err.message : ta("errorOccurred"));
    }
  };

  // Filter projects by search and category
  const activeProjects = projects.filter(
    (p) => p.status !== "COMPLETED" && p.status !== "ARCHIVED"
  );
  const completedProjects = projects.filter((p) => p.status === "COMPLETED");

  const matchesFilters = (project: Project) => {
    const matchesSearch =
      project.title.toLowerCase().includes(search.toLowerCase()) ||
      project.description?.toLowerCase().includes(search.toLowerCase()) ||
      project.clientName?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      categoryFilter === "ALL" || project.category === categoryFilter;
    return matchesSearch && matchesCategory;
  };

  const filteredActiveProjects = activeProjects.filter(matchesFilters);

  // The board is a status workflow and COMPLETED is its terminal column, so it
  // filters over every project — not the active subset, which drops COMPLETED
  // and would leave that column permanently empty with nowhere to drop a card.
  const boardProjects = projects.filter(matchesFilters);

  return (
    <div className="space-y-8 pb-12">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold text-white tracking-tight">
            {ta("projects")}
          </h1>
          <p className="text-white/60 text-sm md:text-base mt-1">
            Manage all client, creative & digital projects across Paxala Media
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search bar */}
          <div className="relative flex-1 min-w-[200px] md:w-64">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects or clients..."
              className="pl-10 bg-neutral-900/90 border-white/10 text-white placeholder:text-white/40 focus:border-red-600 rounded-xl"
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-10 bg-neutral-900/90 border border-white/10 text-white text-sm rounded-xl px-3 focus:outline-none focus:border-red-600"
          >
            <option value="ALL">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat.replace("_", " ")}
              </option>
            ))}
          </select>

          {/* View toggle button */}
          <div className="flex items-center bg-neutral-900 border border-white/10 rounded-xl p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === "grid"
                  ? "bg-red-600 text-white"
                  : "text-white/40 hover:text-white"
              }`}
              title="Grid View"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === "table"
                  ? "bg-red-600 text-white"
                  : "text-white/40 hover:text-white"
              }`}
              title="Table View"
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setViewMode("board")}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === "board"
                  ? "bg-red-600 text-white"
                  : "text-white/40 hover:text-white"
              }`}
              title={ta("boardView")}
            >
              <Kanban size={16} />
            </button>
          </div>

          {/* New Project CTA */}
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-red-600 hover:bg-red-700 text-white font-medium px-5 rounded-xl flex items-center gap-2 shadow-lg shadow-red-600/20"
          >
            <Plus size={18} />
            <span>{ta("newProject")}</span>
          </Button>
        </div>
      </div>

      {/* Top Metric Summary Cards */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <div className="bg-neutral-900/80 border border-white/10 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-600/20 flex items-center justify-center text-red-500 shrink-0">
            <Folder size={22} />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">
              {stats.activeProjects || activeProjects.length}
            </div>
            <div className="text-xs text-white/50 font-medium">
              Active Projects
            </div>
          </div>
        </div>

        <div className="bg-neutral-900/80 border border-white/10 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
            <Clock size={22} />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">
              {stats.awaitingClient}
            </div>
            <div className="text-xs text-amber-400/90 font-medium">
              Awaiting Review
            </div>
          </div>
        </div>

        <div className="bg-neutral-900/80 border border-white/10 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
            <Calendar size={22} />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">
              {stats.upcomingMilestones || upcomingMilestones.length}
            </div>
            <div className="text-xs text-white/50 font-medium">
              Upcoming Milestones
            </div>
          </div>
        </div>

        <div className="bg-neutral-900/80 border border-white/10 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">
              {stats.completedProjects || completedProjects.length}
            </div>
            <div className="text-xs text-emerald-400/90 font-medium">
              Completed
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column (2 cols on lg) */}
        <div className="lg:col-span-2 space-y-8">
          {/* Status filter bar */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={statusFilter === null ? "default" : "secondary"}
              size="sm"
              onClick={() => setStatusFilter(null)}
              className={statusFilter === null ? "bg-red-600 text-white" : ""}
            >
              All Status
            </Button>
            {["DRAFT", "IN_PROGRESS", "REVIEW", "COMPLETED"].map((status) => (
              <Button
                key={status}
                variant={statusFilter === status ? "default" : "secondary"}
                size="sm"
                onClick={() =>
                  setStatusFilter(statusFilter === status ? null : status)
                }
                className={statusFilter === status ? "bg-red-600 text-white" : ""}
              >
                {status.replace("_", " ")}
              </Button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24 bg-neutral-900/40 rounded-3xl border border-white/5">
              <Loader2 className="animate-spin text-red-600" size={36} />
            </div>
          ) : viewMode === "grid" ? (
            /* Grid View */
            filteredActiveProjects.length === 0 ? (
              <div className="bg-neutral-900/50 border border-white/10 rounded-3xl p-12 text-center">
                <Folder size={56} className="text-white/20 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  No projects found
                </h3>
                <p className="text-white/60 text-sm mb-6 max-w-md mx-auto">
                  No active projects match your filter criteria.
                </p>
                <Button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Create New Project
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredActiveProjects.map((project, index) => {
                  const CategoryIcon =
                    categoryIcons[project.category] || Folder;
                  const catLabel =
                    categoryLabels[project.category] || project.category;

                  return (
                    <motion.div
                      key={project.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.06 }}
                    >
                      <Card className="bg-neutral-900/90 border border-white/10 rounded-2xl overflow-hidden hover:border-red-600/60 transition-all duration-300 group flex flex-col h-full shadow-2xl">
                        {/* Banner Image */}
                        <div className="relative h-44 w-full overflow-hidden bg-neutral-950">
                          <img
                            src={project.thumbnail}
                            alt={project.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 brightness-90"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent" />

                          {/* Category Badge */}
                          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-white/90 text-xs font-medium">
                            <CategoryIcon size={14} className="text-red-500" />
                            <span>{catLabel}</span>
                          </div>

                          {/* Top Right Actions */}
                          <div className="absolute top-3 right-3 flex items-center gap-2">
                            {project.actionRequired && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[11px] font-bold shadow-lg animate-pulse">
                                <AlertCircle size={12} />
                                Action Required
                              </span>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="w-7 h-7 p-0 bg-black/60 backdrop-blur-md border border-white/20 text-white hover:bg-black/80"
                                >
                                  <MoreVertical size={14} />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-neutral-900 border-white/10 text-white">
                                <DropdownMenuItem asChild>
                                  <Link href={`/admin/projects/${project.id}`}>
                                    <Edit size={14} className="mr-2" />
                                    Manage Project
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link
                                    href={`/portal/projects/${project.slug}`}
                                    target="_blank"
                                  >
                                    <Eye size={14} className="mr-2" />
                                    View Portal Page
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDeleteProject(project.id)}
                                  className="text-red-500 focus:text-red-400"
                                >
                                  <Trash2 size={14} className="mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        {/* Card Content Body */}
                        <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                          <div>
                            <Link href={`/admin/projects/${project.id}`}>
                              <h3 className="text-lg font-bold text-white group-hover:text-red-500 transition-colors line-clamp-1">
                                {project.title}
                              </h3>
                            </Link>

                            <div className="flex items-center justify-between text-xs mt-2">
                              <span className="text-white/40 font-medium">
                                Client:{" "}
                                <span className="text-white/80">
                                  {project.clientName || "Unassigned"}
                                </span>
                              </span>
                              <span className="text-white/90 font-semibold bg-white/5 px-2.5 py-0.5 rounded-md border border-white/10">
                                {project.currentPhase}
                              </span>
                            </div>
                          </div>

                          {/* Progress */}
                          <div>
                            <div className="flex items-center justify-between text-xs text-white/50 mb-1.5 font-medium">
                              <span>Progress</span>
                              <span className="text-white/80 font-bold">
                                {project.progress}%
                              </span>
                            </div>
                            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden p-0.5">
                              <motion.div
                                className="h-full bg-red-600 rounded-full shadow-[0_0_10px_rgba(220,38,38,0.7)]"
                                initial={{ width: 0 }}
                                animate={{ width: `${project.progress}%` }}
                                transition={{ duration: 0.8 }}
                              />
                            </div>
                          </div>

                          {/* Next Milestone & Deadline */}
                          <div className="space-y-1.5 text-xs text-white/60 bg-neutral-950/60 p-3 rounded-xl border border-white/5">
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-1.5 text-white/40">
                                <Calendar size={13} />
                                Deadline
                              </span>
                              <span className="text-white/80 font-medium">
                                {project.deadline
                                  ? format(new Date(project.deadline), "d MMM yyyy")
                                  : "None"}
                              </span>
                            </div>

                            {project.nextMilestone && (
                              <div className="flex items-center justify-between pt-1 border-t border-white/5">
                                <span className="flex items-center gap-1.5 text-white/40">
                                  🚩 Next Milestone
                                </span>
                                <span className="text-red-400 font-medium truncate max-w-[140px]">
                                  {project.nextMilestone.title}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Footer Info */}
                          <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                            {/* Staff */}
                            <div className="flex items-center">
                              <div className="flex -space-x-2 overflow-hidden">
                                {project.staff && project.staff.length > 0 ? (
                                  project.staff.slice(0, 3).map((member) => (
                                    <div
                                      key={member.id}
                                      className="w-7 h-7 rounded-full border-2 border-neutral-900 bg-neutral-800 flex items-center justify-center text-[10px] font-bold text-white overflow-hidden"
                                      title={member.name}
                                    >
                                      {member.image ? (
                                        <img
                                          src={member.image}
                                          alt={member.name}
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        member.name[0]?.toUpperCase()
                                      )}
                                    </div>
                                  ))
                                ) : (
                                  <div className="w-7 h-7 rounded-full border-2 border-neutral-900 bg-red-950 text-red-400 flex items-center justify-center text-[10px] font-bold">
                                    PMP
                                  </div>
                                )}
                              </div>
                            </div>

                            <Link
                              href={`/admin/projects/${project.id}`}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-white/70 group-hover:text-red-500 transition-colors"
                            >
                              <span>Manage Project</span>
                              <ChevronRight size={14} />
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )
          ) : viewMode === "board" ? (
            /* Board View — drag a card between columns to change status. */
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
              {BOARD_STATUSES.map((status) => {
                const columnProjects = boardProjects.filter(
                  (p) => p.status === status
                );
                return (
                  <div
                    key={status}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDropStatus(status);
                    }}
                    onDragLeave={() =>
                      setDropStatus((s) => (s === status ? null : s))
                    }
                    onDrop={(e) => {
                      e.preventDefault();
                      if (dragId) {
                        const project = projects.find((p) => p.id === dragId);
                        if (project && project.status !== status) {
                          handleStatusChange(dragId, status);
                        }
                      }
                      setDragId(null);
                      setDropStatus(null);
                    }}
                    className={`rounded-2xl border border-white/10 border-t-2 ${boardAccent[status]} bg-neutral-950 min-h-[160px] ${
                      dropStatus === status && dragId ? "bg-white/5" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
                      <span className="text-white/80 text-sm font-medium">
                        {status.replace("_", " ")}
                      </span>
                      <Badge variant="secondary">{columnProjects.length}</Badge>
                    </div>
                    <div className="p-2 space-y-2">
                      {columnProjects.map((project) => (
                        <div
                          key={project.id}
                          draggable
                          onDragStart={(e) => {
                            setDragId(project.id);
                            e.dataTransfer.effectAllowed = "move";
                          }}
                          onDragEnd={() => {
                            setDragId(null);
                            setDropStatus(null);
                          }}
                          className={`rounded-xl border bg-neutral-900 p-3 cursor-grab active:cursor-grabbing space-y-2 ${
                            isProjectOverdue(project)
                              ? "border-red-600/60"
                              : "border-white/10"
                          } ${dragId === project.id ? "opacity-40" : ""}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <Link
                              href={`/admin/projects/${project.id}`}
                              className="text-white font-medium text-sm hover:underline min-w-0 truncate"
                            >
                              {project.title}
                            </Link>
                            {isProjectOverdue(project) && (
                              <span className="flex items-center gap-1 text-red-500 text-[10px] font-semibold uppercase shrink-0">
                                <AlertCircle size={12} />
                                {ta("overdue")}
                              </span>
                            )}
                          </div>
                          {project.clientName && (
                            <p className="text-white/40 text-xs truncate">
                              {project.clientName}
                            </p>
                          )}
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-white/40">
                              {project.category.replace(/_/g, " ")}
                            </span>
                            {project.deadline && (
                              <span
                                className={`flex items-center gap-1 ${
                                  isProjectOverdue(project)
                                    ? "text-red-500"
                                    : "text-white/40"
                                }`}
                              >
                                <Clock size={12} />
                                {format(new Date(project.deadline), "MMM d")}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Table View */
            <Card className="bg-neutral-900/90 border border-white/10 overflow-hidden">
              <CardContent className="p-0">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-xs font-medium text-white/60">
                      <th className="p-4">Project</th>
                      <th className="p-4">Category</th>
                      <th className="p-4">Client</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Progress</th>
                      <th className="p-4">Deadline</th>
                      <th className="w-10 p-4"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredActiveProjects.map((project) => (
                      <tr
                        key={project.id}
                        className={`border-b border-white/5 hover:bg-white/5 transition-colors text-sm ${
                          isProjectOverdue(project) ? "bg-red-950/20" : ""
                        }`}
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={project.thumbnail}
                              alt={project.title}
                              className="w-10 h-10 rounded-lg object-cover"
                            />
                            <div>
                              <p className="font-semibold text-white">
                                {project.title}
                              </p>
                              <p className="text-white/40 text-xs">
                                /{project.slug}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-white/60">
                          {project.category.replace("_", " ")}
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
                            <DropdownMenuContent className="bg-neutral-900 border-white/10 text-white">
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
                        <td className="p-4">
                          <div className="w-24 bg-white/10 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-red-600 h-full"
                              style={{ width: `${project.progress}%` }}
                            />
                          </div>
                          <span className="text-[11px] text-white/50 font-medium">
                            {project.progress}%
                          </span>
                        </td>
                        <td
                          className={`p-4 text-xs ${
                            isProjectOverdue(project)
                              ? "text-red-500 font-medium"
                              : "text-white/60"
                          }`}
                        >
                          {project.deadline
                            ? format(new Date(project.deadline), "MMM d, yyyy")
                            : "-"}
                          {isProjectOverdue(project) && ` — ${ta("overdue")}`}
                        </td>
                        <td className="p-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical size={16} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-neutral-900 border-white/10 text-white">
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/projects/${project.id}`}>
                                  <Edit size={16} className="mr-2" />
                                  {tc("edit")}
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteProject(project.id)}
                                className="text-red-500"
                              >
                                <Trash2 size={16} className="mr-2" />
                                {tc("delete")}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {/* Completed Projects Section */}
          {completedProjects.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4 pt-4 border-t border-white/10"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">
                  Completed Projects
                </h3>
                <span className="text-xs text-white/40 font-medium">
                  {completedProjects.length} archived
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {completedProjects.map((comp) => (
                  <Link
                    key={comp.id}
                    href={`/admin/projects/${comp.id}`}
                    className="group"
                  >
                    <div className="bg-neutral-900/80 border border-white/10 rounded-xl overflow-hidden hover:border-emerald-500/50 transition-all p-3 flex items-center gap-3">
                      <img
                        src={comp.thumbnail}
                        alt={comp.title}
                        className="w-14 h-14 rounded-lg object-cover shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-semibold text-white truncate group-hover:text-emerald-400 transition-colors">
                          {comp.title}
                        </h4>
                        <div className="flex items-center gap-1 text-[11px] text-emerald-400 mt-1">
                          <CheckCircle2 size={12} />
                          <span>Completed</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Right Sidebar Widgets (1 col) */}
        <div className="space-y-6">
          {/* Upcoming Milestones Widget */}
          <Card className="bg-neutral-900/90 border border-white/10 rounded-2xl overflow-hidden shadow-xl">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Calendar size={18} className="text-red-500" />
                  Upcoming Milestones
                </h3>
              </div>

              {upcomingMilestones.length === 0 ? (
                <p className="text-xs text-white/40 py-3 text-center">
                  No upcoming milestones.
                </p>
              ) : (
                <div className="space-y-3">
                  {upcomingMilestones.map((ms) => (
                    <Link
                      key={ms.id}
                      href={`/admin/projects/${ms.projectId}`}
                      className="block group"
                    >
                      <div className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                        <div className="px-2 py-1 rounded-md bg-red-600/20 text-red-400 text-xs font-bold shrink-0 text-center min-w-[52px]">
                          {ms.deadline
                            ? format(new Date(ms.deadline), "d MMM")
                            : "Soon"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-white group-hover:text-red-400 transition-colors truncate">
                            {ms.title}
                          </p>
                          <p className="text-[11px] text-white/40 truncate">
                            {ms.projectTitle}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Client Actions / Approvals Queue Widget */}
          <Card className="bg-neutral-900/90 border border-white/10 rounded-2xl overflow-hidden shadow-xl">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <AlertCircle size={18} className="text-amber-500" />
                  Review Queue
                </h3>
              </div>

              {clientActions.length === 0 ? (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
                  <CheckCircle2
                    size={20}
                    className="text-emerald-400 mx-auto mb-1.5"
                  />
                  <p className="text-xs text-emerald-300 font-medium">
                    No pending task approvals or reviews.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {clientActions.map((action) => (
                    <div
                      key={action.id}
                      className="p-3 bg-neutral-950 rounded-xl border border-white/10 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-white truncate">
                          {action.title}
                        </p>
                        <p className="text-[11px] text-amber-400 font-medium mt-0.5">
                          {action.projectTitle}
                        </p>
                      </div>
                      <Link href={action.actionUrl}>
                        <Button
                          size="sm"
                          className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 h-8 rounded-lg"
                        >
                          Review
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity Feed Widget */}
          <Card className="bg-neutral-900/90 border border-white/10 rounded-2xl overflow-hidden shadow-xl">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Clock size={18} className="text-blue-400" />
                  Recent Activity
                </h3>
              </div>

              {recentActivity.length === 0 ? (
                <p className="text-xs text-white/40 py-3 text-center">
                  No recent activity yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {recentActivity.map((item) => (
                    <Link
                      key={item.id}
                      href={`/admin/projects/${item.projectId}`}
                      className="flex items-start gap-3 text-xs group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/60 shrink-0 mt-0.5 group-hover:border-red-500/40 group-hover:text-red-400 transition-colors">
                        {item.type === "upload" ? (
                          <Upload size={13} />
                        ) : item.type === "comment" ? (
                          <MessageSquare size={13} />
                        ) : (
                          <CheckCircle2 size={13} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-white/80 group-hover:text-white transition-colors line-clamp-2 leading-relaxed">
                          {item.message}
                        </p>
                        <p className="text-[10px] text-white/40 mt-0.5 font-medium">
                          {formatDistanceToNow(new Date(item.timestamp), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create Project Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-lg bg-neutral-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">
              {ta("newProject")}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateProject} className="space-y-4 mt-2">
            {error && (
              <div className="bg-red-600/10 border border-red-600/20 rounded-lg p-3">
                <p className="text-red-500 text-sm">{error}</p>
              </div>
            )}
            <div>
              <label className="block text-xs uppercase font-medium text-white/60 mb-1">
                {tc("title")} *
              </label>
              <Input
                value={createForm.title}
                onChange={(e) => {
                  setCreateForm({
                    ...createForm,
                    title: e.target.value,
                    slug: generateSlug(e.target.value),
                  });
                }}
                placeholder={tc("title")}
                required
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <div>
              <label className="block text-xs uppercase font-medium text-white/60 mb-1">
                {ta("slug")}
              </label>
              <Input
                value={createForm.slug}
                onChange={(e) =>
                  setCreateForm({ ...createForm, slug: e.target.value })
                }
                placeholder={ta("slug")}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <div>
              <label className="block text-xs uppercase font-medium text-white/60 mb-1">
                {tc("description")} *
              </label>
              <Textarea
                value={createForm.description}
                onChange={(e) =>
                  setCreateForm({ ...createForm, description: e.target.value })
                }
                placeholder={tc("description")}
                required
                rows={3}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <div>
              <label className="block text-xs uppercase font-medium text-white/60 mb-1">
                {ta("deadline")}
              </label>
              <Input
                type="date"
                value={createForm.deadline}
                onChange={(e) =>
                  setCreateForm({ ...createForm, deadline: e.target.value })
                }
                className="bg-white/5 border-white/10 text-white dark:[color-scheme:dark]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase font-medium text-white/60 mb-1">
                  {tc("category")}
                </label>
                <Select
                  value={createForm.category}
                  onValueChange={(value) =>
                    setCreateForm({ ...createForm, category: value })
                  }
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder={tc("category")} />
                  </SelectTrigger>
                  <SelectContent className="bg-neutral-900 border-white/10 text-white">
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-xs uppercase font-medium text-white/60 mb-1">
                  {tc("status")}
                </label>
                <Select
                  value={createForm.status}
                  onValueChange={(value) =>
                    setCreateForm({ ...createForm, status: value })
                  }
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder={tc("status")} />
                  </SelectTrigger>
                  <SelectContent className="bg-neutral-900 border-white/10 text-white">
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
              <label className="block text-xs uppercase font-medium text-white/60 mb-1">
                {tc("client")}
              </label>
              <Select
                value={createForm.clientId || "none"}
                onValueChange={(value) =>
                  setCreateForm({
                    ...createForm,
                    clientId: value === "none" ? "" : value,
                  })
                }
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder={tc("client")} />
                </SelectTrigger>
                <SelectContent className="bg-neutral-900 border-white/10 text-white">
                  <SelectItem value="none">Unassigned</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name || client.email || client.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-white/70 hover:text-white"
              >
                {tc("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={createLoading}
                className="bg-red-600 hover:bg-red-700 text-white font-medium"
              >
                {createLoading ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={16} />
                    {tc("loading")}
                  </>
                ) : (
                  tc("create")
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
