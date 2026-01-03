"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { useTranslations } from "next-intl";
import {
  Users,
  Search,
  Plus,
  MoreVertical,
  Trash2,
  Edit,
  Loader2,
  X,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface User {
  id: string;
  username: string;
  name: string | null;
  email: string | null;
  image: string | null;
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
  _count: {
    projects: number;
    bookings: number;
  };
}

const roleColors = {
  ADMIN: "destructive",
  STAFF: "warning",
  CLIENT: "default",
} as const;

export default function UsersPage() {
  const router = useRouter();
  const ta = useTranslations('adminUI');
  const tc = useTranslations('common');
  const t = useTranslations('admin');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    username: "",
    name: "",
    email: "",
    password: "",
    role: "CLIENT",
    industry: "",
    socialMedia: {
      facebook: "",
      instagram: "",
      twitter: "",
      linkedin: "",
      youtube: "",
      tiktok: "",
    },
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    role: "CLIENT",
    industry: "",
    socialMedia: {
      facebook: "",
      instagram: "",
      twitter: "",
      linkedin: "",
      youtube: "",
      tiktok: "",
    },
  });
  const [editLoading, setEditLoading] = useState(false);

  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (roleFilter) params.append("role", roleFilter);

      const response = await fetch(`/api/users?${params}`);
      if (!response.ok) throw new Error("Failed to fetch users");
      const data = await response.json();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [search, roleFilter]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setError(null);

    try {
      // Filter out empty social media values
      const socialMediaData = Object.fromEntries(
        Object.entries(createForm.socialMedia).filter(([_, v]) => v.trim() !== "")
      );

      const payload = {
        ...createForm,
        socialMedia: Object.keys(socialMediaData).length > 0 ? socialMediaData : undefined,
      };

      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create user");
      }

      setIsCreateModalOpen(false);
      setCreateForm({
        username: "",
        name: "",
        email: "",
        password: "",
        role: "CLIENT",
        industry: "",
        socialMedia: {
          facebook: "",
          instagram: "",
          twitter: "",
          linkedin: "",
          youtube: "",
          tiktok: "",
        },
      });
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
      const response = await fetch(`/api/users/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete user");
      }

      fetchUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete user");
    }
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setEditForm({
      name: user.name || "",
      role: user.role,
      industry: user.industry || "",
      socialMedia: {
        facebook: (user.socialMedia as any)?.facebook || "",
        instagram: (user.socialMedia as any)?.instagram || "",
        twitter: (user.socialMedia as any)?.twitter || "",
        linkedin: (user.socialMedia as any)?.linkedin || "",
        youtube: (user.socialMedia as any)?.youtube || "",
        tiktok: (user.socialMedia as any)?.tiktok || "",
      },
    });
    setIsEditModalOpen(true);
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditLoading(true);
    setError(null);

    try {
      // Filter out empty social media values
      const socialMediaData = Object.fromEntries(
        Object.entries(editForm.socialMedia).filter(([_, v]) => v.trim() !== "")
      );

      const payload = {
        ...editForm,
        socialMedia: Object.keys(socialMediaData).length > 0 ? socialMediaData : null,
      };

      const response = await fetch(`/api/users/${editingUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update user");
      }

      setIsEditModalOpen(false);
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-8"
      >
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Users</h1>
          <p className="text-white/60">Manage user accounts and permissions.</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus size={18} className="mr-2" />
          {ta('addUser')}
        </Button>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex gap-4 mb-6"
      >
        <div className="relative flex-1 max-w-md">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tc('searchPlaceholder')}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {["ADMIN", "STAFF", "CLIENT"].map((role) => (
            <Button
              key={role}
              variant={roleFilter === role ? "default" : "secondary"}
              size="sm"
              onClick={() => setRoleFilter(roleFilter === role ? null : role)}
            >
              {role}
            </Button>
          ))}
        </div>
      </motion.div>

      {/* Users List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="animate-spin text-white/40" size={24} />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12">
                <Users size={48} className="text-white/20 mx-auto mb-4" />
                <p className="text-white/40">No users found</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left p-4 text-white/60 font-medium">
                      User
                    </th>
                    <th className="text-left p-4 text-white/60 font-medium">
                      Role
                    </th>
                    <th className="text-left p-4 text-white/60 font-medium">
                      Projects
                    </th>
                    <th className="text-left p-4 text-white/60 font-medium">
                      Bookings
                    </th>
                    <th className="text-left p-4 text-white/60 font-medium">
                      Joined
                    </th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-white/5 hover:bg-white/5"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-red-600/20 flex items-center justify-center text-red-500 font-medium">
                            {user.username[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-white font-medium">
                              {user.name || user.username}
                            </p>
                            <p className="text-white/40 text-sm">@{user.username}</p>
                            {user.email && (
                              <p className="text-white/30 text-xs">{user.email}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          <Badge
                            variant={
                              roleColors[user.role as keyof typeof roleColors] ||
                              "secondary"
                            }
                          >
                            {user.role}
                          </Badge>
                          {user.role === "CLIENT" && user.industry && (
                            <p className="text-white/40 text-xs mt-1">{user.industry}</p>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-white/60">
                        {user._count.projects}
                      </td>
                      <td className="p-4 text-white/60">
                        {user._count.bookings}
                      </td>
                      <td className="p-4 text-white/60 text-sm">
                        {format(new Date(user.createdAt), "MMM d, yyyy")}
                      </td>
                      <td className="p-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical size={16} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {user.role === "CLIENT" && (
                              <DropdownMenuItem onClick={() => router.push(`/admin/users/${user.id}`)}>
                                <Eye size={16} className="mr-2" />
                                {ta('viewDetails')}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => openEditModal(user)}>
                              <Edit size={16} className="mr-2" />
                              {ta('editRole')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteUser(user.id)}
                              className="text-red-500"
                            >
                              <Trash2 size={16} className="mr-2" />
                              {tc('delete')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Create User Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateUser} className="space-y-4">
            {error && (
              <div className="bg-red-600/10 border border-red-600/20 rounded-lg p-3">
                <p className="text-red-500 text-sm">{error}</p>
              </div>
            )}
            <div>
              <label className="block text-sm text-white/70 mb-2">Username *</label>
              <Input
                value={createForm.username}
                onChange={(e) =>
                  setCreateForm({ ...createForm, username: e.target.value })
                }
                placeholder="username"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-2">Name <span className="text-white/40">(optional)</span></label>
              <Input
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm({ ...createForm, name: e.target.value })
                }
                placeholder="Full name"
              />
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-2">Email <span className="text-white/40">(optional)</span></label>
              <Input
                type="email"
                value={createForm.email}
                onChange={(e) =>
                  setCreateForm({ ...createForm, email: e.target.value })
                }
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-2">
                Password
              </label>
              <Input
                type="password"
                value={createForm.password}
                onChange={(e) =>
                  setCreateForm({ ...createForm, password: e.target.value })
                }
                placeholder="Min 6 characters"
                required
                minLength={6}
              />
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-2">Role</label>
              <Select
                value={createForm.role}
                onValueChange={(value) =>
                  setCreateForm({ ...createForm, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CLIENT">Client</SelectItem>
                  <SelectItem value="STAFF">Staff</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {createForm.role === "CLIENT" && (
              <>
                <div>
                  <label className="block text-sm text-white/70 mb-2">
                    Industry <span className="text-white/40">(optional)</span>
                  </label>
                  <Input
                    value={createForm.industry || ""}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, industry: e.target.value })
                    }
                    placeholder="e.g., Healthcare, Finance, E-commerce"
                  />
                </div>
                <div className="space-y-3">
                  <label className="block text-sm text-white/70">
                    Social Media <span className="text-white/40">(optional)</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      value={createForm.socialMedia.facebook}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          socialMedia: { ...createForm.socialMedia, facebook: e.target.value },
                        })
                      }
                      placeholder="Facebook URL"
                    />
                    <Input
                      value={createForm.socialMedia.instagram}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          socialMedia: { ...createForm.socialMedia, instagram: e.target.value },
                        })
                      }
                      placeholder="Instagram URL"
                    />
                    <Input
                      value={createForm.socialMedia.twitter}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          socialMedia: { ...createForm.socialMedia, twitter: e.target.value },
                        })
                      }
                      placeholder="Twitter/X URL"
                    />
                    <Input
                      value={createForm.socialMedia.linkedin}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          socialMedia: { ...createForm.socialMedia, linkedin: e.target.value },
                        })
                      }
                      placeholder="LinkedIn URL"
                    />
                    <Input
                      value={createForm.socialMedia.youtube}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          socialMedia: { ...createForm.socialMedia, youtube: e.target.value },
                        })
                      }
                      placeholder="YouTube URL"
                    />
                    <Input
                      value={createForm.socialMedia.tiktok}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          socialMedia: { ...createForm.socialMedia, tiktok: e.target.value },
                        })
                      }
                      placeholder="TikTok URL"
                    />
                  </div>
                </div>
              </>
            )}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsCreateModalOpen(false)}
              >
                {tc('cancel')}
              </Button>
              <Button type="submit" disabled={createLoading}>
                {createLoading ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={16} />
                    {tc('saving')}
                  </>
                ) : (
                  `${tc('create')} ${ta('addUser')}`
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditUser} className="space-y-4">
            {error && (
              <div className="bg-red-600/10 border border-red-600/20 rounded-lg p-3">
                <p className="text-red-500 text-sm">{error}</p>
              </div>
            )}
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-red-600/20 flex items-center justify-center text-red-500 font-medium">
                {editingUser?.username?.[0]?.toUpperCase()}
              </div>
              <div>
                <p className="text-white font-medium">
                  {editingUser?.name || editingUser?.username}
                </p>
                <p className="text-white/40 text-sm">@{editingUser?.username}</p>
                {editingUser?.email && (
                  <p className="text-white/30 text-xs">{editingUser?.email}</p>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-2">Name</label>
              <Input
                value={editForm.name}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
                placeholder="Full name"
              />
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-2">Role</label>
              <Select
                value={editForm.role}
                onValueChange={(value) =>
                  setEditForm({ ...editForm, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CLIENT">Client</SelectItem>
                  <SelectItem value="STAFF">Staff</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editForm.role === "CLIENT" && (
              <>
                <div>
                  <label className="block text-sm text-white/70 mb-2">
                    Industry <span className="text-white/40">(optional)</span>
                  </label>
                  <Input
                    value={editForm.industry || ""}
                    onChange={(e) =>
                      setEditForm({ ...editForm, industry: e.target.value })
                    }
                    placeholder="e.g., Healthcare, Finance, E-commerce"
                  />
                </div>
                <div className="space-y-3">
                  <label className="block text-sm text-white/70">
                    Social Media <span className="text-white/40">(optional)</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      value={editForm.socialMedia.facebook}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          socialMedia: { ...editForm.socialMedia, facebook: e.target.value },
                        })
                      }
                      placeholder="Facebook URL"
                    />
                    <Input
                      value={editForm.socialMedia.instagram}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          socialMedia: { ...editForm.socialMedia, instagram: e.target.value },
                        })
                      }
                      placeholder="Instagram URL"
                    />
                    <Input
                      value={editForm.socialMedia.twitter}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          socialMedia: { ...editForm.socialMedia, twitter: e.target.value },
                        })
                      }
                      placeholder="Twitter/X URL"
                    />
                    <Input
                      value={editForm.socialMedia.linkedin}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          socialMedia: { ...editForm.socialMedia, linkedin: e.target.value },
                        })
                      }
                      placeholder="LinkedIn URL"
                    />
                    <Input
                      value={editForm.socialMedia.youtube}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          socialMedia: { ...editForm.socialMedia, youtube: e.target.value },
                        })
                      }
                      placeholder="YouTube URL"
                    />
                    <Input
                      value={editForm.socialMedia.tiktok}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          socialMedia: { ...editForm.socialMedia, tiktok: e.target.value },
                        })
                      }
                      placeholder="TikTok URL"
                    />
                  </div>
                </div>
              </>
            )}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsEditModalOpen(false)}
              >
                {tc('cancel')}
              </Button>
              <Button type="submit" disabled={editLoading}>
                {editLoading ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={16} />
                    {tc('saving')}
                  </>
                ) : (
                  ta('saveChanges')
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
