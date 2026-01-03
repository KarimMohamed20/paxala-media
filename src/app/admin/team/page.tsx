"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, Users, Edit, Trash2, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { useTranslations } from "next-intl";

interface TeamMember {
  id: string;
  name: string;
  role: string;
  bio: string | null;
  image: string | null;
  team: "PRODUCTION" | "IT_DEV" | "CREATIVE";
  order: number;
  skills: string[];
  social: any;
  isActive: boolean;
}

export default function AdminTeamPage() {
  const router = useRouter();
  const ta = useTranslations('adminUI');
  const tc = useTranslations('common');
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [filter, setFilter] = useState<"ALL" | "PRODUCTION" | "IT_DEV" | "CREATIVE">("ALL");

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    try {
      const response = await fetch("/api/team");
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setTeamMembers(data);
    } catch (error) {
      console.error("Error fetching team members:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(ta('deleteConfirm'))) return;

    try {
      const response = await fetch(`/api/team/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete");

      fetchTeamMembers();
    } catch (error) {
      console.error("Error deleting team member:", error);
      alert(ta('errorOccurred'));
    }
  };

  const toggleActive = async (member: TeamMember) => {
    try {
      const response = await fetch(`/api/team/${member.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...member,
          isActive: !member.isActive,
        }),
      });

      if (!response.ok) throw new Error("Failed to update");

      fetchTeamMembers();
    } catch (error) {
      console.error("Error updating team member:", error);
      alert(ta('errorOccurred'));
    }
  };

  const filteredMembers =
    filter === "ALL"
      ? teamMembers
      : teamMembers.filter((m) => m.team === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-white/40" size={48} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-red-600/10">
            <Users className="text-red-500" size={24} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              {ta('team')}
            </h1>
            <p className="text-white/60 text-sm">
              Manage your team members and their profiles
            </p>
          </div>
        </div>
        <Button onClick={() => router.push("/admin/team/new")} size="lg">
          <Plus size={18} className="mr-2" />
          {ta('addTeamMember')}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {["ALL", "PRODUCTION", "IT_DEV", "CREATIVE"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? "bg-red-600 text-white"
                : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
            }`}
          >
            {f === "ALL" ? ta('allTeams') : f === "PRODUCTION" ? ta('production') : f === "IT_DEV" ? ta('itDev') : ta('creative')}
          </button>
        ))}
      </div>

      {/* Team Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredMembers.map((member, index) => (
          <motion.div
            key={member.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white/5 rounded-xl border border-white/10 overflow-hidden group"
          >
            {/* Image */}
            <div className="relative aspect-square bg-neutral-900">
              {member.image ? (
                <Image
                  src={member.image}
                  alt={member.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-6xl font-bold text-white/10">
                    {member.name.charAt(0)}
                  </span>
                </div>
              )}

              {/* Active badge */}
              <div className="absolute top-3 right-3">
                {member.isActive ? (
                  <Badge className="bg-green-600">{tc('active')}</Badge>
                ) : (
                  <Badge variant="secondary">{tc('inactive')}</Badge>
                )}
              </div>

              {/* Team badge */}
              <div className="absolute top-3 left-3">
                <Badge variant="secondary">
                  {member.team === "PRODUCTION" ? ta('production') : member.team === "IT_DEV" ? ta('itDev') : ta('creative')}
                </Badge>
              </div>

              {/* Hover actions */}
              <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => router.push(`/admin/team/${member.id}`)}
                >
                  <Edit size={16} className="mr-1" />
                  {tc('edit')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleActive(member)}
                  className="text-white hover:text-white"
                >
                  {member.isActive ? (
                    <EyeOff size={16} />
                  ) : (
                    <Eye size={16} />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(member.id, member.name)}
                  className="text-red-500 hover:text-red-400"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              <h3 className="text-lg font-semibold text-white mb-1">
                {member.name}
              </h3>
              <p className="text-red-500 text-sm mb-3">{member.role}</p>

              {/* Skills */}
              {member.skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {member.skills.slice(0, 3).map((skill, idx) => (
                    <span
                      key={idx}
                      className="text-xs bg-white/5 text-white/60 px-2 py-1 rounded-full"
                    >
                      {skill}
                    </span>
                  ))}
                  {member.skills.length > 3 && (
                    <span className="text-xs bg-white/5 text-white/60 px-2 py-1 rounded-full">
                      +{member.skills.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Empty State */}
      {filteredMembers.length === 0 && (
        <div className="text-center py-20">
          <Users className="mx-auto text-white/20 mb-4" size={64} />
          <h3 className="text-xl font-semibold text-white mb-2">
            {tc('noResults')}
          </h3>
          <p className="text-white/60 mb-6">
            {filter === "ALL"
              ? "Add your first team member to get started."
              : `No team members in the ${filter === "PRODUCTION" ? ta('production') : filter === "IT_DEV" ? ta('itDev') : ta('creative')} team.`}
          </p>
          <Button onClick={() => router.push("/admin/team/new")}>
            <Plus size={18} className="mr-2" />
            {ta('addTeamMember')}
          </Button>
        </div>
      )}
    </div>
  );
}
