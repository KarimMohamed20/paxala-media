"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  Folder,
  CheckSquare,
  Clock,
  AlertCircle,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Task {
  id: string;
  title: string;
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

interface Project {
  id: string;
  title: string;
  slug: string;
  status: string;
  category: string;
  client: { name: string | null } | null;
  milestones: {
    tasks: Task[];
  }[];
}

const priorityColors = {
  LOW: "secondary",
  MEDIUM: "default",
  HIGH: "warning",
  URGENT: "destructive",
} as const;

const statusColors = {
  TODO: "secondary",
  IN_PROGRESS: "warning",
  SUBMITTED: "default",
  APPROVED: "success",
  REJECTED: "destructive",
} as const;

export default function StaffDashboard() {
  const { data: session } = useSession();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [projectsRes, tasksRes] = await Promise.all([
        fetch("/api/staff/projects"),
        fetch("/api/staff/tasks"),
      ]);

      if (projectsRes.ok) {
        const projectsData = await projectsRes.json();
        setProjects(projectsData);
      }

      if (tasksRes.ok) {
        const tasksData = await tasksRes.json();
        setTasks(tasksData);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const pendingTasks = tasks.filter(
    (t) => t.status === "TODO" || t.status === "IN_PROGRESS"
  );
  const urgentTasks = tasks.filter((t) => t.priority === "URGENT" || t.priority === "HIGH");
  const overdueTasks = tasks.filter(
    (t) =>
      t.dueDate &&
      new Date(t.dueDate) < new Date() &&
      t.status !== "APPROVED"
  );

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
        <h1 className="text-3xl font-bold text-white mb-2">
          Welcome back, {session?.user?.name || "Staff"}
        </h1>
        <p className="text-white/60">
          Here&apos;s an overview of your assigned projects and tasks
        </p>
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
                <Folder size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{projects.length}</p>
                <p className="text-white/60 text-sm">Assigned Projects</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-600/20 flex items-center justify-center text-yellow-500">
                <CheckSquare size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{pendingTasks.length}</p>
                <p className="text-white/60 text-sm">Pending Tasks</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-600/20 flex items-center justify-center text-orange-500">
                <AlertCircle size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{urgentTasks.length}</p>
                <p className="text-white/60 text-sm">High Priority</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-600/20 flex items-center justify-center text-red-500">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{overdueTasks.length}</p>
                <p className="text-white/60 text-sm">Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Recent Tasks */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>My Tasks</CardTitle>
              <Link href="/staff/tasks">
                <Button variant="ghost" size="sm">
                  View All
                  <ArrowRight size={14} className="ml-2" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <p className="text-white/50 text-center py-8">
                  No tasks assigned yet
                </p>
              ) : (
                <div className="space-y-3">
                  {tasks.slice(0, 5).map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="text-white font-medium">{task.title}</p>
                        <p className="text-white/50 text-sm">
                          {task.milestone.project.title} &bull; {task.milestone.title}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            priorityColors[task.priority as keyof typeof priorityColors]
                          }
                        >
                          {task.priority}
                        </Badge>
                        <Badge
                          variant={
                            statusColors[task.status as keyof typeof statusColors]
                          }
                        >
                          {task.status.replace("_", " ")}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Assigned Projects */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>My Projects</CardTitle>
              <Link href="/staff/projects">
                <Button variant="ghost" size="sm">
                  View All
                  <ArrowRight size={14} className="ml-2" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {projects.length === 0 ? (
                <p className="text-white/50 text-center py-8">
                  No projects assigned yet
                </p>
              ) : (
                <div className="space-y-3">
                  {projects.slice(0, 5).map((project) => {
                    const totalTasks = project.milestones.reduce(
                      (sum, m) => sum + m.tasks.length,
                      0
                    );
                    return (
                      <Link
                        key={project.id}
                        href={`/staff/projects/${project.slug}`}
                        className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center text-blue-500">
                            <Folder size={18} />
                          </div>
                          <div>
                            <p className="text-white font-medium">{project.title}</p>
                            <p className="text-white/50 text-sm">
                              {totalTasks} tasks assigned
                            </p>
                          </div>
                        </div>
                        <Badge variant="secondary">
                          {project.status.replace("_", " ")}
                        </Badge>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
