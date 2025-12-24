"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  ArrowLeft,
  Folder,
  Plus,
  Loader2,
  DollarSign,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  MoreVertical,
  Trash2,
  Edit,
  ChevronDown,
  ChevronUp,
  Users,
  Calendar,
  AlertCircle,
  FileText,
  Link as LinkIcon,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Milestone, Task, StaffMember } from "@/types/milestone";

interface ProjectStaff {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

interface Project {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  status: string;
  clientName: string | null;
  staff: ProjectStaff[];
}

interface ProjectFile {
  id: string;
  name: string;
  url: string;
  type: string;
  description: string | null;
  taskId: string | null;
  task: { id: string; title: string } | null;
  createdAt: string;
}

const statusColors = {
  DRAFT: "secondary",
  IN_PROGRESS: "warning",
  REVIEW: "default",
  COMPLETED: "success",
  ARCHIVED: "secondary",
} as const;

const taskStatusColors = {
  TODO: "secondary",
  IN_PROGRESS: "warning",
  SUBMITTED: "default",
  APPROVED: "success",
  REJECTED: "destructive",
} as const;

const paymentStatusColors = {
  UNPAID: "destructive",
  PARTIAL: "warning",
  PAID: "success",
} as const;

const priorityColors = {
  LOW: "text-gray-400",
  MEDIUM: "text-blue-400",
  HIGH: "text-orange-400",
  URGENT: "text-red-500",
} as const;

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(
    new Set()
  );

  // Files state
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [fileModalOpen, setFileModalOpen] = useState(false);
  const [fileForm, setFileForm] = useState({
    name: "",
    url: "",
    type: "link",
    description: "",
    taskId: "",
  });

