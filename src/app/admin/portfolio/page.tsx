"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  Image as ImageIcon,
  Search,
  Plus,
  MoreVertical,
  Trash2,
  Edit,
  Eye,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslations } from 'next-intl';

interface PortfolioItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  thumbnail: string | null;
  category: string;
  featured: boolean;
  published: boolean;
  clientName: string | null;
  createdAt: string;
}

const categories = [
  "VIDEO_PRODUCTION",
  "PHOTOGRAPHY",
  "GRAPHIC_DESIGN",
  "WEB_DEVELOPMENT",
  "APP_DEVELOPMENT",
  "THREE_D_MODELING",
  "ANIMATION",
  "SOCIAL_MEDIA",
];

export default function AdminPortfolioPage() {
  const router = useRouter();
  const ta = useTranslations('adminUI');
  const tc = useTranslations('common');
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const fetchPortfolio = async () => {
    try {
      const params = new URLSearchParams();
      if (categoryFilter) params.append("category", categoryFilter);
      if (search) params.append("search", search);

      const response = await fetch(`/api/portfolio?${params}`);
      if (!response.ok) throw new Error("Failed to fetch portfolio");
      const data = await response.json();
      setPortfolio(data);
    } catch (err) {
      console.error("Error fetching portfolio:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();
  }, [search, categoryFilter]);

  const handleDelete = async (id: string) => {
    if (!confirm(ta('deleteConfirm')))
      return;

    try {
      const response = await fetch(`/api/portfolio/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete");
      fetchPortfolio();
    } catch (err) {
      alert(ta('errorOccurred'));
    }
  };

  const handleTogglePublish = async (item: PortfolioItem) => {
    try {
      const response = await fetch(`/api/portfolio/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...item,
          published: !item.published,
        }),
      });

      if (!response.ok) throw new Error("Failed to update");
      fetchPortfolio();
    } catch (err) {
      alert(ta('errorOccurred'));
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
          <h1 className="text-3xl font-bold text-white mb-2">{ta('portfolio')}</h1>
          <p className="text-white/60">{ta('managePortfolio')}</p>
        </div>
        <Button onClick={() => router.push("/admin/portfolio/new")}>
          <Plus size={18} className="mr-2" />
          {ta('newPortfolioItem')}
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
            placeholder={tc('search')}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {categories.slice(0, 4).map((cat) => (
            <Button
              key={cat}
              variant={categoryFilter === cat ? "default" : "secondary"}
              size="sm"
              onClick={() =>
                setCategoryFilter(categoryFilter === cat ? null : cat)
              }
            >
              {cat.replace(/_/g, " ")}
            </Button>
          ))}
        </div>
      </motion.div>

      {/* Portfolio Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-white/40" size={24} />
          </div>
        ) : portfolio.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <ImageIcon size={48} className="text-white/20 mx-auto mb-4" />
              <p className="text-white/40">{tc('noResults')}</p>
              <Button
                className="mt-4"
                onClick={() => router.push("/admin/portfolio/new")}
              >
                {ta('newPortfolioItem')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {portfolio.map((item) => (
              <Card key={item.id} className="group overflow-hidden">
                <div className="relative aspect-video bg-white/5">
                  {item.thumbnail ? (
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-12 h-12 text-white/20" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2 flex gap-2">
                    {item.featured && (
                      <Badge variant="warning">{tc('featured')}</Badge>
                    )}
                    <Badge variant={item.published ? "success" : "secondary"}>
                      {item.published ? tc('published') : tc('draft')}
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-4">
                  <h3 className="text-lg font-semibold text-white mb-1">
                    {item.title}
                  </h3>
                  <p className="text-sm text-white/60 mb-2">
                    {item.category.replace(/_/g, " ")}
                  </p>
                  <p className="text-sm text-white/40 line-clamp-2 mb-4">
                    {item.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/40">
                      {format(new Date(item.createdAt), "MMM d, yyyy")}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical size={16} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            router.push(`/admin/portfolio/${item.id}`)
                          }
                        >
                          <Edit size={16} className="mr-2" />
                          {tc('edit')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleTogglePublish(item)}
                        >
                          <Eye size={16} className="mr-2" />
                          {item.published ? ta('unpublish') : ta('publish')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(item.id)}
                          className="text-red-500"
                        >
                          <Trash2 size={16} className="mr-2" />
                          {tc('delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
