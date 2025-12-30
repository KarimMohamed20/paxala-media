"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  ArrowLeft,
  User,
  Mail,
  Briefcase,
  Calendar,
  Loader2,
  FolderKanban,
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  Youtube,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClientContacts } from "@/components/admin/client-contacts";
import Link from "next/link";

interface UserData {
  id: string;
  username: string;
  name: string | null;
  email: string | null;
  role: string;
  industry?: string | null;
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    youtube?: string;
    tiktok?: string;
  } | null;
  createdAt: string;
  projects: {
    id: string;
    title: string;
    slug: string;
    status: string;
    createdAt: string;
  }[];
}

const projectStatusColors = {
  DRAFT: "secondary",
  IN_PROGRESS: "default",
  REVIEW: "warning",
  COMPLETED: "success",
  ARCHIVED: "secondary",
} as const;

export default function ClientDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params?.id as string;

  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      fetchUser();
    }
  }, [userId]);

  const fetchUser = async () => {
    try {
      const response = await fetch(`/api/users/${userId}`);

      if (!response.ok) {
        if (response.status === 404) {
          setError("User not found");
        } else {
          setError("Failed to fetch user");
        }
        return;
      }

      const data = await response.json();

      // Only show this page for CLIENT users
      if (data.role !== "CLIENT") {
        setError("This page is only available for client users");
        return;
      }

      setUser(data);
    } catch (err) {
      console.error("Error fetching user:", err);
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black flex items-center justify-center">
        <Loader2 className="animate-spin text-white/40" size={48} />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black p-8">
        <div className="max-w-7xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => router.push("/admin/users")}
            className="mb-6"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back to Users
          </Button>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-12 text-center">
              <h2 className="text-2xl font-bold text-white mb-4">{error}</h2>
              <Button onClick={() => router.push("/admin/users")}>
                Return to Users
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => router.push("/admin/users")}
          >
            <ArrowLeft size={18} className="mr-2" />
            Back to Users
          </Button>
          <Badge variant="default">CLIENT</Badge>
        </div>

        {/* Client Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-2xl">Client Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-red-600/20 flex items-center justify-center text-red-500 font-medium text-xl">
                      {(user.username?.[0] || user.name?.[0] || 'U').toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-white">
                        {user.name || user.username || 'Unknown User'}
                      </h3>
                      {user.username && (
                        <p className="text-white/60 text-sm">@{user.username}</p>
                      )}
                    </div>
                  </div>

                  {user.email && (
                    <div className="flex items-center gap-3 text-white/70">
                      <Mail size={18} className="text-white/40" />
                      <span>{user.email}</span>
                    </div>
                  )}

                  {user.industry && (
                    <div className="flex items-center gap-3 text-white/70">
                      <Briefcase size={18} className="text-white/40" />
                      <span>{user.industry}</span>
                    </div>
                  )}

                  {user.socialMedia && Object.keys(user.socialMedia).length > 0 && (
                    <div>
                      <div className="text-white/60 text-sm mb-2">Social Media</div>
                      <div className="flex items-center gap-3">
                        {(user.socialMedia as any).facebook && (
                          <a
                            href={(user.socialMedia as any).facebook}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-white/60 hover:text-white transition-colors"
                          >
                            <Facebook size={20} />
                          </a>
                        )}
                        {(user.socialMedia as any).instagram && (
                          <a
                            href={(user.socialMedia as any).instagram}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-white/60 hover:text-white transition-colors"
                          >
                            <Instagram size={20} />
                          </a>
                        )}
                        {(user.socialMedia as any).twitter && (
                          <a
                            href={(user.socialMedia as any).twitter}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-white/60 hover:text-white transition-colors"
                          >
                            <Twitter size={20} />
                          </a>
                        )}
                        {(user.socialMedia as any).linkedin && (
                          <a
                            href={(user.socialMedia as any).linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-white/60 hover:text-white transition-colors"
                          >
                            <Linkedin size={20} />
                          </a>
                        )}
                        {(user.socialMedia as any).youtube && (
                          <a
                            href={(user.socialMedia as any).youtube}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-white/60 hover:text-white transition-colors"
                          >
                            <Youtube size={20} />
                          </a>
                        )}
                        {(user.socialMedia as any).tiktok && (
                          <a
                            href={(user.socialMedia as any).tiktok}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-white/60 hover:text-white transition-colors"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="20"
                              height="20"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
                            </svg>
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 text-white/70">
                    <Calendar size={18} className="text-white/40" />
                    <span>
                      Joined {format(new Date(user.createdAt), "MMMM d, yyyy")}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-center md:justify-end">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-white mb-2">
                      {user.projects.length}
                    </div>
                    <div className="text-white/60">
                      Active Project{user.projects.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Contacts Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <ClientContacts
            clientId={user.id}
            clientName={user.name || user.username}
          />
        </motion.div>

        {/* Projects Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Projects</CardTitle>
                <Badge variant="secondary">{user.projects.length} total</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {user.projects.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                    <FolderKanban className="text-white/40" size={32} />
                  </div>
                  <h4 className="text-lg font-semibold text-white mb-2">
                    No projects yet
                  </h4>
                  <p className="text-white/60 text-sm">
                    This client doesn't have any projects assigned.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {user.projects.map((project, index) => (
                    <motion.div
                      key={project.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 + index * 0.05 }}
                    >
                      <Link href={`/admin/projects/${project.slug}`}>
                        <div className="bg-white/5 rounded-lg p-4 border border-white/10 hover:border-white/20 transition-all cursor-pointer">
                          <h4 className="font-semibold text-white mb-2">
                            {project.title}
                          </h4>
                          <div className="flex items-center justify-between">
                            <Badge
                              variant={
                                projectStatusColors[
                                  project.status as keyof typeof projectStatusColors
                                ] || "secondary"
                              }
                              className="text-xs"
                            >
                              {project.status}
                            </Badge>
                            <span className="text-white/40 text-xs">
                              {format(new Date(project.createdAt), "MMM yyyy")}
                            </span>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
