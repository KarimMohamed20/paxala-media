"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { format, formatDistanceToNow } from "date-fns";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  Folder,
  Clock,
  FileText,
  Download,
  MessageSquare,
  Send,
  Image,
  Video,
  File,
  Loader2,
  Calendar,
  User,
  Target,
  CheckCircle,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ProjectFile {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  createdAt: string;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    image: string | null;
  };
}

interface MilestoneTask {
  id: string;
  title: string;
  status: string;
  isVisible: boolean;
  createdAt: string;
  approvedAt: string | null;
}

interface MilestoneData {
  id: string;
  title: string;
  description: string | null;
  order: number;
  price: number | null;
  paymentStatus: string;
  paymentDate: string | null;
  paymentAmount: number | null;
  isVisible: boolean;
  tasks: MilestoneTask[];
  totalTasks: number;
  completedTasks: number;
  progressPercent: number;
}

interface MilestonesResponse {
  project: { id: string; title: string };
  milestones: MilestoneData[];
  summary: {
    totalPrice: number;
    paidAmount: number;
    unpaidAmount: number;
    paidMilestones: number;
    totalMilestones: number;
    totalTasks: number;
    completedTasks: number;
    overallProgress: number;
  };
}

interface Project {
  id: string;
  title: string;
  slug: string;
  description: string;
  content: string | null;
  category: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
  client: {
    id: string;
    name: string;
    email: string;
  } | null;
  service: {
    id: string;
    name: string;
    slug: string;
  } | null;
  files: ProjectFile[];
  comments: Comment[];
}

const statusColors = {
  DRAFT: "secondary",
  IN_PROGRESS: "warning",
  REVIEW: "default",
  COMPLETED: "success",
  ARCHIVED: "secondary",
} as const;

const statusProgress = {
  DRAFT: 10,
  IN_PROGRESS: 50,
  REVIEW: 85,
  COMPLETED: 100,
  ARCHIVED: 100,
} as const;

const paymentStatusColors = {
  UNPAID: "destructive",
  PARTIAL: "warning",
  PAID: "success",
} as const;

const taskStatusColors = {
  TODO: "secondary",
  IN_PROGRESS: "warning",
  SUBMITTED: "default",
  APPROVED: "success",
  REJECTED: "destructive",
} as const;

