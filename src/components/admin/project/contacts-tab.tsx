"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Loader2, UserMinus, Phone, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Contact {
  id: string;
  name: string;
  phone: string;
  jobTitle?: string | null;
  client?: {
    id: string;
    name: string | null;
  };
}

interface ProjectData {
  id: string;
  clientId: string | null;
  contacts: Contact[];
}

export function ProjectContactsTab({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<ProjectData | null>(null);
  const [availableContacts, setAvailableContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContactId, setSelectedContactId] = useState("");
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    fetchProjectData();
  }, [projectId]);

  const fetchProjectData = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      if (!response.ok) throw new Error("Failed to fetch");
      const projectData = await response.json();

      setProject({
        id: projectData.id,
        clientId: projectData.clientId,
        contacts: projectData.contacts || [],
      });

      // Fetch available contacts if client is assigned
      if (projectData.clientId) {
        fetchAvailableContacts(projectData.clientId);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error("Error fetching project:", error);
      setLoading(false);
    }
  };

  const fetchAvailableContacts = async (clientId: string) => {
    try {
      const response = await fetch(`/api/users/${clientId}/contacts`);
      if (!response.ok) throw new Error("Failed to fetch");
      const contacts = await response.json();
      setAvailableContacts(contacts);
    } catch (error) {
      console.error("Error fetching contacts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignContact = async () => {
    if (!selectedContactId) return;

    setAssigning(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId: selectedContactId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to assign");
      }

      setSelectedContactId("");
      fetchProjectData();
    } catch (error) {
      console.error("Error assigning contact:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to assign contact"
      );
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveContact = async (contactId: string) => {
    if (!confirm("Are you sure you want to remove this contact from the project?"))
      return;

    try {
      const response = await fetch(
        `/api/projects/${projectId}/contacts/${contactId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) throw new Error("Failed to remove");

      fetchProjectData();
    } catch (error) {
      console.error("Error removing contact:", error);
      alert("Failed to remove contact");
    }
  };

  const assignedContacts = project?.contacts || [];
  const unassignedContacts = availableContacts.filter(
    (contact) => !assignedContacts.some((assigned) => assigned.id === contact.id)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-white/40" size={48} />
      </div>
    );
  }

  if (!project?.clientId) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
          <User className="text-white/40" size={32} />
        </div>
        <h4 className="text-lg font-semibold text-white mb-2">
          No Client Assigned
        </h4>
        <p className="text-white/60 text-sm">
          Please assign a client to this project before adding contacts.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Assign New Contact */}
      <div className="bg-white/5 rounded-xl border border-white/10 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          Assign Contact Person
        </h3>
        <div className="flex gap-3">
          <Select value={selectedContactId} onValueChange={setSelectedContactId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select contact person" />
            </SelectTrigger>
            <SelectContent>
              {unassignedContacts.length === 0 ? (
                <div className="p-4 text-center text-white/60 text-sm">
                  {availableContacts.length === 0
                    ? "No contacts available for this client"
                    : "All contacts are already assigned"}
                </div>
              ) : (
                unassignedContacts.map((contact) => (
                  <SelectItem key={contact.id} value={contact.id}>
                    {contact.name} - {contact.phone}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <Button
            onClick={handleAssignContact}
            disabled={!selectedContactId || assigning}
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

      {/* Assigned Contacts List */}
      <div className="bg-white/5 rounded-xl border border-white/10 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-white">
              Assigned Contacts
            </h3>
            <p className="text-white/60 text-sm">
              {assignedContacts.length} contact
              {assignedContacts.length !== 1 ? "s" : ""} assigned
            </p>
          </div>
        </div>

        {assignedContacts.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <User className="text-white/40" size={32} />
            </div>
            <h4 className="text-lg font-semibold text-white mb-2">
              No contacts assigned yet
            </h4>
            <p className="text-white/60 text-sm mb-6">
              Assign contact persons to this project for better communication.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assignedContacts.map((contact, index) => (
              <motion.div
                key={contact.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white/5 rounded-lg p-4 border border-white/10 hover:border-white/20 transition-all group"
              >
                <div className="flex items-start gap-3">
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-white truncate mb-1">
                      {contact.name}
                    </h4>
                    {contact.jobTitle && (
                      <p className="text-white/50 text-xs mb-1 truncate">
                        {contact.jobTitle}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-white/60 text-sm mb-1">
                      <Phone size={12} className="text-white/40 flex-shrink-0" />
                      <p className="truncate">{contact.phone}</p>
                    </div>
                    {contact.client && (
                      <p className="text-white/40 text-xs truncate">
                        {contact.client.name || "Client"}
                      </p>
                    )}
                  </div>

                  {/* Remove Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveContact(contact.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-400 flex-shrink-0"
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
