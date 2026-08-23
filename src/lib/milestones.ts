import type { Milestone, MilestoneWithProgress, Task } from "@/types/milestone";

/**
 * Calculate the progress percentage for a milestone based on approved tasks
 */
export function calculateMilestoneProgress(milestone: Milestone): number {
  if (!milestone.tasks || milestone.tasks.length === 0) {
    return 0;
  }

  const approvedTasks = milestone.tasks.filter(
    (task) => task.status === "APPROVED"
  ).length;

  return Math.round((approvedTasks / milestone.tasks.length) * 100);
}

/**
 * Add progress information to a milestone
 */
export function addProgressToMilestone(milestone: Milestone): MilestoneWithProgress {
  const totalTasks = milestone.tasks?.length || 0;
  const completedTasks = milestone.tasks?.filter(
    (task) => task.status === "APPROVED"
  ).length || 0;
  const progressPercent = totalTasks > 0
    ? Math.round((completedTasks / totalTasks) * 100)
    : 0;

  return {
    ...milestone,
    totalTasks,
    completedTasks,
    progressPercent,
  };
}

/**
 * Calculate overall project progress based on all milestones
 */
export function calculateProjectProgress(milestones: Milestone[]): number {
  if (!milestones || milestones.length === 0) {
    return 0;
  }

  const totalTasks = milestones.reduce(
    (sum, m) => sum + (m.tasks?.length || 0),
    0
  );

  if (totalTasks === 0) {
    return 0;
  }

  const approvedTasks = milestones.reduce(
    (sum, m) =>
      sum + (m.tasks?.filter((t) => t.status === "APPROVED").length || 0),
    0
  );

  return Math.round((approvedTasks / totalTasks) * 100);
}

/**
 * Check if a milestone should be auto-completed (all tasks approved)
 */
export function isMilestoneComplete(milestone: Milestone): boolean {
  if (!milestone.tasks || milestone.tasks.length === 0) {
    return false;
  }

  return milestone.tasks.every((task) => task.status === "APPROVED");
}

/**
 * Check if a user can approve a task (must be the assignee's manager)
 */
export function canUserApproveTask(
  userId: string,
  task: Task & { assignee?: { managerId?: string | null } | null }
): boolean {
  if (!task.assignee?.managerId) {
    return false;
  }
  return task.assignee.managerId === userId;
}

/** Every status a task can hold, in workflow order. */
export const TASK_STATUSES: Task["status"][] = [
  "TODO",
  "IN_PROGRESS",
  "SUBMITTED",
  "APPROVED",
  "REJECTED",
];

export function isTaskStatus(value: unknown): value is Task["status"] {
  return (
    typeof value === "string" && TASK_STATUSES.includes(value as Task["status"])
  );
}

/**
 * The stamp fields that must accompany a status change.
 *
 * ADMIN and STAFF set task status directly from the admin/staff panels, so any
 * status can follow any other — a task may jump TODO -> APPROVED, or move back
 * out of APPROVED, which used to be terminal. That makes clearing stale stamps
 * mandatory: an approved task sent back to TODO must not keep its approval, and
 * a reworked task must not keep the reason it was once rejected.
 *
 * `submittedAt` is preserved rather than recomputed, so an approval does not
 * erase when the work was actually handed in; only a reset to TODO drops it.
 */
export function taskStatusStamps(input: {
  status: Task["status"];
  previousSubmittedAt: Date | null;
  actorId: string;
  rejectionReason?: unknown;
}): {
  submittedAt: Date | null;
  approvedAt: Date | null;
  approvedById: string | null;
  rejectionReason: string | null;
} {
  const { status, previousSubmittedAt, actorId } = input;
  const now = new Date();
  const reason =
    typeof input.rejectionReason === "string" && input.rejectionReason.trim()
      ? input.rejectionReason.trim()
      : null;

  return {
    submittedAt:
      status === "SUBMITTED"
        ? now
        : status === "TODO"
          ? null
          : previousSubmittedAt,
    approvedAt: status === "APPROVED" ? now : null,
    approvedById: status === "APPROVED" ? actorId : null,
    rejectionReason: status === "REJECTED" ? reason : null,
  };
}

/**
 * Get the valid next statuses for a task based on current status.
 *
 * Describes the intended workflow for self-service UI (which button to offer an
 * assignee next). It is no longer an authorization gate: agency roles may set
 * any status from the panels.
 */
export function getValidNextStatuses(
  currentStatus: Task["status"],
  isManager: boolean
): Task["status"][] {
  switch (currentStatus) {
    case "TODO":
      return ["IN_PROGRESS"];
    case "IN_PROGRESS":
      return ["SUBMITTED"];
    case "SUBMITTED":
      return isManager ? ["APPROVED", "REJECTED"] : [];
    case "REJECTED":
      return ["IN_PROGRESS"];
    case "APPROVED":
      return []; // Terminal state
    default:
      return [];
  }
}

/**
 * Calculate payment summary for a project's milestones
 */
export function calculatePaymentSummary(milestones: Milestone[]): {
  totalPrice: number;
  paidAmount: number;
  unpaidAmount: number;
  paidMilestones: number;
  totalMilestones: number;
} {
  const totalPrice = milestones.reduce(
    (sum, m) => sum + (Number(m.price) || 0),
    0
  );

  const paidAmount = milestones.reduce((sum, m) => {
    if (m.paymentStatus === "PAID") {
      return sum + (Number(m.price) || 0);
    }
    if (m.paymentStatus === "PARTIAL") {
      return sum + (Number(m.paymentAmount) || 0);
    }
    return sum;
  }, 0);

  const paidMilestones = milestones.filter(
    (m) => m.paymentStatus === "PAID"
  ).length;

  return {
    totalPrice,
    paidAmount,
    unpaidAmount: totalPrice - paidAmount,
    paidMilestones,
    totalMilestones: milestones.length,
  };
}

/**
 * Filter milestones and tasks for client visibility
 */
export function filterForClientVisibility(
  milestones: Milestone[]
): Milestone[] {
  return milestones
    .filter((m) => m.isVisible)
    .map((m) => ({
      ...m,
      tasks: m.tasks?.filter((t) => t.isVisible) || [],
    }));
}

/**
 * Get priority color class
 */
export function getPriorityColor(priority: Task["priority"]): string {
  switch (priority) {
    case "LOW":
      return "text-gray-400";
    case "MEDIUM":
      return "text-blue-400";
    case "HIGH":
      return "text-orange-400";
    case "URGENT":
      return "text-red-500";
    default:
      return "text-gray-400";
  }
}

/**
 * Get status color class
 */
export function getTaskStatusColor(status: Task["status"]): string {
  switch (status) {
    case "TODO":
      return "secondary";
    case "IN_PROGRESS":
      return "warning";
    case "SUBMITTED":
      return "default";
    case "APPROVED":
      return "success";
    case "REJECTED":
      return "destructive";
    default:
      return "secondary";
  }
}

/**
 * Get payment status color class
 */
export function getPaymentStatusColor(
  status: Milestone["paymentStatus"]
): string {
  switch (status) {
    case "UNPAID":
      return "destructive";
    case "PAYABLE":
      return "default"; // or "primary"
    case "PARTIAL":
      return "warning";
    case "PAID":
      return "success";
    default:
      return "secondary";
  }
}
