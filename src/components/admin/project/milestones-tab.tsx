"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Loader2,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronRight,
  Trash2,
  Edit,
  DollarSign,
  Calendar,
  User,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Milestone {
  id: string;
  title: string;
  description: string | null;
  order: number;
  price: number | null;
  paymentStatus: "UNPAID" | "PARTIAL" | "PAID";
  paymentDate: string | null;
  paymentAmount: number | null;
  deadline: string | null;
  isVisible: boolean;
  tasks: Task[];
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: "TODO" | "IN_PROGRESS" | "SUBMITTED" | "APPROVED" | "REJECTED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate: string | null;
  isVisible: boolean;
  assignee: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

interface User {
  id: string;
  name: string | null;
  email: string;
}

export function ProjectMilestonesTab({ projectId }: { projectId: string }) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set());
  const [showNewMilestone, setShowNewMilestone] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<string | null>(null);
  const [newMilestoneData, setNewMilestoneData] = useState({
    title: "",
    description: "",
    price: "",
    deadline: "",
  });
  const [showNewTask, setShowNewTask] = useState<string | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState<{milestoneId: string, status: "PARTIAL" | "PAID"} | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [newTaskData, setNewTaskData] = useState({
    title: "",
    description: "",
    priority: "MEDIUM",
    dueDate: "",
    assigneeId: "",
  });

  useEffect(() => {
    fetchMilestones();
    fetchUsers();
  }, [projectId]);

  const fetchMilestones = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/milestones`);
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setMilestones(data);
    } catch (error) {
      console.error("Error fetching milestones:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users");
      if (!response.ok) throw new Error("Failed to fetch users");
      const data = await response.json();
      setUsers(data.filter((u: User) => u.name)); // Only users with names
    } catch (error) {
      console.error("Error fetching users:", error);
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

  const handleCreateMilestone = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/milestones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMilestoneData),
      });

      if (!response.ok) throw new Error("Failed to create");

      setNewMilestoneData({ title: "", description: "", price: "", deadline: "" });
      setShowNewMilestone(false);
      fetchMilestones();
    } catch (error) {
      console.error("Error creating milestone:", error);
      alert("Failed to create milestone");
    }
  };

  const handleDeleteMilestone = async (milestoneId: string) => {
    if (!confirm("Are you sure you want to delete this milestone and all its tasks?")) return;

    try {
      const response = await fetch(
        `/api/projects/${projectId}/milestones/${milestoneId}`,
        { method: "DELETE" }
      );

      if (!response.ok) throw new Error("Failed to delete");

      fetchMilestones();
    } catch (error) {
      console.error("Error deleting milestone:", error);
      alert("Failed to delete milestone");
    }
  };

  const handleCreateTask = async (milestoneId: string) => {
    if (!newTaskData.title) {
      alert("Please provide a task title");
      return;
    }

    try {
      const response = await fetch(
        `/api/projects/${projectId}/milestones/${milestoneId}/tasks`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newTaskData),
        }
      );

      if (!response.ok) throw new Error("Failed to create");

      setNewTaskData({
        title: "",
        description: "",
        priority: "MEDIUM",
        dueDate: "",
        assigneeId: "",
      });
      setShowNewTask(null);
      fetchMilestones();
    } catch (error) {
      console.error("Error creating task:", error);
      alert("Failed to create task");
    }
  };

  const handleUpdatePaymentStatus = async (
    milestoneId: string,
    paymentStatus: "UNPAID" | "PARTIAL" | "PAID"
  ) => {
    // If changing to PARTIAL, show dialog to enter payment amount
    if (paymentStatus === "PARTIAL") {
      setShowPaymentDialog({ milestoneId, status: paymentStatus });
      setPaymentAmount("");
      return;
    }

    // Otherwise update directly
    try {
      const response = await fetch(
        `/api/milestones/${milestoneId}/payment`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentStatus }),
        }
      );

      if (!response.ok) throw new Error("Failed to update payment status");

      fetchMilestones();
    } catch (error) {
      console.error("Error updating payment status:", error);
      alert("Failed to update payment status");
    }
  };

  const handleConfirmPayment = async () => {
    if (!showPaymentDialog) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid payment amount");
      return;
    }

    try {
      const response = await fetch(
        `/api/milestones/${showPaymentDialog.milestoneId}/payment`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentStatus: showPaymentDialog.status,
            paymentAmount: amount
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to update payment status");

      setShowPaymentDialog(null);
      setPaymentAmount("");
      fetchMilestones();
    } catch (error) {
      console.error("Error updating payment status:", error);
      alert("Failed to update payment status");
    }
  };

  const handleToggleMilestoneVisibility = async (
    milestoneId: string,
    currentVisibility: boolean
  ) => {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/milestones/${milestoneId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isVisible: !currentVisibility }),
        }
      );

      if (!response.ok) throw new Error("Failed to update visibility");

      fetchMilestones();
    } catch (error) {
      console.error("Error updating milestone visibility:", error);
      alert("Failed to update milestone visibility");
    }
  };

  const handleToggleTaskVisibility = async (
    milestoneId: string,
    taskId: string,
    currentVisibility: boolean
  ) => {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/milestones/${milestoneId}/tasks/${taskId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isVisible: !currentVisibility }),
        }
      );

      if (!response.ok) throw new Error("Failed to update visibility");

      fetchMilestones();
    } catch (error) {
      console.error("Error updating task visibility:", error);
      alert("Failed to update task visibility");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "TODO":
        return "bg-gray-600";
      case "IN_PROGRESS":
        return "bg-blue-600";
      case "SUBMITTED":
        return "bg-yellow-600";
      case "APPROVED":
        return "bg-green-600";
      case "REJECTED":
        return "bg-red-600";
      default:
        return "bg-gray-600";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "LOW":
        return "text-green-400";
      case "MEDIUM":
        return "text-yellow-400";
      case "HIGH":
        return "text-orange-400";
      case "URGENT":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-white/40" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Milestones & Tasks</h2>
          <p className="text-white/60 text-sm">Track project progress and deliverables</p>
        </div>
        <Button onClick={() => setShowNewMilestone(true)}>
          <Plus size={18} className="mr-2" />
          Add Milestone
        </Button>
      </div>

      {/* New Milestone Form */}
      <AnimatePresence>
        {showNewMilestone && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white/5 rounded-xl border border-white/10 p-6"
          >
            <h3 className="text-lg font-semibold text-white mb-4">New Milestone</h3>
            <div className="space-y-4">
              <div>
                <Label>Title *</Label>
                <Input
                  value={newMilestoneData.title}
                  onChange={(e) =>
                    setNewMilestoneData({ ...newMilestoneData, title: e.target.value })
                  }
                  placeholder="e.g., Initial Concept & Storyboard"
                  required
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={newMilestoneData.description}
                  onChange={(e) =>
                    setNewMilestoneData({ ...newMilestoneData, description: e.target.value })
                  }
                  placeholder="Detailed description of this milestone..."
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newMilestoneData.price}
                    onChange={(e) =>
                      setNewMilestoneData({ ...newMilestoneData, price: e.target.value })
                    }
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label>Deadline</Label>
                  <Input
                    type="date"
                    value={newMilestoneData.deadline}
                    onChange={(e) =>
                      setNewMilestoneData({ ...newMilestoneData, deadline: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setShowNewMilestone(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateMilestone}>Create Milestone</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment Amount Dialog */}
      <AnimatePresence>
        {showPaymentDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowPaymentDialog(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[#1a1a1a] rounded-xl border border-white/10 p-6 max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-white mb-4">Enter Payment Amount</h3>
              <div className="space-y-4">
                <div>
                  <Label>Amount Paid (₪)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="0.00"
                    autoFocus
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="ghost" onClick={() => setShowPaymentDialog(null)}>
                    Cancel
                  </Button>
                  <Button onClick={handleConfirmPayment}>Confirm Payment</Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Milestones List */}
      <div className="space-y-4">
        {milestones.map((milestone, index) => (
          <motion.div
            key={milestone.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white/5 rounded-xl border border-white/10 overflow-hidden"
          >
            {/* Milestone Header */}
            <div className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <button
                    onClick={() => toggleMilestone(milestone.id)}
                    className="mt-1 text-white/60 hover:text-white transition-colors"
                  >
                    {expandedMilestones.has(milestone.id) ? (
                      <ChevronDown size={20} />
                    ) : (
                      <ChevronRight size={20} />
                    )}
                  </button>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-white">{milestone.title}</h3>
                      <Select
                        value={milestone.paymentStatus}
                        onValueChange={(value) =>
                          handleUpdatePaymentStatus(
                            milestone.id,
                            value as "UNPAID" | "PARTIAL" | "PAID"
                          )
                        }
                      >
                        <SelectTrigger
                          className={cn(
                            "w-32 h-8 text-xs font-medium border-none",
                            milestone.paymentStatus === "PAID"
                              ? "bg-green-600 hover:bg-green-700"
                              : milestone.paymentStatus === "PARTIAL"
                              ? "bg-yellow-600 hover:bg-yellow-700"
                              : "bg-gray-600 hover:bg-gray-700"
                          )}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="UNPAID">
                            <span className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-gray-500" />
                              Unpaid
                            </span>
                          </SelectItem>
                          <SelectItem value="PARTIAL">
                            <span className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-yellow-500" />
                              Partial
                            </span>
                          </SelectItem>
                          <SelectItem value="PAID">
                            <span className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-green-500" />
                              Paid
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {milestone.description && (
                      <p className="text-white/60 text-sm mb-3">{milestone.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-white/60">
                      {milestone.price && (
                        <div className="flex items-center gap-2">
                          <DollarSign size={14} />
                          ₪{parseFloat(milestone.price.toString()).toFixed(2)}
                          {milestone.paymentStatus === "PARTIAL" && milestone.paymentAmount && (
                            <span className="text-yellow-400">
                              (₪{parseFloat(milestone.paymentAmount.toString()).toFixed(2)} paid)
                            </span>
                          )}
                        </div>
                      )}
                      {milestone.deadline && (
                        <div className="flex items-center gap-2">
                          <Calendar size={14} />
                          {new Date(milestone.deadline).toLocaleDateString()}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={14} />
                        {milestone.tasks.filter((t) => t.status === "APPROVED").length}/
                        {milestone.tasks.length} tasks
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleMilestoneVisibility(milestone.id, milestone.isVisible)}
                    className={cn(
                      milestone.isVisible
                        ? "text-green-500 hover:text-green-400"
                        : "text-white/40 hover:text-white/60"
                    )}
                    title={milestone.isVisible ? "Visible to clients" : "Hidden from clients"}
                  >
                    {milestone.isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteMilestone(milestone.id)}
                    className="text-red-500 hover:text-red-400"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            </div>

            {/* Tasks List (Expanded) */}
            <AnimatePresence>
              {expandedMilestones.has(milestone.id) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="border-t border-white/10"
                >
                  <div className="p-6 bg-black/20">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-white">Tasks</h4>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setShowNewTask(milestone.id)}
                      >
                        <Plus size={14} className="mr-1" />
                        Add Task
                      </Button>
                    </div>

                    {/* New Task Form */}
                    {showNewTask === milestone.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="bg-white/5 rounded-lg p-4 mb-4 border border-white/10"
                      >
                        <h5 className="font-semibold text-white mb-3">New Task</h5>
                        <div className="space-y-3">
                          <div>
                            <Label>Title *</Label>
                            <Input
                              value={newTaskData.title}
                              onChange={(e) =>
                                setNewTaskData({ ...newTaskData, title: e.target.value })
                              }
                              placeholder="Task title"
                            />
                          </div>
                          <div>
                            <Label>Description</Label>
                            <Textarea
                              value={newTaskData.description}
                              onChange={(e) =>
                                setNewTaskData({ ...newTaskData, description: e.target.value })
                              }
                              placeholder="Task description..."
                              rows={2}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label>Priority</Label>
                              <Select
                                value={newTaskData.priority}
                                onValueChange={(value) =>
                                  setNewTaskData({ ...newTaskData, priority: value })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
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
                              <Label>Due Date</Label>
                              <Input
                                type="date"
                                value={newTaskData.dueDate}
                                onChange={(e) =>
                                  setNewTaskData({ ...newTaskData, dueDate: e.target.value })
                                }
                              />
                            </div>
                          </div>
                          <div>
                            <Label>Assign To</Label>
                            <Select
                              value={newTaskData.assigneeId}
                              onValueChange={(value) =>
                                setNewTaskData({ ...newTaskData, assigneeId: value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select team member" />
                              </SelectTrigger>
                              <SelectContent>
                                {users.map((user) => (
                                  <SelectItem key={user.id} value={user.id}>
                                    {user.name || user.email}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex justify-end gap-2 pt-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setShowNewTask(null);
                                setNewTaskData({
                                  title: "",
                                  description: "",
                                  priority: "MEDIUM",
                                  dueDate: "",
                                  assigneeId: "",
                                });
                              }}
                            >
                              Cancel
                            </Button>
                            <Button size="sm" onClick={() => handleCreateTask(milestone.id)}>
                              Create Task
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {milestone.tasks.length === 0 ? (
                      <p className="text-white/40 text-sm text-center py-8">
                        No tasks yet. Add a task to get started.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {milestone.tasks.map((task) => (
                          <div
                            key={task.id}
                            className="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-3 flex-1">
                                <div className={cn("mt-0.5", getPriorityColor(task.priority))}>
                                  <Circle size={16} />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h5 className="font-medium text-white">{task.title}</h5>
                                    <Badge className={getStatusColor(task.status)}>
                                      {task.status.replace("_", " ")}
                                    </Badge>
                                    <Badge variant="outline" className="capitalize">
                                      {task.priority.toLowerCase()}
                                    </Badge>
                                  </div>
                                  {task.description && (
                                    <p className="text-white/60 text-sm mb-2">
                                      {task.description}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-4 text-xs text-white/60">
                                    {task.assignee && (
                                      <div className="flex items-center gap-1">
                                        <User size={12} />
                                        {task.assignee.name || task.assignee.email}
                                      </div>
                                    )}
                                    {task.dueDate && (
                                      <div className="flex items-center gap-1">
                                        <Calendar size={12} />
                                        {new Date(task.dueDate).toLocaleDateString()}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleTaskVisibility(milestone.id, task.id, task.isVisible)}
                                className={cn(
                                  "flex-shrink-0",
                                  task.isVisible
                                    ? "text-green-500 hover:text-green-400"
                                    : "text-white/40 hover:text-white/60"
                                )}
                                title={task.isVisible ? "Visible to clients" : "Hidden from clients"}
                              >
                                {task.isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      {/* Empty State */}
      {milestones.length === 0 && (
        <div className="text-center py-20">
          <CheckCircle2 className="mx-auto text-white/20 mb-4" size={64} />
          <h3 className="text-xl font-semibold text-white mb-2">No milestones yet</h3>
          <p className="text-white/60 mb-6">
            Break down your project into milestones and tasks.
          </p>
          <Button onClick={() => setShowNewMilestone(true)}>
            <Plus size={18} className="mr-2" />
            Create First Milestone
          </Button>
        </div>
      )}
    </div>
  );
}
