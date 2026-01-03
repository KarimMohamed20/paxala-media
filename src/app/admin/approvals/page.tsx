"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  User,
  Folder,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslations } from 'next-intl';

interface TaskForApproval {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  dueDate: string | null;
  submittedAt: string | null;
  assignee: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  } | null;
  milestone: {
    id: string;
    title: string;
    project: {
      id: string;
      title: string;
      slug: string;
    };
  };
}

const priorityColors = {
  LOW: "secondary",
  MEDIUM: "default",
  HIGH: "warning",
  URGENT: "destructive",
} as const;

export default function ApprovalsPage() {
  const ta = useTranslations('adminUI');
  const tc = useTranslations('common');
  const [tasks, setTasks] = useState<TaskForApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskForApproval | null>(
    null
  );
  const [rejectionReason, setRejectionReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPendingApprovals();
  }, []);

  const fetchPendingApprovals = async () => {
    try {
      const response = await fetch("/api/tasks?pendingApproval=true");
      if (!response.ok) throw new Error("Failed to fetch tasks");
      const data = await response.json();
      setTasks(data);
    } catch (error) {
      console.error("Error fetching pending approvals:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (taskId: string) => {
    setSubmitting(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "APPROVED" }),
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "Failed to approve task");
        return;
      }

      fetchPendingApprovals();
    } catch (error) {
      console.error("Error approving task:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const openRejectModal = (task: TaskForApproval) => {
    setSelectedTask(task);
    setRejectionReason("");
    setRejectModalOpen(true);
  };

  const handleReject = async () => {
    if (!selectedTask || !rejectionReason.trim()) {
      alert(ta('requiredFields'));
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/tasks/${selectedTask.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "REJECTED",
          rejectionReason: rejectionReason.trim(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "Failed to reject task");
        return;
      }

      setRejectModalOpen(false);
      fetchPendingApprovals();
    } catch (error) {
      console.error("Error rejecting task:", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-white mb-2">{ta('pendingApprovals')}</h1>
        <p className="text-white/60">
          {ta('reviewApprovals')}
        </p>
      </motion.div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-white/40" size={32} />
        </div>
      ) : tasks.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <CheckCircle size={64} className="text-green-500/40 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            {ta('allCaughtUp')}
          </h3>
          <p className="text-white/60">
            {ta('noApprovals')}
          </p>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          {tasks.map((task, index) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * index }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Task Header */}
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">
                          {task.title}
                        </h3>
                        <Badge
                          variant={
                            priorityColors[
                              task.priority as keyof typeof priorityColors
                            ] || "secondary"
                          }
                        >
                          {task.priority}
                        </Badge>
                      </div>

                      {/* Task Description */}
                      {task.description && (
                        <p className="text-white/60 mb-4">{task.description}</p>
                      )}

                      {/* Task Meta */}
                      <div className="flex flex-wrap items-center gap-4 text-sm text-white/60">
                        <Link
                          href={`/admin/projects/${task.milestone.project.id}`}
                          className="flex items-center gap-1 hover:text-white transition-colors"
                        >
                          <Folder size={14} />
                          {task.milestone.project.title}
                        </Link>
                        <span className="flex items-center gap-1">
                          <Clock size={14} />
                          {task.milestone.title}
                        </span>
                        {task.assignee && (
                          <span className="flex items-center gap-1">
                            <User size={14} />
                            {task.assignee.name || task.assignee.email}
                          </span>
                        )}
                        {task.dueDate && (
                          <span className="flex items-center gap-1">
                            <Calendar size={14} />
                            {ta('due')} {format(new Date(task.dueDate), "MMM d, yyyy")}
                          </span>
                        )}
                        {task.submittedAt && (
                          <span className="flex items-center gap-1">
                            <AlertCircle size={14} />
                            {ta('submitted')}{" "}
                            {format(new Date(task.submittedAt), "MMM d, h:mm a")}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openRejectModal(task)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-600/10"
                        disabled={submitting}
                      >
                        <XCircle size={18} className="mr-1" />
                        {tc('reject')}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleApprove(task.id)}
                        className="bg-green-600 hover:bg-green-700"
                        disabled={submitting}
                      >
                        {submitting ? (
                          <Loader2 className="animate-spin mr-1" size={16} />
                        ) : (
                          <CheckCircle size={18} className="mr-1" />
                        )}
                        {tc('approve')}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Rejection Modal */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{ta('rejectTask')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-white/60">
              {ta('rejectFeedback')}{" "}
              <span className="text-white font-medium">
                {selectedTask?.assignee?.name || selectedTask?.assignee?.email}
              </span>
            </p>
            <div>
              <label className="block text-sm text-white/70 mb-2">
                {ta('rejectionReason')} <span className="text-red-500">*</span>
              </label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder={ta('rejectionReason')}
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="ghost"
                onClick={() => setRejectModalOpen(false)}
              >
                {tc('cancel')}
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={submitting || !rejectionReason.trim()}
              >
                {submitting ? (
                  <Loader2 className="animate-spin mr-2" size={16} />
                ) : null}
                {ta('rejectTask')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
