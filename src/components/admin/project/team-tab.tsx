"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Loader2, UserMinus, Mail, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
  image: string | null;
}

export function ProjectTeamTab({ projectId }: { projectId: string }) {
  const [assignedStaff, setAssignedStaff] = useState<User[]>([]);
  const [availableStaff, setAvailableStaff] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    fetchProjectStaff();
    fetchAvailableStaff();
  }, [projectId]);

  const fetchProjectStaff = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      if (!response.ok) throw new Error("Failed to fetch");
      const project = await response.json();
      setAssignedStaff(project.staff || []);
    } catch (error) {
      console.error("Error fetching project staff:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableStaff = async () => {
    try {
      const response = await fetch("/api/users?role=STAFF,ADMIN");
      if (!response.ok) throw new Error("Failed to fetch");
      const users = await response.json();
      setAvailableStaff(users);
    } catch (error) {
      console.error("Error fetching available staff:", error);
    }
  };

  const handleAssignStaff = async () => {
    if (!selectedStaffId) return;

    setAssigning(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedStaffId }),
      });

      if (!response.ok) throw new Error("Failed to assign");

      setSelectedStaffId("");
      fetchProjectStaff();
    } catch (error) {
      console.error("Error assigning staff:", error);
      alert("Failed to assign staff member");
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveStaff = async (userId: string) => {
    if (!confirm("Are you sure you want to remove this team member from the project?")) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/staff/${userId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to remove");

      fetchProjectStaff();
    } catch (error) {
      console.error("Error removing staff:", error);
      alert("Failed to remove staff member");
    }
  };

  const unassignedStaff = availableStaff.filter(
    (staff) => !assignedStaff.some((assigned) => assigned.id === staff.id)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-white/40" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Assign New Staff */}
      <div className="bg-white/5 rounded-xl border border-white/10 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Assign Team Member</h3>
        <div className="flex gap-3">
          <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select staff member" />
            </SelectTrigger>
            <SelectContent>
              {unassignedStaff.length === 0 ? (
                <div className="p-4 text-center text-white/60 text-sm">
                  All staff members are already assigned
                </div>
              ) : (
                unassignedStaff.map((staff) => (
                  <SelectItem key={staff.id} value={staff.id}>
                    {staff.name || staff.email} ({staff.role})
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <Button
            onClick={handleAssignStaff}
            disabled={!selectedStaffId || assigning}
          >
            {assigning ? (
              <>
                <Loader2 className="animate-spin mr-2" size={18} />
                Assigning...
              </>
            ) : (
              <>
                <Plus size={18} className="mr-2" />
                Assign
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Assigned Staff List */}
      <div className="bg-white/5 rounded-xl border border-white/10 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-white">Team Members</h3>
            <p className="text-white/60 text-sm">
              {assignedStaff.length} member{assignedStaff.length !== 1 ? "s" : ""} assigned
            </p>
          </div>
        </div>

        {assignedStaff.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <Shield className="text-white/40" size={32} />
            </div>
            <h4 className="text-lg font-semibold text-white mb-2">No team members yet</h4>
            <p className="text-white/60 text-sm mb-6">
              Assign staff members to collaborate on this project.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assignedStaff.map((staff, index) => (
              <motion.div
                key={staff.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white/5 rounded-lg p-4 border border-white/10 hover:border-white/20 transition-all group"
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {staff.image ? (
                      <img
                        src={staff.image}
                        alt={staff.name || "User"}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-red-600/20 flex items-center justify-center">
                        <span className="text-red-500 font-semibold text-lg">
                          {(staff.name || staff.email).charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-white truncate">
                      {staff.name || "Unnamed User"}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Mail size={12} className="text-white/40" />
                      <p className="text-white/60 text-xs truncate">{staff.email}</p>
                    </div>
                    <div className="mt-2">
                      <Badge
                        className={cn(
                          "text-xs",
                          staff.role === "ADMIN"
                            ? "bg-purple-600"
                            : "bg-blue-600"
                        )}
                      >
                        {staff.role}
                      </Badge>
                    </div>
                  </div>

                  {/* Remove Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveStaff(staff.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-400"
                  >
                    <UserMinus size={16} />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
