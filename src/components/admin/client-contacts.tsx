"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Loader2, Trash2, Edit, Phone, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";

interface ClientContact {
  id: string;
  name: string;
  phone: string;
  jobTitle?: string | null;
  createdAt: string;
}

interface ClientContactsProps {
  clientId: string;
  clientName: string;
}

export function ClientContacts({ clientId, clientName }: ClientContactsProps) {
  const [contacts, setContacts] = useState<ClientContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ClientContact | null>(null);
  const [addForm, setAddForm] = useState({ name: "", phone: "", jobTitle: "" });
  const [editForm, setEditForm] = useState({ name: "", phone: "", jobTitle: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchContacts();
  }, [clientId]);

  const fetchContacts = async () => {
    try {
      const response = await fetch(`/api/users/${clientId}/contacts`);
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setContacts(data);
    } catch (error) {
      console.error("Error fetching contacts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/users/${clientId}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to add contact");
      }

      setIsAddModalOpen(false);
      setAddForm({ name: "", phone: "", jobTitle: "" });
      fetchContacts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleEditContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContact) return;
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/users/${clientId}/contacts/${editingContact.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editForm),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update contact");
      }

      setIsEditModalOpen(false);
      setEditingContact(null);
      fetchContacts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!confirm("Are you sure you want to delete this contact?")) return;

    try {
      const response = await fetch(
        `/api/users/${clientId}/contacts/${contactId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) throw new Error("Failed to delete");

      fetchContacts();
    } catch (error) {
      console.error("Error deleting contact:", error);
      alert("Failed to delete contact");
    }
  };

  const openEditModal = (contact: ClientContact) => {
    setEditingContact(contact);
    setEditForm({
      name: contact.name,
      phone: contact.phone,
      jobTitle: contact.jobTitle || "",
    });
    setIsEditModalOpen(true);
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
      {/* Add New Contact */}
      <div className="bg-white/5 rounded-xl border border-white/10 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Contact Persons</h3>
            <p className="text-white/60 text-sm">
              Manage contact persons for {clientName}
            </p>
          </div>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus size={18} className="mr-2" />
            Add Contact
          </Button>
        </div>
      </div>

      {/* Contacts List */}
      <div className="bg-white/5 rounded-xl border border-white/10 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-white">Contacts</h3>
            <p className="text-white/60 text-sm">
              {contacts.length} contact{contacts.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {contacts.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <User className="text-white/40" size={32} />
            </div>
            <h4 className="text-lg font-semibold text-white mb-2">
              No contacts yet
            </h4>
            <p className="text-white/60 text-sm mb-6">
              Add contact persons for this client.
            </p>
            <Button onClick={() => setIsAddModalOpen(true)}>
              <Plus size={18} className="mr-2" />
              Add First Contact
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {contacts.map((contact, index) => (
              <motion.div
                key={contact.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white/5 rounded-lg p-4 border border-white/10 hover:border-white/20 transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-white truncate mb-1">
                      {contact.name}
                    </h4>
                    {contact.jobTitle && (
                      <p className="text-white/50 text-xs mb-1 truncate">{contact.jobTitle}</p>
                    )}
                    <div className="flex items-center gap-2 text-white/60 text-sm">
                      <Phone size={14} />
                      <span className="truncate">{contact.phone}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(contact)}
                      className="text-white/60 hover:text-white"
                    >
                      <Edit size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteContact(contact.id)}
                      className="text-red-500 hover:text-red-400"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
                <div className="text-white/40 text-xs">
                  Added {format(new Date(contact.createdAt), "MMM d, yyyy")}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Add Contact Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Contact Person</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddContact} className="space-y-4">
            {error && (
              <div className="bg-red-600/10 border border-red-600/20 rounded-lg p-3">
                <p className="text-red-500 text-sm">{error}</p>
              </div>
            )}
            <div>
              <label className="block text-sm text-white/70 mb-2">
                Name *
              </label>
              <Input
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                placeholder="Full name"
                required
                minLength={2}
              />
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-2">
                Phone Number *
              </label>
              <Input
                value={addForm.phone}
                onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                placeholder="+1 (555) 123-4567"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-2">
                Job Title <span className="text-white/40">(optional)</span>
              </label>
              <Input
                value={addForm.jobTitle}
                onChange={(e) => setAddForm({ ...addForm, jobTitle: e.target.value })}
                placeholder="e.g., Project Manager, CEO"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsAddModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={16} />
                    Adding...
                  </>
                ) : (
                  "Add Contact"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Contact Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Contact Person</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditContact} className="space-y-4">
            {error && (
              <div className="bg-red-600/10 border border-red-600/20 rounded-lg p-3">
                <p className="text-red-500 text-sm">{error}</p>
              </div>
            )}
            <div>
              <label className="block text-sm text-white/70 mb-2">
                Name *
              </label>
              <Input
                value={editForm.name}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
                placeholder="Full name"
                required
                minLength={2}
              />
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-2">
                Phone Number *
              </label>
              <Input
                value={editForm.phone}
                onChange={(e) =>
                  setEditForm({ ...editForm, phone: e.target.value })
                }
                placeholder="+1 (555) 123-4567"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-2">
                Job Title <span className="text-white/40">(optional)</span>
              </label>
              <Input
                value={editForm.jobTitle}
                onChange={(e) =>
                  setEditForm({ ...editForm, jobTitle: e.target.value })
                }
                placeholder="e.g., Project Manager, CEO"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsEditModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={16} />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
