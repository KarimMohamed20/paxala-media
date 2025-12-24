export type PaymentStatus = "UNPAID" | "PARTIAL" | "PAID";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "SUBMITTED" | "APPROVED" | "REJECTED";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface TaskAssignee {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  isVisible: boolean;
  milestoneId: string;
  assigneeId: string | null;
  assignee?: TaskAssignee | null;
  rejectionReason: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  approvedById: string | null;
  approvedBy?: TaskAssignee | null;
  createdAt: string;
  updatedAt: string;
}

export interface Milestone {
  id: string;
  title: string;
  description: string | null;
  order: number;
  price: number | null;
  paymentStatus: PaymentStatus;
  paymentDate: string | null;
  paymentAmount: number | null;
  deadline: string | null;
  isVisible: boolean;
  projectId: string;
  tasks: Task[];
  createdAt: string;
  updatedAt: string;
}

export interface MilestoneWithProgress extends Milestone {
  totalTasks: number;
  completedTasks: number;
  progressPercent: number;
}

export interface CreateMilestoneInput {
  title: string;
  description?: string;
  price?: number;
  isVisible?: boolean;
  projectId: string;
}

export interface UpdateMilestoneInput {
  title?: string;
  description?: string;
  price?: number;
  isVisible?: boolean;
}

export interface UpdatePaymentInput {
  paymentStatus: PaymentStatus;
  paymentDate?: string;
  paymentAmount?: number;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: TaskPriority;
  dueDate?: string;
  isVisible?: boolean;
  milestoneId: string;
  assigneeId?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  dueDate?: string;
  isVisible?: boolean;
}

export interface UpdateTaskStatusInput {
  status: TaskStatus;
  rejectionReason?: string;
}

export interface StaffMember {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: "ADMIN" | "STAFF";
  managerId: string | null;
  manager?: {
    id: string;
    name: string | null;
  } | null;
}
