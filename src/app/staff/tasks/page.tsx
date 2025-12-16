"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  CheckSquare,
  Loader2,
  Calendar,
  Folder,
  Play,
  Send,
  CheckCircle2,
  Filter,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  milestone: {
    title: string;
    project: {
      id: string;
      title: string;
      slug: string;
    };
  };
}

const statusColors = {
  TODO: "secondary",
  IN_PROGRESS: "warning",
  SUBMITTED: "default",
  APPROVED: "success",
  REJECTED: "destructive",
} as const;

const priorityColors = {
  LOW: "secondary",
  MEDIUM: "default",
  HIGH: "warning",
  URGENT: "destructive",
} as const;

type FilterStatus = "all" | "TODO" | "IN_PROGRESS" | "SUBMITTED" | "APPROVED" | "REJECTED";

export default function StaffTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [updatingTask, setUpdatingTask] = useState<string | null>(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await fetch("/api/staff/tasks");
      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
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
        fetchTasks();
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

  const filteredTasks = filter === "all" ? tasks : tasks.filter((t) => t.status === filter);

  const statusCounts = {
    all: tasks.length,
    TODO: tasks.filter((t) => t.status === "TODO").length,
    IN_PROGRESS: tasks.filter((t) => t.status === "IN_PROGRESS").length,
    SUBMITTED: tasks.filter((t) => t.status === "SUBMITTED").length,
    APPROVED: tasks.filter((t) => t.status === "APPROVED").length,
    REJECTED: tasks.filter((t) => t.status === "REJECTED").length,
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
        <h1 className="text-3xl font-bold text-white mb-2">My Tasks</h1>
        <p className="text-white/60">All tasks assigned to you across projects</p>
      </motion.div>

      {/* Filter Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-wrap gap-2 mb-6"
      >
        {(["all", "TODO", "IN_PROGRESS", "SUBMITTED", "APPROVED", "REJECTED"] as FilterStatus[]).map(
          (status) => (
            <Button
              key={status}
              variant={filter === status ? "default" : "ghost"}
              size="sm"
              onClick={() => setFilter(status)}
              className="gap-2"
            >
              {status === "all" ? "All" : status.replace("_", " ")}
              <span className="text-xs opacity-70">({statusCounts[status]})</span>
            </Button>
          )
        )}
      </motion.div>

      {/* Tasks List */}
      {filteredTasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckSquare size={48} className="text-white/20 mx-auto mb-4" />
            <p className="text-white/60">
              {filter === "all" ? "No tasks assigned yet" : `No ${filter.replace("_", " ")} tasks`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredTasks.map((task, index) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge
                          variant={statusColors[task.status as keyof typeof statusColors]}
                        >
                          {task.status.replace("_", " ")}
                        </Badge>
                        <Badge
                          variant={priorityColors[task.priority as keyof typeof priorityColors]}
                        >
                          {task.priority}
                        </Badge>
                      </div>

                      <h3 className="text-lg font-semibold text-white mb-1">
                        {task.title}
                      </h3>
                      {task.description && (
                        <p className="text-white/50 text-sm mb-3">{task.description}</p>
                      )}

                      <div className="flex items-center gap-4 text-sm text-white/50">
                        <Link
                          href={`/staff/projects/${task.milestone.project.slug}`}
                          className="flex items-center gap-1 hover:text-white transition-colors"
                        >
                          <Folder size={14} />
                          {task.milestone.project.title}
                        </Link>
                        <span>&bull;</span>
                        <span>{task.milestone.title}</span>
                        {task.dueDate && (
                          <>
                            <span>&bull;</span>
                            <div className="flex items-center gap-1">
                              <Calendar size={14} />
                              {format(new Date(task.dueDate), "MMM d, yyyy")}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 ml-4">
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
                              Submit
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
                        <span className="text-sm text-yellow-500">Awaiting Review</span>
                      )}
                      {task.status === "APPROVED" && (
                        <span className="text-sm text-green-500 flex items-center gap-1">
                          <CheckCircle2 size={14} />
                          Completed
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
