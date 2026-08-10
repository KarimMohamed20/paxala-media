"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import {
  Search,
  Folder as FolderIcon,
  FolderPlus,
  Upload,
  HardDrive,
  Users,
  Calendar,
  Grid,
  List,
  Play,
  MoreVertical,
  Download,
  Share2,
  CheckCircle2,
  FileText,
  Loader2,
  ChevronRight,
  ArrowLeft,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AssetDetailDrawer, AssetDetail } from "@/components/portal/asset-detail-drawer";
import { CreateFolderModal } from "@/components/portal/create-folder-modal";
import { UploadFileModal } from "@/components/portal/upload-file-modal";

interface FolderItem {
  id?: string;
  name: string;
  slug?: string;
  filesCount: number;
  updatedDate: string;
  shared?: boolean;
  color?: string;
}

interface DAMResponse {
  stats: {
    totalAssets: number;
    storageUsedFormatted: string;
    storageCapacityFormatted: string;
    storageUsedBytes: number;
    storageCapacityBytes: number;
    sharedFilesCount: number;
    addedThisMonthCount: number;
  };
  folders: FolderItem[];
  projects: Array<{
    id: string;
    title: string;
    slug: string;
  }>;
  assets: AssetDetail[];
}

export default function FilesPage() {
  const t = useTranslations("portal");
  const tc = useTranslations("common");

  const [data, setData] = useState<DAMResponse | null>(null);
  const [dbFolders, setDbFolders] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All Assets");
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Folders system active selection
  const [activeFolder, setActiveFolder] = useState<FolderItem | null>(null);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Selected asset for detail drawer
  const [selectedAsset, setSelectedAsset] = useState<AssetDetail | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const fetchAssetsAndFolders = async () => {
    try {
      const [filesRes, foldersRes] = await Promise.all([
        fetch("/api/files?global=true"),
        fetch("/api/folders"),
      ]);

      if (filesRes.ok) {
        const filesJson = await filesRes.json();
        setData(filesJson);
      }

      if (foldersRes.ok) {
        const foldersJson = await foldersRes.json();
        setDbFolders(foldersJson);
      }
    } catch (err) {
      console.error("Failed to load asset library:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssetsAndFolders();
  }, []);

  const categories = [
    "All Assets",
    "Video",
    "Photography",
    "Design",
    "Brand Files",
    "Web & Digital",
    "Documents",
  ];

  const assets = data?.assets || [];
  const folders = dbFolders.length > 0 ? dbFolders : (data?.folders || []);

  const filteredAssets = assets.filter((asset) => {
    const matchesSearch =
      asset.name.toLowerCase().includes(search.toLowerCase()) ||
      (asset.projectTitle && asset.projectTitle.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory =
      categoryFilter === "All Assets" ||
      (categoryFilter === "Video" && (asset.type === "video" || asset.category === "Video")) ||
      (categoryFilter === "Photography" && (asset.type === "image" || asset.category === "Photography")) ||
      (categoryFilter === "Design" && asset.category === "Design") ||
      (categoryFilter === "Brand Files" && asset.category === "Brand Files") ||
      (categoryFilter === "Web & Digital" && asset.category === "Web & Digital") ||
      (categoryFilter === "Documents" && (asset.type === "pdf" || asset.category === "Documents"));

    const matchesProject =
      selectedProject === "all" || asset.projectId === selectedProject;

    const matchesActiveFolder =
      !activeFolder ||
      (asset as any).folder === activeFolder.name ||
      (asset as any).folderId === activeFolder.id;

    return matchesSearch && matchesCategory && matchesProject && matchesActiveFolder;
  });

  const stats = data?.stats || {
    totalAssets: assets.length,
    storageUsedFormatted: "72.4 GB",
    storageCapacityFormatted: "150 GB",
    storageUsedBytes: 72400000000,
    storageCapacityBytes: 150000000000,
    sharedFilesCount: 38,
    addedThisMonthCount: 24,
  };

  const handleOpenAsset = (asset: AssetDetail) => {
    setSelectedAsset(asset);
    setIsDrawerOpen(true);
  };

  const handleDeleteFolder = async (e: React.MouseEvent, folderId?: string) => {
    e.stopPropagation();
    if (!folderId) return;
    if (!confirm("Are you sure you want to delete this folder?")) return;

    try {
      const res = await fetch(`/api/folders?id=${folderId}`, { method: "DELETE" });
      if (res.ok) {
        if (activeFolder?.id === folderId) setActiveFolder(null);
        fetchAssetsAndFolders();
      }
    } catch (err) {
      console.error("Failed to delete folder:", err);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Asset Library
          </h1>
          <p className="text-white/60 text-sm mt-1">
            All your approved brand, production and campaign files
          </p>
        </div>

        {/* Top Header Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative min-w-[240px] flex-1 sm:flex-none">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40"
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search files and folders"
              className="pl-10 pr-4 py-2 bg-white/5 border-white/10 rounded-xl text-sm text-white placeholder:text-white/40 focus:border-red-500/50"
            />
          </div>

          <Button
            onClick={() => setIsCreateFolderOpen(true)}
            variant="outline"
            className="border-white/10 text-white hover:bg-white/5 bg-transparent rounded-xl text-xs font-semibold px-4 py-2 flex items-center gap-2"
          >
            <FolderPlus size={16} />
            <span>New Folder</span>
          </Button>

          <Button
            onClick={() => setIsUploadModalOpen(true)}
            className="bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold px-4 py-2 flex items-center gap-2 shadow-lg shadow-red-600/20"
          >
            <Upload size={16} />
            <span>Upload Files</span>
          </Button>
        </div>
      </div>

      {/* Storage & Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Assets */}
        <div className="bg-neutral-900/70 border border-white/10 rounded-2xl p-5 flex items-center gap-4 shadow-xl">
          <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/80">
            <FolderIcon size={22} />
          </div>
          <div>
            <p className="text-2xl font-bold text-white tracking-tight">
              {stats.totalAssets}
            </p>
            <p className="text-xs text-white/50 font-medium mt-0.5">Total Assets</p>
          </div>
        </div>

        {/* Card 2: Storage Used */}
        <div className="bg-neutral-900/70 border border-white/10 rounded-2xl p-5 flex items-center gap-4 shadow-xl">
          <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/80">
            <HardDrive size={22} />
          </div>
          <div className="flex-1">
            <p className="text-2xl font-bold text-white tracking-tight">
              {stats.storageUsedFormatted}
            </p>
            <p className="text-xs text-white/50 font-medium mt-0.5 mb-1.5">Storage Used</p>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-600 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (stats.storageUsedBytes / stats.storageCapacityBytes) * 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-white/40 mt-1 font-mono">
              {stats.storageUsedFormatted} of {stats.storageCapacityFormatted}
            </p>
          </div>
        </div>

        {/* Card 3: Shared Files */}
        <div className="bg-neutral-900/70 border border-white/10 rounded-2xl p-5 flex items-center gap-4 shadow-xl">
          <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/80">
            <Users size={22} />
          </div>
          <div>
            <p className="text-2xl font-bold text-white tracking-tight">
              {stats.sharedFilesCount}
            </p>
            <p className="text-xs text-white/50 font-medium mt-0.5">Shared Files</p>
          </div>
        </div>

        {/* Card 4: Added This Month */}
        <div className="bg-neutral-900/70 border border-white/10 rounded-2xl p-5 flex items-center gap-4 shadow-xl">
          <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/80">
            <Calendar size={22} />
          </div>
          <div>
            <p className="text-2xl font-bold text-white tracking-tight">
              {stats.addedThisMonthCount}
            </p>
            <p className="text-xs text-white/50 font-medium mt-0.5">Added This Month</p>
          </div>
        </div>
      </div>

      {/* Filter & View Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-4">
        {/* Category Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
          {categories.map((cat) => {
            const isActive = categoryFilter === cat;
            return (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                  isActive
                    ? "bg-red-600 text-white shadow-lg shadow-red-600/30"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Right Toolbar Controls */}
        <div className="flex items-center gap-3">
          {/* Project Filter */}
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            aria-label="Filter by Project"
            className="bg-neutral-900 border border-white/10 text-white text-xs rounded-xl px-3 py-2 outline-none focus:border-red-500 cursor-pointer"
          >
            <option value="all">All Projects</option>
            {data?.projects?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>

          {/* Sort Dropdown */}
          <select
            aria-label="Sort Files"
            className="bg-neutral-900 border border-white/10 text-white text-xs rounded-xl px-3 py-2 outline-none focus:border-red-500 cursor-pointer"
          >
            <option value="recently_updated">Recently Updated</option>
            <option value="name">Name</option>
            <option value="size">Size</option>
          </select>

          {/* View Toggles */}
          <div className="flex items-center bg-neutral-900 border border-white/10 rounded-xl p-0.5">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === "grid" ? "bg-red-600 text-white" : "text-white/40 hover:text-white"
              }`}
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === "list" ? "bg-red-600 text-white" : "text-white/40 hover:text-white"
              }`}
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Folders Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white tracking-tight">Folders</h2>
          {activeFolder && (
            <button
              onClick={() => setActiveFolder(null)}
              className="text-xs text-red-400 hover:text-red-300 font-semibold flex items-center gap-1"
            >
              <ArrowLeft size={14} />
              <span>Show All Folders</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {folders.map((folder, index) => {
            const isSelected = activeFolder?.name === folder.name;
            return (
              <motion.div
                key={folder.id || index}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                onClick={() => setActiveFolder(isSelected ? null : folder)}
                className={`bg-neutral-900/60 border rounded-2xl p-4 transition-all cursor-pointer group flex flex-col justify-between ${
                  isSelected
                    ? "border-red-500 bg-red-600/10 shadow-lg shadow-red-600/20"
                    : "border-white/10 hover:border-white/20"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div
                      className={`w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center transition-colors ${
                        isSelected ? "text-red-500 bg-red-500/20" : "text-white/80 group-hover:text-red-500"
                      }`}
                    >
                      <FolderIcon size={20} />
                    </div>
                    <div className="flex items-center gap-1.5">
                      {folder.shared && <Users size={14} className="text-white/40" />}
                      {folder.id && (
                        <button
                          onClick={(e) => handleDeleteFolder(e, folder.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-white/40 hover:text-red-400 transition-opacity"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                  <h3 className="text-sm font-bold text-white truncate group-hover:text-red-400 transition-colors">
                    {folder.name}
                  </h3>
                  <p className="text-[11px] text-white/50 font-medium mt-1">
                    {folder.filesCount} files
                  </p>
                </div>
                <p className="text-[10px] text-white/40 mt-3 font-mono">
                  {folder.updatedDate}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Recent Assets Section */}
      <div className="space-y-4 pt-2">
        {/* Breadcrumb Navigation Trail */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-white/60">
            <button
              onClick={() => setActiveFolder(null)}
              className="hover:text-white font-medium transition-colors"
            >
              All Assets
            </button>
            {activeFolder && (
              <>
                <ChevronRight size={14} className="text-white/40" />
                <span className="text-white font-bold px-2.5 py-0.5 bg-red-600/20 text-red-400 rounded-lg border border-red-500/30">
                  {activeFolder.name}
                </span>
              </>
            )}
          </div>
          <span className="text-xs text-white/40 font-mono">
            Showing {filteredAssets.length} file{filteredAssets.length !== 1 ? "s" : ""}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-red-500" size={32} />
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="text-center py-16 bg-neutral-900/40 rounded-2xl border border-white/10">
            <FileText size={48} className="text-white/20 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-white">No assets in this folder</h3>
            <p className="text-xs text-white/50 mt-1">Try selecting another folder or upload files into this folder.</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {filteredAssets.map((asset, index) => {
              const isVideo = asset.type === "video" || asset.name.endsWith(".mp4");
              return (
                <motion.div
                  key={asset.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  onClick={() => handleOpenAsset(asset)}
                  className="bg-neutral-900/80 border border-white/10 rounded-2xl overflow-hidden hover:border-red-500/50 transition-all cursor-pointer group flex flex-col justify-between"
                >
                  {/* Thumbnail / Media Box */}
                  <div className="relative aspect-video bg-neutral-950 overflow-hidden flex items-center justify-center">
                    <img
                      src={asset.thumbnail || asset.url}
                      alt={asset.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors" />

                    {/* Play Icon for Videos */}
                    {isVideo && (
                      <div className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white flex items-center justify-center shadow-lg group-hover:bg-red-600 group-hover:border-red-600 transition-colors">
                        <Play size={16} className="ml-0.5 fill-white" />
                      </div>
                    )}

                    {/* Duration Badge */}
                    {asset.duration && (
                      <span className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] font-mono px-2 py-0.5 rounded border border-white/10">
                        {asset.duration}
                      </span>
                    )}
                  </div>

                  {/* Details Footer */}
                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-xs font-bold text-white truncate group-hover:text-red-400 transition-colors">
                        {asset.name}
                      </h3>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenAsset(asset);
                        }}
                        className="text-white/40 hover:text-white p-0.5"
                      >
                        <MoreVertical size={14} />
                      </button>
                    </div>

                    <p className="text-[11px] text-white/50 font-medium">
                      {asset.resolution || (isVideo ? "4K Video" : "Photo")} • {asset.sizeFormatted || "2.8 GB"}
                    </p>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-white/40 truncate max-w-[140px]">
                        {asset.projectTitle || "New Collection Launch"}
                      </span>

                      {/* Status Tag */}
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                          asset.status === "Final" || asset.status === "Approved Final"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : asset.status === "Approved"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : asset.status === "Shared"
                            ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                            : "bg-purple-500/10 text-purple-400 border-purple-500/30"
                        }`}
                      >
                        {asset.status || "Final"}
                      </span>
                    </div>

                    <p className="text-[10px] text-white/30 font-mono pt-0.5">
                      {asset.formattedDate || "20 Aug 2026"}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          /* List View */
          <div className="bg-neutral-900/60 border border-white/10 rounded-2xl divide-y divide-white/5 overflow-hidden">
            {filteredAssets.map((asset) => (
              <div
                key={asset.id}
                onClick={() => handleOpenAsset(asset)}
                className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-neutral-950 border border-white/10 overflow-hidden flex items-center justify-center flex-shrink-0">
                    <img
                      src={asset.thumbnail || asset.url}
                      alt={asset.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">{asset.name}</h3>
                    <p className="text-[11px] text-white/50 mt-0.5">
                      {asset.projectTitle} • {asset.sizeFormatted}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-[10px] text-white/40 font-mono hidden sm:inline">
                    {asset.formattedDate}
                  </span>
                  <a
                    href={asset.url}
                    download
                    target="_blank"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button variant="ghost" size="sm" className="text-white/60 hover:text-white">
                      <Download size={14} className="mr-1.5" />
                      Download
                    </Button>
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Asset Detail Drawer Component */}
      <AssetDetailDrawer
        asset={selectedAsset}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />

      {/* Create Folder Modal Component */}
      <CreateFolderModal
        isOpen={isCreateFolderOpen}
        onClose={() => setIsCreateFolderOpen(false)}
        onFolderCreated={fetchAssetsAndFolders}
      />

      {/* Upload File Modal Component */}
      <UploadFileModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        projects={data?.projects || []}
        folders={folders}
        onFileUploaded={fetchAssetsAndFolders}
        defaultFolder={activeFolder?.name}
      />
    </div>
  );
}