  // Modal states
  const [milestoneModalOpen, setMilestoneModalOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(
    null
  );
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(
    null
  );

  // Form states
  const [milestoneForm, setMilestoneForm] = useState({
    title: "",
    description: "",
    price: "",
    isVisible: true,
  });
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    priority: "MEDIUM",
    dueDate: "",
    isVisible: true,
    assigneeId: "",
  });
  const [paymentForm, setPaymentForm] = useState({
    paymentStatus: "UNPAID",
    paymentAmount: "",
    paymentDate: "",
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchProject();
    fetchMilestones();
    fetchStaff();
    fetchFiles();
  }, [resolvedParams.id]);

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/projects/${resolvedParams.id}`);
      if (!response.ok) throw new Error("Failed to fetch project");
      const data = await response.json();
      setProject(data);
    } catch (error) {
      console.error("Error fetching project:", error);
    }
  };

  const fetchMilestones = async () => {
    try {
      const response = await fetch(
        `/api/milestones?projectId=${resolvedParams.id}`
      );
      if (!response.ok) throw new Error("Failed to fetch milestones");
      const data = await response.json();
      setMilestones(data);
      // Expand all milestones by default
      setExpandedMilestones(new Set(data.map((m: Milestone) => m.id)));
    } catch (error) {
      console.error("Error fetching milestones:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const response = await fetch("/api/users/staff");
      if (!response.ok) throw new Error("Failed to fetch staff");
      const data = await response.json();
      setStaff(data);
    } catch (error) {
      console.error("Error fetching staff:", error);
    }
  };

  const fetchFiles = async () => {
    try {
      const response = await fetch(`/api/projects/${resolvedParams.id}/files`);
      if (!response.ok) throw new Error("Failed to fetch files");
      const data = await response.json();
      setFiles(data);
    } catch (error) {
      console.error("Error fetching files:", error);
    }
  };

  const handleAddFile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch(`/api/projects/${resolvedParams.id}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...fileForm,
          taskId: fileForm.taskId || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add file");
      }

      setFileModalOpen(false);
      setFileForm({
        name: "",
        url: "",
        type: "link",
        description: "",
        taskId: "",
      });
      fetchFiles();
    } catch (error) {
      console.error("Error adding file:", error);
      alert(error instanceof Error ? error.message : "Failed to add file");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm("Are you sure you want to remove this file?")) return;

    try {
      const response = await fetch(
        `/api/projects/${resolvedParams.id}/files/${fileId}`,
        { method: "DELETE" }
      );
      if (!response.ok) throw new Error("Failed to delete file");
      fetchFiles();
    } catch (error) {
      console.error("Error deleting file:", error);
    }
  };

  // Get all tasks from milestones for the file dropdown
  const getAllTasks = () => {
    return milestones.flatMap((m) =>
      (m.tasks || []).map((t) => ({
        id: t.id,
        title: t.title,
        milestoneName: m.title,
      }))
    );
  };

  const toggleMilestone = (id: string) => {
    const newExpanded = new Set(expandedMilestones);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedMilestones(newExpanded);
  };

  const openMilestoneModal = (milestone?: Milestone) => {
    if (milestone) {
      setEditingMilestone(milestone);
      setMilestoneForm({
        title: milestone.title,
        description: milestone.description || "",
        price: milestone.price?.toString() || "",
        isVisible: milestone.isVisible,
      });
    } else {
      setEditingMilestone(null);
      setMilestoneForm({
        title: "",
        description: "",
        price: "",
        isVisible: true,
      });
    }
    setMilestoneModalOpen(true);
  };

  const openTaskModal = (milestoneId: string, task?: Task) => {
    setSelectedMilestoneId(milestoneId);
    if (task) {
      setEditingTask(task);
      setTaskForm({
        title: task.title,
        description: task.description || "",
        priority: task.priority,
        dueDate: task.dueDate ? task.dueDate.split("T")[0] : "",
        isVisible: task.isVisible,
        assigneeId: task.assigneeId || "",
      });
    } else {
      setEditingTask(null);
      setTaskForm({
        title: "",
        description: "",
        priority: "MEDIUM",
        dueDate: "",
        isVisible: true,
        assigneeId: "",
      });
    }
    setTaskModalOpen(true);
  };

  const openPaymentModal = (milestone: Milestone) => {
    setEditingMilestone(milestone);
    setPaymentForm({
      paymentStatus: milestone.paymentStatus,
      paymentAmount: milestone.paymentAmount?.toString() || "",
      paymentDate: milestone.paymentDate
        ? milestone.paymentDate.split("T")[0]
        : "",
    });
    setPaymentModalOpen(true);
  };

  const handleMilestoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = editingMilestone
        ? `/api/milestones/${editingMilestone.id}`
        : "/api/milestones";
      const method = editingMilestone ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...milestoneForm,
          projectId: resolvedParams.id,
        }),
      });

      if (!response.ok) throw new Error("Failed to save milestone");

      setMilestoneModalOpen(false);
      fetchMilestones();
    } catch (error) {
      console.error("Error saving milestone:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = editingTask ? `/api/tasks/${editingTask.id}` : "/api/tasks";
      const method = editingTask ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...taskForm,
          milestoneId: selectedMilestoneId,
        }),
      });

      if (!response.ok) throw new Error("Failed to save task");

      setTaskModalOpen(false);
      fetchMilestones();
    } catch (error) {
      console.error("Error saving task:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMilestone) return;
    setSubmitting(true);

    try {
      const response = await fetch(
        `/api/milestones/${editingMilestone.id}/payment`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(paymentForm),
        }
      );

      if (!response.ok) throw new Error("Failed to update payment");

      setPaymentModalOpen(false);
      fetchMilestones();
    } catch (error) {
      console.error("Error updating payment:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMilestone = async (id: string) => {
    if (!confirm("Are you sure you want to delete this milestone?")) return;

    try {
      const response = await fetch(`/api/milestones/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete milestone");
      fetchMilestones();
    } catch (error) {
      console.error("Error deleting milestone:", error);
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;

    try {
      const response = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete task");
      fetchMilestones();
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  const handleToggleVisibility = async (
    type: "milestone" | "task",
    id: string,
    currentVisibility: boolean
  ) => {
    try {
      const url =
        type === "milestone" ? `/api/milestones/${id}` : `/api/tasks/${id}`;
      const response = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isVisible: !currentVisibility }),
      });
      if (!response.ok) throw new Error("Failed to toggle visibility");
      fetchMilestones();
    } catch (error) {
      console.error("Error toggling visibility:", error);
    }
  };

  const handleTaskStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "Failed to update status");
        return;
      }
      fetchMilestones();
    } catch (error) {
      console.error("Error updating task status:", error);
    }
  };

  const openStaffModal = () => {
    if (project) {
      setSelectedStaffIds(project.staff?.map((s) => s.id) || []);
    }
    setStaffModalOpen(true);
  };

  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch(`/api/projects/${resolvedParams.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffIds: selectedStaffIds }),
      });

      if (!response.ok) throw new Error("Failed to update staff");

      setStaffModalOpen(false);
      fetchProject();
    } catch (error) {
      console.error("Error updating staff:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStaffSelection = (staffId: string) => {
    setSelectedStaffIds((prev) =>
      prev.includes(staffId)
        ? prev.filter((id) => id !== staffId)
        : [...prev, staffId]
    );
  };

  const calculateProgress = (tasks: Task[]) => {
    if (!tasks || tasks.length === 0) return 0;
    const approved = tasks.filter((t) => t.status === "APPROVED").length;
    return Math.round((approved / tasks.length) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-white/40" size={32} />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-white/60">Project not found</p>
        <Button onClick={() => router.back()} className="mt-4">
          Go Back
        </Button>
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
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft size={16} className="mr-2" />
          Back to Projects
        </Button>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-purple-600/20 flex items-center justify-center text-purple-500">
              <Folder size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{project.title}</h1>
              <p className="text-white/60">
                {project.category.replace("_", " ")}
                {project.clientName && ` • ${project.clientName}`}
              </p>
            </div>
          </div>
          <Badge
            variant={
              statusColors[project.status as keyof typeof statusColors] ||
              "secondary"
            }
          >
            {project.status.replace("_", " ")}
          </Badge>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-4 gap-4 mb-8"
      >
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center text-blue-500">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {milestones.length}
                </p>
                <p className="text-white/60 text-sm">Milestones</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-600/20 flex items-center justify-center text-green-500">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {milestones.reduce((sum, m) => sum + (m.tasks?.length || 0), 0)}
                </p>
                <p className="text-white/60 text-sm">Total Tasks</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center text-purple-500">
                <DollarSign size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  $
                  {milestones
                    .reduce((sum, m) => sum + (Number(m.price) || 0), 0)
                    .toLocaleString()}
                </p>
                <p className="text-white/60 text-sm">Total Value</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-600/20 flex items-center justify-center text-emerald-500">
                <DollarSign size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  $
                  {milestones
                    .filter((m) => m.paymentStatus === "PAID")
                    .reduce((sum, m) => sum + (Number(m.price) || 0), 0)
                    .toLocaleString()}
                </p>
                <p className="text-white/60 text-sm">Paid</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Project Staff Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mb-8"
      >
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users size={20} className="text-blue-500" />
                Assigned Staff
              </CardTitle>
              <Button size="sm" onClick={openStaffModal}>
                <Plus size={14} className="mr-2" />
                Manage Staff
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {project.staff && project.staff.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {project.staff.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-500 text-sm font-medium">
                      {member.name?.charAt(0) || member.email.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">
                        {member.name || member.email}
                      </p>
                      <p className="text-white/50 text-xs">{member.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-white/50 text-sm">No staff assigned yet</p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Files Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
        className="mb-8"
      >
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText size={20} className="text-purple-500" />
                Project Files
              </CardTitle>
              <Button size="sm" onClick={() => setFileModalOpen(true)}>
                <Plus size={14} className="mr-2" />
                Add File
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {files.length > 0 ? (
              <div className="space-y-2">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center text-purple-500">
                        <LinkIcon size={18} />
                      </div>
                      <div>
                        <p className="text-white font-medium">{file.name}</p>
                        <div className="flex items-center gap-2 text-xs text-white/50">
                          <span className="bg-white/10 px-2 py-0.5 rounded">
                            {file.type}
                          </span>
                          {file.task && (
                            <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">
                              {file.task.title}
                            </span>
                          )}
                          {file.description && (
                            <span className="text-white/40 truncate max-w-xs">
                              {file.description}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                      >
                        <a href={file.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink size={16} />
                        </a>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteFile(file.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-white/50 text-sm text-center py-4">
                No files attached yet. Add NAS or external file links here.
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Milestones Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Milestones</h2>
          <Button onClick={() => openMilestoneModal()}>
            <Plus size={16} className="mr-2" />
            Add Milestone
          </Button>
        </div>

        {milestones.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle2
                size={48}
                className="text-white/20 mx-auto mb-4"
              />
              <p className="text-white/60">No milestones yet</p>
              <Button onClick={() => openMilestoneModal()} className="mt-4">
                Create First Milestone
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {milestones.map((milestone, index) => (
              <Card key={milestone.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => toggleMilestone(milestone.id)}
                      className="flex items-center gap-3 text-left"
                    >
                      {expandedMilestones.has(milestone.id) ? (
                        <ChevronUp size={20} className="text-white/60" />
                      ) : (
                        <ChevronDown size={20} className="text-white/60" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-white/40 text-sm">
                            #{index + 1}
                          </span>
                          <CardTitle className="text-lg">
                            {milestone.title}
                          </CardTitle>
                          {!milestone.isVisible && (
                            <EyeOff size={14} className="text-white/40" />
                          )}
                        </div>
                        {milestone.description && (
                          <p className="text-white/60 text-sm mt-1">
                            {milestone.description}
                          </p>
                        )}
                      </div>
                    </button>
                    <div className="flex items-center gap-3">
                      {milestone.price && (
                        <span className="text-white font-semibold">
                          ${Number(milestone.price).toLocaleString()}
                        </span>
                      )}
                      <Badge
                        variant={
                          paymentStatusColors[
                            milestone.paymentStatus as keyof typeof paymentStatusColors
                          ]
                        }
                        className="cursor-pointer"
                        onClick={() => openPaymentModal(milestone)}
                      >
                        {milestone.paymentStatus}
                      </Badge>
                      <div className="flex items-center gap-1 text-sm text-white/60">
                        <span>{calculateProgress(milestone.tasks)}%</span>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => openMilestoneModal(milestone)}
                          >
                            <Edit size={14} className="mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              handleToggleVisibility(
                                "milestone",
                                milestone.id,
                                milestone.isVisible
                              )
                            }
                          >
                            {milestone.isVisible ? (
                              <>
                                <EyeOff size={14} className="mr-2" />
                                Hide from Client
                              </>
                            ) : (
                              <>
                                <Eye size={14} className="mr-2" />
                                Show to Client
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteMilestone(milestone.id)}
                            className="text-red-500"
                          >
                            <Trash2 size={14} className="mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                {expandedMilestones.has(milestone.id) && (
                  <CardContent>
                    {/* Progress bar */}
                    <div className="mb-4">
                      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full transition-all"
                          style={{
                            width: `${calculateProgress(milestone.tasks)}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Tasks */}
                    <div className="space-y-2">
                      {milestone.tasks?.map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <Badge
                              variant={
                                taskStatusColors[
                                  task.status as keyof typeof taskStatusColors
                                ]
                              }
                            >
                              {task.status.replace("_", " ")}
                            </Badge>
                            <span className="text-white">{task.title}</span>
                            {!task.isVisible && (
                              <EyeOff size={12} className="text-white/40" />
                            )}
                            <span
                              className={
                                priorityColors[
                                  task.priority as keyof typeof priorityColors
                                ]
                              }
                            >
                              {task.priority}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            {task.assignee && (
                              <div className="flex items-center gap-2 text-sm text-white/60">
                                <Users size={14} />
                                {task.assignee.name || task.assignee.email}
                              </div>
                            )}
                            {task.dueDate && (
                              <div className="flex items-center gap-1 text-sm text-white/60">
                                <Calendar size={14} />
                                {format(new Date(task.dueDate), "MMM d")}
                              </div>
                            )}
                            {task.status === "REJECTED" &&
                              task.rejectionReason && (
                                <div
                                  className="flex items-center gap-1 text-sm text-red-400"
                                  title={task.rejectionReason}
                                >
                                  <AlertCircle size={14} />
                                </div>
                              )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical size={14} />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() =>
                                    openTaskModal(milestone.id, task)
                                  }
                                >
                                  <Edit size={14} className="mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                {task.status === "TODO" && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleTaskStatusChange(
                                        task.id,
                                        "IN_PROGRESS"
                                      )
                                    }
                                  >
                                    Start Task
                                  </DropdownMenuItem>
                                )}
                                {task.status === "IN_PROGRESS" && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleTaskStatusChange(
                                        task.id,
                                        "SUBMITTED"
                                      )
                                    }
                                  >
                                    Submit for Review
                                  </DropdownMenuItem>
                                )}
                                {task.status === "REJECTED" && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleTaskStatusChange(
                                        task.id,
                                        "IN_PROGRESS"
                                      )
                                    }
                                  >
                                    Rework Task
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleToggleVisibility(
                                      "task",
                                      task.id,
                                      task.isVisible
                                    )
                                  }
                                >
                                  {task.isVisible ? (
                                    <>
                                      <EyeOff size={14} className="mr-2" />
                                      Hide
                                    </>
                                  ) : (
                                    <>
                                      <Eye size={14} className="mr-2" />
                                      Show
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDeleteTask(task.id)}
                                  className="text-red-500"
                                >
                                  <Trash2 size={14} className="mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Add Task Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-3 w-full border border-dashed border-white/20"
                      onClick={() => openTaskModal(milestone.id)}
                    >
                      <Plus size={14} className="mr-2" />
                      Add Task
                    </Button>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </motion.div>

      {/* Milestone Modal */}
      <Dialog open={milestoneModalOpen} onOpenChange={setMilestoneModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingMilestone ? "Edit Milestone" : "Create Milestone"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleMilestoneSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-white/70 mb-2">Title</label>
              <Input
                value={milestoneForm.title}
                onChange={(e) =>
                  setMilestoneForm({ ...milestoneForm, title: e.target.value })
                }
                placeholder="Milestone title"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-2">
                Description
              </label>
              <Textarea
                value={milestoneForm.description}
                onChange={(e) =>
                  setMilestoneForm({
                    ...milestoneForm,
                    description: e.target.value,
                  })
                }
                placeholder="Optional description"
              />
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-2">
                Price ($)
              </label>
              <Input
                type="number"
                step="0.01"
                value={milestoneForm.price}
                onChange={(e) =>
                  setMilestoneForm({ ...milestoneForm, price: e.target.value })
                }
                placeholder="0.00"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="milestoneVisible"
                checked={milestoneForm.isVisible}
                onChange={(e) =>
                  setMilestoneForm({
                    ...milestoneForm,
                    isVisible: e.target.checked,
                  })
                }
                className="rounded"
              />
              <label htmlFor="milestoneVisible" className="text-sm text-white">
                Visible to client
              </label>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setMilestoneModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <Loader2 className="animate-spin mr-2" size={16} />
                ) : null}
                {editingMilestone ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Task Modal */}
      <Dialog open={taskModalOpen} onOpenChange={setTaskModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTask ? "Edit Task" : "Create Task"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleTaskSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-white/70 mb-2">Title</label>
              <Input
                value={taskForm.title}
                onChange={(e) =>
                  setTaskForm({ ...taskForm, title: e.target.value })
                }
                placeholder="Task title"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-2">
                Description
              </label>
              <Textarea
                value={taskForm.description}
                onChange={(e) =>
                  setTaskForm({ ...taskForm, description: e.target.value })
                }
                placeholder="Optional description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Priority
                </label>
                <Select
                  value={taskForm.priority}
                  onValueChange={(value) =>
                    setTaskForm({ ...taskForm, priority: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Due Date
                </label>
                <Input
                  type="date"
                  value={taskForm.dueDate}
                  onChange={(e) =>
                    setTaskForm({ ...taskForm, dueDate: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-2">
                Assign To
              </label>
              <Select
                value={taskForm.assigneeId || "unassigned"}
                onValueChange={(value) =>
                  setTaskForm({ ...taskForm, assigneeId: value === "unassigned" ? "" : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {staff.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name || member.email} ({member.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="taskVisible"
                checked={taskForm.isVisible}
                onChange={(e) =>
                  setTaskForm({ ...taskForm, isVisible: e.target.checked })
                }
                className="rounded"
              />
              <label htmlFor="taskVisible" className="text-sm text-white">
                Visible to client
              </label>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setTaskModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <Loader2 className="animate-spin mr-2" size={16} />
                ) : null}
                {editingTask ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Payment Status</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePaymentSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-white/70 mb-2">
                Payment Status
              </label>
              <Select
                value={paymentForm.paymentStatus}
                onValueChange={(value) =>
                  setPaymentForm({
                    ...paymentForm,
                    paymentStatus: value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UNPAID">Unpaid</SelectItem>
                  <SelectItem value="PARTIAL">Partial</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {paymentForm.paymentStatus === "PARTIAL" && (
              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Amount Paid ($)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={paymentForm.paymentAmount}
                  onChange={(e) =>
                    setPaymentForm({
                      ...paymentForm,
                      paymentAmount: e.target.value,
                    })
                  }
                  placeholder="0.00"
                />
              </div>
            )}
            <div>
              <label className="block text-sm text-white/70 mb-2">
                Payment Date
              </label>
              <Input
                type="date"
                value={paymentForm.paymentDate}
                onChange={(e) =>
                  setPaymentForm({
                    ...paymentForm,
                    paymentDate: e.target.value,
                  })
                }
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setPaymentModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <Loader2 className="animate-spin mr-2" size={16} />
                ) : null}
                Update
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Staff Assignment Modal */}
      <Dialog open={staffModalOpen} onOpenChange={setStaffModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Project Staff</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleStaffSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-white/70 mb-3">
                Select staff members to assign to this project
              </label>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {staff.map((member) => (
                  <div
                    key={member.id}
                    onClick={() => toggleStaffSelection(member.id)}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedStaffIds.includes(member.id)
                        ? "bg-blue-600/20 border border-blue-500/50"
                        : "bg-white/5 border border-white/10 hover:bg-white/10"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedStaffIds.includes(member.id)}
                      onChange={() => toggleStaffSelection(member.id)}
                      className="rounded"
                    />
                    <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-500 text-sm font-medium">
                      {member.name?.charAt(0) || member.email.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">
                        {member.name || member.email}
                      </p>
                      <p className="text-white/50 text-xs">{member.role}</p>
                    </div>
                  </div>
                ))}
              </div>
              {staff.length === 0 && (
                <p className="text-white/50 text-sm text-center py-4">
                  No staff members available
                </p>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStaffModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <Loader2 className="animate-spin mr-2" size={16} />
                ) : null}
                Save ({selectedStaffIds.length} selected)
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add File Modal */}
      <Dialog open={fileModalOpen} onOpenChange={setFileModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add File Link</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddFile} className="space-y-4">
            <div>
              <label className="block text-sm text-white/70 mb-2">
                File Name
              </label>
              <Input
                value={fileForm.name}
                onChange={(e) =>
                  setFileForm({ ...fileForm, name: e.target.value })
                }
                placeholder="e.g., Project Assets Folder"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-2">
                URL / Link
              </label>
              <Input
                value={fileForm.url}
                onChange={(e) =>
                  setFileForm({ ...fileForm, url: e.target.value })
                }
                placeholder="e.g., smb://nas/projects/..."
                required
              />
              <p className="text-white/40 text-xs mt-1">
                Enter the NAS share link or any external URL
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Type
                </label>
                <Select
                  value={fileForm.type}
                  onValueChange={(value) =>
                    setFileForm({ ...fileForm, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="link">Link</SelectItem>
                    <SelectItem value="folder">Folder</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="image">Image</SelectItem>
                    <SelectItem value="document">Document</SelectItem>
                    <SelectItem value="archive">Archive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Attach to Task (optional)
                </label>
                <Select
                  value={fileForm.taskId || "project-level"}
                  onValueChange={(value) =>
                    setFileForm({ ...fileForm, taskId: value === "project-level" ? "" : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Project level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="project-level">Project level</SelectItem>
                    {getAllTasks().map((task) => (
                      <SelectItem key={task.id} value={task.id}>
                        {task.milestoneName} → {task.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-2">
                Description (optional)
              </label>
              <Textarea
                value={fileForm.description}
                onChange={(e) =>
                  setFileForm({ ...fileForm, description: e.target.value })
                }
                placeholder="Brief description of the file contents"
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setFileModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <Loader2 className="animate-spin mr-2" size={16} />
                ) : null}
                Add File
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
