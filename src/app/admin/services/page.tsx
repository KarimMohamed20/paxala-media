"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, Briefcase, Edit, Trash2, Loader2, Eye, EyeOff, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Service {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string | null;
  image: string | null;
  features: string[];
  order: number;
  isActive: boolean;
}

export default function AdminServicesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<Service[]>([]);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const response = await fetch("/api/services");
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setServices(data);
    } catch (error) {
      console.error("Error fetching services:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;

    try {
      const response = await fetch(`/api/services/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete");

      fetchServices();
    } catch (error) {
      console.error("Error deleting service:", error);
      alert("Failed to delete service");
    }
  };

  const toggleActive = async (service: Service) => {
    try {
      const response = await fetch(`/api/services/${service.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...service,
          isActive: !service.isActive,
        }),
      });

      if (!response.ok) throw new Error("Failed to update");

      fetchServices();
    } catch (error) {
      console.error("Error updating service:", error);
      alert("Failed to update service");
    }
  };

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
            <Briefcase className="text-red-500" size={24} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              Services
            </h1>
            <p className="text-white/60 text-sm">
              Manage your service offerings
            </p>
          </div>
        </div>
        <Button onClick={() => router.push("/admin/services/new")} size="lg">
          <Plus size={18} className="mr-2" />
          Add Service
        </Button>
      </div>

      {/* Services List */}
      <div className="space-y-4">
        {services.map((service, index) => (
          <motion.div
            key={service.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white/5 rounded-xl border border-white/10 p-6 group hover:border-white/20 transition-all"
          >
            <div className="flex items-start gap-4">
              {/* Drag Handle */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity cursor-move">
                <GripVertical className="text-white/40" size={20} />
              </div>

              {/* Order Badge */}
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-lg bg-red-600/20 flex items-center justify-center">
                  <span className="text-red-500 font-semibold text-sm">
                    {service.order}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-white">
                        {service.name}
                      </h3>
                      {service.isActive ? (
                        <Badge className="bg-green-600">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                    <p className="text-white/60 text-sm mb-3">
                      {service.description}
                    </p>
                    {service.features.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {service.features.slice(0, 4).map((feature, idx) => (
                          <span
                            key={idx}
                            className="text-xs bg-white/5 text-white/60 px-2 py-1 rounded-full"
                          >
                            {feature}
                          </span>
                        ))}
                        {service.features.length > 4 && (
                          <span className="text-xs bg-white/5 text-white/60 px-2 py-1 rounded-full">
                            +{service.features.length - 4} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => router.push(`/admin/services/${service.id}`)}
                    >
                      <Edit size={16} className="mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleActive(service)}
                      className="text-white hover:text-white"
                    >
                      {service.isActive ? (
                        <EyeOff size={16} />
                      ) : (
                        <Eye size={16} />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(service.id, service.name)}
                      className="text-red-500 hover:text-red-400"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Empty State */}
      {services.length === 0 && (
        <div className="text-center py-20">
          <Briefcase className="mx-auto text-white/20 mb-4" size={64} />
          <h3 className="text-xl font-semibold text-white mb-2">
            No services found
          </h3>
          <p className="text-white/60 mb-6">
            Add your first service to get started.
          </p>
          <Button onClick={() => router.push("/admin/services/new")}>
            <Plus size={18} className="mr-2" />
            Add Service
          </Button>
        </div>
      )}
    </div>
  );
}
