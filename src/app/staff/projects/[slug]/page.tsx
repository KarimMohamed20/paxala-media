"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  ArrowLeft,
  Folder,
  Loader2,
  CheckCircle2,
  Clock,
  Calendar,
  ChevronDown,
  ChevronUp,
  Play,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  isVisible: boolean;
}

interface Milestone {
  id: string;
  title: string;
  description: string | null;
  tasks: Task[];
}

interface Project {
  id: string;
  title: string;
  slug: string;
  description: string;
  status: string;
  category: string;
  client: { name: string | null } | null;
  milestones: Milestone[];
}

const statusColors = {
  TODO: "secondary",
  IN_PROGRESS: "warning",
  SUBMITTED: "default",
  APPROVED: "success",
  REJECTED: "destructive",
} as const;

const priorityColors = {
  LOW: "text-gray-400",
  MEDIUM: "text-blue-400",
  HIGH: "text-orange-400",
  URGENT: "text-red-500",
} as const;

export default function StaffProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set());
  const [updatingTask, setUpdatingTask] = useState<string | null>(null);

  useEffect(() => {
    fetchProject();
  }, [resolvedParams.slug]);

  const fetchProject = async () => {
    try {
      const response = await fetch("/api/staff/projects");
      if (response.ok) {
        const projects = await response.json();
        const found = projects.find((p: Project) => p.slug === resolvedParams.slug);
        if (found) {
          setProject(found);
          setExpandedMilestones(new Set(found.milestones.map((m: Milestone) => m.id)));
        }
      }
    } catch (error) {
      console.error("Error fetching project:", error);
    } finally {
      setLoading(false);
    }
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

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    setUpdatingTask(taskId);
    try {
      const response = await fetch(`/api/tasks/${taskId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        fetchProject();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to update status");
      }
    } catch (error) {
      console.error("Error updating task:", error);
    } finally {
      setUpdatingTask(null);
    }
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
        <p className="text-white/60">Project not found or you don&apos;t have access</p>
        <Button onClick={() => router.back()} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  const totalTasks = project.milestones.reduce((sum, m) => sum + m.tasks.length, 0);
  const completedTasks = project.milestones.reduce(
    (sum, m) => sum + m.tasks.filter((t) => t.status === "APPROVED").length,
    0
  );

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
            <div className="w-14 h-14 rounded-xl bg-blue-600/20 flex items-center justify-center text-blue-500">
              <Folder size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{project.title}</h1>
              <p className="text-white/60">
                {project.category.replace("_", " ")}
                {project.client?.name && ` • ${project.client.name}`}
              </p>
            </div>
          </div>
          <Badge variant="secondary">{project.status.replace("_", " ")}</Badge>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-3 gap-4 mb-8"
      >
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center text-blue-500">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{project.milestones.length}</p>
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
                  {completedTasks}/{totalTasks}
                </p>
                <p className="text-white/60 text-sm">Tasks Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center text-purple-500">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%
                </p>
                <p className="text-white/60 text-sm">Overall Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Milestones and Tasks */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-xl font-semibold text-white mb-4">My Tasks</h2>

        {project.milestones.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-white/60">No tasks assigned in this project</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {project.milestones.map((milestone, index) => (
              <Card key={milestone.id}>
                <CardHeader className="pb-2">
                  <button
                    onClick={() => toggleMilestone(milestone.id)}
                    className="flex items-center justify-between w-full text-left"
                  >
                    <div className="flex items-center gap-3">
                      {expandedMilestones.has(milestone.id) ? (
                        <ChevronUp size={20} className="text-white/60" />
                      ) : (
                        <ChevronDown size={20} className="text-white/60" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-white/40 text-sm">#{index + 1}</span>
                          <CardTitle className="text-lg">{milestone.title}</CardTitle>
                        </div>
                        {milestone.description && (
                          <p className="text-white/60 text-sm mt-1">
                            {milestone.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-white/60">
                      <span>{calculateProgress(milestone.tasks)}%</span>
                      <span>({milestone.tasks.length} tasks)</span>
                    </div>
                  </button>
                </CardHeader>

                {expandedMilestones.has(milestone.id) && (
                  <CardContent>
                    {/* Progress bar */}
                    <div className="mb-4">
                      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all"
                          style={{ width: `${calculateProgress(milestone.tasks)}%` }}
                        />
                      </div>
                    </div>

                    {milestone.tasks.length === 0 ? (
                      <p className="text-white/50 text-center py-4">
                        No tasks assigned to you in this milestone
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {milestone.tasks.map((task) => (
                          <div
                            key={task.id}
                            className="p-4 bg-white/5 rounded-lg"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h4 className="text-white font-medium">{task.title}</h4>
                                {task.description && (
                                  <p className="text-white/50 text-sm mt-1">
                                    {task.description}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-xs ${
                                    priorityColors[task.priority as keyof typeof priorityColors]
                                  }`}
                                >
                                  {task.priority}
                                </span>
                                <Badge
                                  variant={
                                    statusColors[task.status as keyof typeof statusColors]
                                  }
                                >
                                  {task.status.replace("_", " ")}
                                </Badge>
                              </div>
                            </div>

                            <div className="flex items-center justify-between mt-3">
                              <div className="flex items-center gap-4 text-sm text-white/50">
                                {task.dueDate && (
                                  <div className="flex items-center gap-1">
                                    <Calendar size={14} />
                                    {format(new Date(task.dueDate), "MMM d, yyyy")}
                                  </div>
                                )}
                              </div>

                              {/* Action Buttons */}
                              <div className="flex items-center gap-2">
                                {task.status === "TODO" && (
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => updateTaskStatus(task.id, "IN_PROGRESS")}
                                    disabled={updatingTask === task.id}
                                  >
                                    {updatingTask === task.id ? (
                                      <Loader2 className="animate-spin" size={14} />
                                    ) : (
                                      <>
                                        <Play size={14} className="mr-1" />
                                        Start
                                      </>
                                    )}
                                  </Button>
                                )}
                                {task.status === "IN_PROGRESS" && (
                                  <Button
                                    size="sm"
                                    onClick={() => updateTaskStatus(task.id, "SUBMITTED")}
                                    disabled={updatingTask === task.id}
                                  >
                                    {updatingTask === task.id ? (
                                      <Loader2 className="animate-spin" size={14} />
                                    ) : (
                                      <>
                                        <Send size={14} className="mr-1" />
                                        Submit for Review
                                      </>
                                    )}
                                  </Button>
                                )}
                                {task.status === "REJECTED" && (
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => updateTaskStatus(task.id, "IN_PROGRESS")}
                                    disabled={updatingTask === task.id}
                                  >
                                    {updatingTask === task.id ? (
                                      <Loader2 className="animate-spin" size={14} />
                                    ) : (
                                      "Rework"
                                    )}
                                  </Button>
                                )}
                                {task.status === "SUBMITTED" && (
                                  <span className="text-sm text-yellow-500">
                                    Awaiting Review
                                  </span>
                                )}
                                {task.status === "APPROVED" && (
                                  <span className="text-sm text-green-500 flex items-center gap-1">
                                    <CheckCircle2 size={14} />
                                    Completed
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