const fileIcons: Record<string, React.ElementType> = {
  image: Image,
  video: Video,
  pdf: FileText,
  document: FileText,
  other: File,
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export default function ProjectDetailPage() {
  const t = useTranslations('portal');
  const tc = useTranslations('common');
  const { slug } = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [milestonesData, setMilestonesData] = useState<MilestonesResponse | null>(null);
  const [loadingMilestones, setLoadingMilestones] = useState(false);

  useEffect(() => {
    async function fetchProject() {
      try {
        const response = await fetch(`/api/projects/${slug}`);
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Project not found");
          }
          throw new Error("Failed to fetch project");
        }
        const data = await response.json();
        setProject(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    if (slug) {
      fetchProject();
      fetchMilestones();
    }
  }, [slug]);

  const fetchMilestones = async () => {
    setLoadingMilestones(true);
    try {
      const response = await fetch(`/api/portal/projects/${slug}/milestones`);
      if (response.ok) {
        const data = await response.json();
        setMilestonesData(data);
      }
    } catch (err) {
      console.error("Error fetching milestones:", err);
    } finally {
      setLoadingMilestones(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !project) return;

    setSubmittingComment(true);
    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          content: newComment,
        }),
      });

      if (!response.ok) throw new Error("Failed to post comment");

      // Refresh project to get new comment
      const projectResponse = await fetch(`/api/projects/${slug}`);
      if (projectResponse.ok) {
        const data = await projectResponse.json();
        setProject(data);
      }

      setNewComment("");
    } catch (err) {
      alert("Failed to post comment");
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-white/40" size={32} />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="text-center py-16">
        <Folder size={64} className="text-white/20 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">
          {error || tc('noResults')}
        </h3>
        <p className="text-white/60 mb-6">
          The project you're looking for doesn't exist or you don't have access.
        </p>
        <Link href="/portal/projects">
          <Button>{tc('back')} to {t('projects')}</Button>
        </Link>
      </div>
    );
  }

  const progress =
    statusProgress[project.status as keyof typeof statusProgress] || 0;

  return (
    <div>
      {/* Back Button */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="mb-6"
      >
        <Link
          href="/portal/projects"
          className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
          {tc('back')} to {t('projects')}
        </Link>
      </motion.div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-red-600/20 flex items-center justify-center text-red-500">
              <Folder size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                {project.title}
              </h1>
              <div className="flex items-center gap-4 text-white/60 text-sm">
                {project.service && (
                  <span className="flex items-center gap-1">
                    <Folder size={14} />
                    {project.service.name}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock size={14} />
                  {t('lastUpdated')}{" "}
                  {formatDistanceToNow(new Date(project.updatedAt), {
                    addSuffix: true,
                  })}
                </span>
              </div>
            </div>
          </div>
          <Badge
            variant={
              statusColors[project.status as keyof typeof statusColors] ||
              "secondary"
            }
            className="text-sm px-4 py-1"
          >
            {project.status.replace("_", " ")}
          </Badge>
        </div>
      </motion.div>

      {/* Progress Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8"
      >
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-medium">{tc('project')} {t('progress')}</h3>
              <span className="text-white/60">{progress}%</span>
            </div>
            <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden mb-4">
              <motion.div
                className="h-full bg-gradient-to-r from-red-600 to-red-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
            <div className="grid grid-cols-4 gap-4">
              {["DRAFT", "IN_PROGRESS", "REVIEW", "COMPLETED"].map(
                (status, i) => {
                  const isActive = project.status === status;
                  const isPast =
                    Object.keys(statusProgress).indexOf(project.status) > i;
                  return (
                    <div
                      key={status}
                      className={`text-center ${
                        isActive
                          ? "text-red-500"
                          : isPast
                          ? "text-green-500"
                          : "text-white/40"
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center ${
                          isActive
                            ? "bg-red-600"
                            : isPast
                            ? "bg-green-600"
                            : "bg-white/10"
                        }`}
                      >
                        <span className="text-xs text-white">{i + 1}</span>
                      </div>
                      <span className="text-xs">{status.replace("_", " ")}</span>
                    </div>
                  );
                }
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Content Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="overview">{t('overview')}</TabsTrigger>
            <TabsTrigger value="milestones">
              {t('milestones')} ({milestonesData?.milestones.length || 0})
            </TabsTrigger>
            <TabsTrigger value="files">
              {tc('files')} ({project.files.length})
            </TabsTrigger>
            <TabsTrigger value="comments">
              {t('comments')} ({project.comments.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Description */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>{tc('description')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-white/80 whitespace-pre-wrap">
                      {project.description}
                    </p>
                    {project.content && (
                      <div className="mt-6 pt-6 border-t border-white/10">
                        <div
                          className="text-white/80 prose prose-invert max-w-none"
                          dangerouslySetInnerHTML={{ __html: project.content }}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Details Sidebar */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-white/40 text-xs mb-1">{tc('category')}</p>
                      <p className="text-white">
                        {project.category.replace("_", " ")}
                      </p>
                    </div>
                    {project.startDate && (
                      <div>
                        <p className="text-white/40 text-xs mb-1">Start {tc('date')}</p>
                        <p className="text-white">
                          {format(new Date(project.startDate), "MMMM d, yyyy")}
                        </p>
                      </div>
                    )}
                    {project.endDate && (
                      <div>
                        <p className="text-white/40 text-xs mb-1">End {tc('date')}</p>
                        <p className="text-white">
                          {format(new Date(project.endDate), "MMMM d, yyyy")}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-white/40 text-xs mb-1">Created</p>
                      <p className="text-white">
                        {format(new Date(project.createdAt), "MMMM d, yyyy")}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Stats */}
                <Card>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-white/5 rounded-lg">
                        <FileText size={24} className="mx-auto mb-2 text-blue-500" />
                        <p className="text-2xl font-bold text-white">
                          {project.files.length}
                        </p>
                        <p className="text-white/40 text-xs">{tc('files')}</p>
                      </div>
                      <div className="text-center p-4 bg-white/5 rounded-lg">
                        <MessageSquare
                          size={24}
                          className="mx-auto mb-2 text-green-500"
                        />
                        <p className="text-2xl font-bold text-white">
                          {project.comments.length}
                        </p>
                        <p className="text-white/40 text-xs">{t('comments')}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="milestones">
            {loadingMilestones ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="animate-spin text-white/40" size={32} />
              </div>
            ) : !milestonesData || milestonesData.milestones.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Target size={48} className="text-white/20 mx-auto mb-4" />
                  <p className="text-white/60">{t('nothingHere')}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Summary Card */}
                <Card>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-white/5 rounded-lg">
                        <Target size={24} className="mx-auto mb-2 text-purple-500" />
                        <p className="text-2xl font-bold text-white">
                          {milestonesData.summary.overallProgress}%
                        </p>
                        <p className="text-white/40 text-xs">{t('progress')}</p>
                      </div>
                      <div className="text-center p-4 bg-white/5 rounded-lg">
                        <CheckCircle size={24} className="mx-auto mb-2 text-green-500" />
                        <p className="text-2xl font-bold text-white">
                          {milestonesData.summary.completedTasks}/{milestonesData.summary.totalTasks}
                        </p>
                        <p className="text-white/40 text-xs">{t('tasks')} {tc('completed')}</p>
                      </div>
                      <div className="text-center p-4 bg-white/5 rounded-lg">
                        <DollarSign size={24} className="mx-auto mb-2 text-blue-500" />
                        <p className="text-2xl font-bold text-white">
                          ₪{milestonesData.summary.totalPrice.toLocaleString()}
                        </p>
                        <p className="text-white/40 text-xs">{t('totalValue')}</p>
                      </div>
                      <div className="text-center p-4 bg-white/5 rounded-lg">
                        <DollarSign size={24} className="mx-auto mb-2 text-emerald-500" />
                        <p className="text-2xl font-bold text-white">
                          ₪{milestonesData.summary.paidAmount.toLocaleString()}
                        </p>
                        <p className="text-white/40 text-xs">{t('paid')}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Milestones List */}
                {milestonesData.milestones.map((milestone, index) => (
                  <Card key={milestone.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-3">
                            <span className="text-white/40 text-sm">#{index + 1}</span>
                            <CardTitle>{milestone.title}</CardTitle>
                          </div>
                          {milestone.description && (
                            <p className="text-white/60 text-sm mt-1">
                              {milestone.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          {milestone.price && (
                            <div className="text-right">
                              <span className="text-white font-semibold">
                                ₪{milestone.price.toLocaleString()}
                              </span>
                              {milestone.paymentStatus === "PARTIAL" && milestone.paymentAmount && (
                                <div className="text-xs text-yellow-400">
                                  ₪{milestone.paymentAmount.toLocaleString()} paid
                                </div>
                              )}
                            </div>
                          )}
                          <Badge
                            variant={
                              paymentStatusColors[
                                milestone.paymentStatus as keyof typeof paymentStatusColors
                              ] || "secondary"
                            }
                          >
                            {milestone.paymentStatus}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {/* Progress Bar */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-sm text-white/60 mb-2">
                          <span>
                            {milestone.completedTasks} of {milestone.totalTasks} tasks completed
                          </span>
                          <span>{milestone.progressPercent}%</span>
                        </div>
                        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full transition-all"
                            style={{ width: `${milestone.progressPercent}%` }}
                          />
                        </div>
                      </div>

                      {/* Tasks */}
                      {milestone.tasks.length > 0 && (
                        <div className="space-y-2">
                          {milestone.tasks.map((task) => (
                            <div
                              key={task.id}
                              className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                {task.status === "APPROVED" ? (
                                  <CheckCircle size={16} className="text-green-500" />
                                ) : (
                                  <div className="w-4 h-4 rounded-full border border-white/30" />
                                )}
                                <span className={task.status === "APPROVED" ? "text-white/60" : "text-white"}>
                                  {task.title}
                                </span>
                              </div>
                              <Badge
                                variant={
                                  taskStatusColors[
                                    task.status as keyof typeof taskStatusColors
                                  ] || "secondary"
                                }
                              >
                                {task.status.replace("_", " ")}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}

                      {milestone.tasks.length === 0 && (
                        <p className="text-white/40 text-sm text-center py-4">
                          {t('nothingHere')}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="files">
            <Card>
              <CardHeader>
                <CardTitle>{tc('project')} {tc('files')}</CardTitle>
              </CardHeader>
              <CardContent>
                {project.files.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText size={48} className="text-white/20 mx-auto mb-4" />
                    <p className="text-white/60">{t('noFilesYet')}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {project.files.map((file) => {
                      const Icon = fileIcons[file.type] || File;
                      return (
                        <div
                          key={file.id}
                          className="flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                              <Icon size={20} className="text-white/60" />
                            </div>
                            <div>
                              <p className="text-white font-medium">{file.name}</p>
                              <p className="text-white/40 text-xs">
                                {formatFileSize(file.size)} •{" "}
                                {format(new Date(file.createdAt), "MMM d, yyyy")}
                              </p>
                            </div>
                          </div>
                          <a href={file.url} download target="_blank">
                            <Button variant="ghost" size="sm">
                              <Download size={16} className="mr-2" />
                              {tc('download')}
                            </Button>
                          </a>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="comments">
            <Card>
              <CardHeader>
                <CardTitle>{t('comments')} & Updates</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Add Comment Form */}
                <form onSubmit={handleSubmitComment} className="mb-8">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-red-600/20 flex items-center justify-center text-red-500 font-medium flex-shrink-0">
                      {session?.user?.name?.[0]?.toUpperCase() || "U"}
                    </div>
                    <div className="flex-1">
                      <Textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder={t('addComment')}
                        className="mb-3"
                      />
                      <Button
                        type="submit"
                        size="sm"
                        disabled={!newComment.trim() || submittingComment}
                      >
                        {submittingComment ? (
                          <>
                            <Loader2 className="animate-spin mr-2" size={14} />
                            {tc('loading')}
                          </>
                        ) : (
                          <>
                            <Send size={14} className="mr-2" />
                            {t('postComment')}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </form>

                {/* Comments List */}
                {project.comments.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare
                      size={48}
                      className="text-white/20 mx-auto mb-4"
                    />
                    <p className="text-white/60">{t('nothingHere')}</p>
                    <p className="text-white/40 text-sm">
                      Be the first to add a comment
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {project.comments.map((comment) => (
                      <div key={comment.id} className="flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/60 font-medium flex-shrink-0">
                          {comment.user.name?.[0]?.toUpperCase() || "U"}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-white font-medium">
                              {comment.user.name}
                            </span>
                            <span className="text-white/40 text-xs">
                              {formatDistanceToNow(new Date(comment.createdAt), {
                                addSuffix: true,
                              })}
                            </span>
                          </div>
                          <p className="text-white/80 whitespace-pre-wrap">
                            {comment.content}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
