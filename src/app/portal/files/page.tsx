"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
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
  FileText,
  Loader2,
  ChevronRight,
  ArrowLeft,
  Trash2,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AssetDetailDrawer, AssetDetail } from "@/components/portal/asset-detail-drawer";
import { CreateFolderModal } from "@/components/portal/create-folder-modal";
import { UploadFileModal } from "@/components/portal/upload-file-modal";
import { EditAssetModal } from "@/components/portal/edit-asset-modal";
import {
  ASSET_CATEGORIES,
  DEFAULT_FOLDER_NAME,
  assetBelongsToFolder,
} from "@/lib/assets";

interface FolderItem {
  id?: string | null;
  name: string;
  slug?: string | null;
  description?: string | null;
  filesCount: number;
  updatedDate: string;
  shared?: boolean;
  color?: string | null;
  /** True for folder names that only exist as free text on legacy uploads. */
  virtual?: boolean;
}

interface ClientRef {
  id: string;
  name: string | null;
  username: string;
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
  /** Populated for ADMIN/STAFF only — a CLIENT never receives other clients. */
  clients: ClientRef[];
  clientId: string | null;
  isStaff: boolean;
}

/** Sentinel for the agency-wide view; the API treats it as "no client filter". */
const ALL_CLIENTS = "all";

/** Encode a folder for the upload modal's `defaultFolder` (row id or name). */
function folderUploadValue(folder: FolderItem | null): string | undefined {
  if (!folder) return undefined;
  return folder.id ? `id:${folder.id}` : `name:${folder.name}`;
}

type SortKey = "recently_updated" | "name" | "size";

const CATEGORY_TABS = ["All Assets", ...ASSET_CATEGORIES] as const;

export default function FilesPage() {
  const { data: session } = useSession();
  const canManage =
    session?.user?.role === "ADMIN" || session?.user?.role === "STAFF";

  const [data, setData] = useState<DAMResponse | null>(null);
  const [dbFolders, setDbFolders] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("All Assets");
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [selectedClient, setSelectedClient] = useState<string>(ALL_CLIENTS);
  const [sortKey, setSortKey] = useState<SortKey>("recently_updated");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [actionError, setActionError] = useState<string | null>(null);

  // Folders system active selection
  const [activeFolder, setActiveFolder] = useState<FolderItem | null>(null);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<FolderItem | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [dropTargetFolder, setDropTargetFolder] = useState<string | null>(null);
  const draggedAssetId = useRef<string | null>(null);

  // Files dragged in from the desktop, handed straight to the upload modal.
  const [droppedFiles, setDroppedFiles] = useState<File[] | null>(null);
  const [uploadTargetFolder, setUploadTargetFolder] = useState<FolderItem | null>(null);
  const [isFileDragActive, setIsFileDragActive] = useState(false);
  // dragenter/dragleave fire once per child element, so a depth counter is the
  // only reliable way to know when the pointer has truly left the page.
  const fileDragDepth = useRef(0);

  // Selected asset for detail drawer / editing
  const [selectedAsset, setSelectedAsset] = useState<AssetDetail | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<AssetDetail | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const fetchAssetsAndFolders = useCallback(async () => {
    // The server ignores clientId for a CLIENT session, so sending it is safe;
    // it only ever narrows the agency-side view.
    const clientQuery =
      selectedClient && selectedClient !== ALL_CLIENTS
        ? `clientId=${encodeURIComponent(selectedClient)}`
        : "";

    try {
      const [filesRes, foldersRes] = await Promise.all([
        fetch(`/api/files?global=true${clientQuery ? `&${clientQuery}` : ""}`),
        fetch(`/api/folders${clientQuery ? `?${clientQuery}` : ""}`),
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
  }, [selectedClient]);

  // Runs on mount and whenever the agency switches client.
  useEffect(() => {
    setLoading(true);
    fetchAssetsAndFolders();
  }, [fetchAssetsAndFolders]);

  // Close the card action menu on any outside click.
  useEffect(() => {
    if (!openMenuId) return;
    const close = () => setOpenMenuId(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [openMenuId]);

  const assets = useMemo(() => data?.assets || [], [data]);
  const clients = useMemo(() => data?.clients || [], [data]);
  const activeClient = clients.find((c) => c.id === selectedClient) || null;

  // /api/folders already merges real folder rows with legacy folder names, so
  // it is the single source of truth; the files payload is only a fallback for
  // the case where that request failed.
  const folders: FolderItem[] = useMemo(
    () => (dbFolders.length > 0 ? dbFolders : data?.folders || []),
    [dbFolders, data]
  );

  // Keep the selected folder in sync with refetched data (counts change after
  // an upload, a move or a rename).
  useEffect(() => {
    if (!activeFolder) return;
    const stillThere = folders.find((f) =>
      activeFolder.id ? f.id === activeFolder.id : f.name === activeFolder.name
    );
    if (!stillThere) {
      setActiveFolder(null);
    } else if (
      stillThere.filesCount !== activeFolder.filesCount ||
      stillThere.name !== activeFolder.name
    ) {
      setActiveFolder(stillThere);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folders]);

  const filteredAssets = useMemo(() => {
    const term = search.trim().toLowerCase();

    const matched = assets.filter((asset) => {
      const matchesSearch =
        !term ||
        asset.name.toLowerCase().includes(term) ||
        (asset.projectTitle && asset.projectTitle.toLowerCase().includes(term)) ||
        (asset.folder && asset.folder.toLowerCase().includes(term));

      const matchesCategory =
        categoryFilter === "All Assets" ||
        (categoryFilter === "Video" &&
          (asset.type === "video" || asset.category === "Video")) ||
        (categoryFilter === "Photography" &&
          (asset.type === "image" || asset.category === "Photography")) ||
        (categoryFilter === "Design" && asset.category === "Design") ||
        (categoryFilter === "Brand Files" && asset.category === "Brand Files") ||
        (categoryFilter === "Web & Digital" && asset.category === "Web & Digital") ||
        (categoryFilter === "Documents" &&
          (asset.type === "pdf" || asset.category === "Documents"));

      const matchesProject =
        selectedProject === "all" || asset.projectId === selectedProject;

      const matchesActiveFolder =
        !activeFolder || assetBelongsToFolder(asset, activeFolder);

      return matchesSearch && matchesCategory && matchesProject && matchesActiveFolder;
    });

    const sorted = [...matched];
    if (sortKey === "name") {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortKey === "size") {
      sorted.sort((a, b) => (b.size || 0) - (a.size || 0));
    } else {
      sorted.sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
    }
    return sorted;
  }, [assets, search, categoryFilter, selectedProject, activeFolder, sortKey]);

  const stats = data?.stats || {
    totalAssets: assets.length,
    storageUsedFormatted: "0 B",
    storageCapacityFormatted: "150 GB",
    storageUsedBytes: 0,
    storageCapacityBytes: 150 * 1024 * 1024 * 1024,
    sharedFilesCount: 0,
    addedThisMonthCount: 0,
  };

  const handleOpenAsset = (asset: AssetDetail) => {
    setSelectedAsset(asset);
    setIsDrawerOpen(true);
  };

  const handleAssetSaved = (updated: AssetDetail) => {
    // Patch the row in place for an instant redraw, then resync folder counts.
    setData((prev) =>
      prev
        ? {
            ...prev,
            assets: prev.assets.map((a) =>
              a.id === updated.id ? { ...a, ...updated } : a
            ),
          }
        : prev
    );
    setSelectedAsset((prev) =>
      prev && prev.id === updated.id ? { ...prev, ...updated } : prev
    );
    fetchAssetsAndFolders();
  };

  const handleDeleteAsset = async (asset: AssetDetail) => {
    if (!confirm(`Delete "${asset.name}"? This cannot be undone.`)) return;

    setActionError(null);
    try {
      const res = await fetch(`/api/files?id=${asset.id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to delete asset");
      }
      setIsDrawerOpen(false);
      setSelectedAsset(null);
      fetchAssetsAndFolders();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to delete asset");
    }
  };

  /** Move an asset into a folder — used by both the drag handler and the menu. */
  const moveAssetToFolder = async (assetId: string, folder: FolderItem) => {
    setActionError(null);
    try {
      const res = await fetch("/api/files", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          folder.id
            ? { id: assetId, folderId: folder.id }
            : { id: assetId, folder: folder.name }
        ),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to move asset");
      }
      fetchAssetsAndFolders();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to move asset");
    }
  };

  const handleDeleteFolder = async (e: React.MouseEvent, folder: FolderItem) => {
    e.stopPropagation();
    if (!folder.id) return;
    if (
      !confirm(
        `Delete the folder "${folder.name}"? Its ${folder.filesCount} file${
          folder.filesCount === 1 ? "" : "s"
        } will move back to ${DEFAULT_FOLDER_NAME}.`
      )
    )
      return;

    setActionError(null);
    try {
      const res = await fetch(`/api/folders?id=${folder.id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to delete folder");
      }
      if (activeFolder?.id === folder.id) setActiveFolder(null);
      fetchAssetsAndFolders();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to delete folder");
    }
  };

  const folderKey = (folder: FolderItem) => folder.id || `name:${folder.name}`;

  /** Hand a desktop drop to the upload modal, targeting a specific folder. */
  const openUploadWithFiles = (files: File[], folder: FolderItem | null) => {
    fileDragDepth.current = 0;
    setIsFileDragActive(false);
    setDropTargetFolder(null);
    if (files.length === 0) return;
    setDroppedFiles(files);
    setUploadTargetFolder(folder);
    setIsUploadModalOpen(true);
  };

  // Drop-to-upload anywhere on the page.
  //
  // Listens on window rather than the page container so a drop that lands on a
  // margin still uploads instead of the browser navigating away to the file.
  // Only reacts to drags carrying files — an asset being dragged between
  // folders has no "Files" entry in dataTransfer.types, which is what keeps the
  // two drag systems from fighting over the same events.
  useEffect(() => {
    const carriesFiles = (e: DragEvent) =>
      Array.from(e.dataTransfer?.types ?? []).includes("Files");

    const onDragEnter = (e: DragEvent) => {
      if (!carriesFiles(e)) return;
      e.preventDefault();
      fileDragDepth.current += 1;
      if (!isUploadModalOpen) setIsFileDragActive(true);
    };

    const onDragOver = (e: DragEvent) => {
      if (!carriesFiles(e)) return;
      // Required, or the browser never fires a drop event.
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    };

    const onDragLeave = (e: DragEvent) => {
      if (!carriesFiles(e)) return;
      fileDragDepth.current = Math.max(0, fileDragDepth.current - 1);
      if (fileDragDepth.current === 0) setIsFileDragActive(false);
    };

    const onDrop = (e: DragEvent) => {
      if (!carriesFiles(e)) return;
      // Always swallow the drop, even when the modal owns it, so a stray miss
      // never makes the browser open the file and lose the page.
      e.preventDefault();
      fileDragDepth.current = 0;
      setIsFileDragActive(false);
      if (isUploadModalOpen) return;
      openUploadWithFiles(Array.from(e.dataTransfer?.files ?? []), activeFolder);
    };

    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, [activeFolder, isUploadModalOpen]);

  return (
    <div className="space-y-8 pb-12">
      {/* Drop-to-upload overlay. pointer-events-none so folder cards underneath
          still receive the drop and can claim it as their upload target. */}
      {isFileDragActive && !isUploadModalOpen && (
        <div className="fixed inset-0 z-[45] pointer-events-none">
          {/* A ring rather than a scrim: the folder cards stay readable so their
              drop-target highlight is visible while dragging over them. */}
          <div className="absolute inset-2 border-2 border-dashed border-red-500/70 rounded-3xl bg-red-600/5" />
          <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-neutral-900/95 border border-red-500/40 rounded-2xl px-6 py-3 shadow-2xl flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-600/20 border border-red-500/40 text-red-500 flex items-center justify-center flex-shrink-0">
              <Upload size={18} />
            </div>
            <div className="text-start">
              <p className="text-sm font-bold text-white leading-tight">
                Drop files to upload
              </p>
              <p className="text-[11px] text-white/60 mt-0.5">
                {activeFolder ? (
                  <>
                    Into{" "}
                    <span className="text-red-400 font-semibold">{activeFolder.name}</span>
                    , or onto any folder
                  </>
                ) : (
                  "Anywhere on the page, or onto a folder to file them there"
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Asset Library
          </h1>
          <p className="text-white/60 text-sm mt-1">
            {canManage
              ? activeClient
                ? `Viewing ${activeClient.name || activeClient.username}'s assets`
                : "All client brand, production and campaign files"
              : "All your approved brand, production and campaign files"}
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
            onClick={() => {
              setEditingFolder(null);
              setIsCreateFolderOpen(true);
            }}
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

      {actionError && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-xl flex items-center justify-between gap-3">
          <span>{actionError}</span>
          <button
            onClick={() => setActionError(null)}
            className="text-red-300 hover:text-white font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

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
          {CATEGORY_TABS.map((cat) => {
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
        <div className="flex items-center gap-3 flex-wrap">
          {/* Client Filter — agency only. A CLIENT session receives an empty
              clients list, so this never renders for them. */}
          {clients.length > 0 && (
            <select
              value={selectedClient}
              onChange={(e) => {
                setSelectedClient(e.target.value);
                // Projects and folders belong to the previous client.
                setSelectedProject("all");
                setActiveFolder(null);
              }}
              aria-label="Filter by Client"
              className="bg-neutral-900 border border-red-500/30 text-white text-xs rounded-xl px-3 py-2 outline-none focus:border-red-500 cursor-pointer"
            >
              <option value={ALL_CLIENTS}>All Clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name || c.username}
                </option>
              ))}
            </select>
          )}

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
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
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
              aria-label="Grid view"
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === "grid" ? "bg-red-600 text-white" : "text-white/40 hover:text-white"
              }`}
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              aria-label="List view"
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
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Folders</h2>
            <p className="text-[11px] text-white/40 mt-0.5">
              Click a folder to filter the library — drag an asset onto one to move it.
            </p>
          </div>
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

        {folders.length === 0 ? (
          <div className="text-center py-10 bg-neutral-900/40 rounded-2xl border border-white/10">
            <FolderIcon size={36} className="text-white/20 mx-auto mb-2" />
            <p className="text-xs text-white/50">
              No folders yet — create one to start organising your assets.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {folders.map((folder, index) => {
              const key = folderKey(folder);
              const isSelected = activeFolder
                ? folderKey(activeFolder) === key
                : false;
              const isDropTarget = dropTargetFolder === key;

              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index, 12) * 0.04 }}
                  onClick={() => setActiveFolder(isSelected ? null : folder)}
                  onDragOver={(e) => {
                    // Files from the desktop, or an asset being moved.
                    const carriesFiles = Array.from(e.dataTransfer.types).includes(
                      "Files"
                    );
                    if (!carriesFiles && !draggedAssetId.current) return;
                    e.preventDefault();
                    setDropTargetFolder(key);
                  }}
                  onDragLeave={() => setDropTargetFolder((c) => (c === key ? null : c))}
                  onDrop={(e) => {
                    e.preventDefault();

                    // Dropping files onto a folder uploads into that folder,
                    // rather than the one currently being browsed. stopPropagation
                    // keeps the window-level handler from also claiming the drop.
                    if (Array.from(e.dataTransfer.types).includes("Files")) {
                      e.stopPropagation();
                      openUploadWithFiles(Array.from(e.dataTransfer.files), folder);
                      return;
                    }

                    const assetId =
                      e.dataTransfer.getData("text/asset-id") || draggedAssetId.current;
                    setDropTargetFolder(null);
                    draggedAssetId.current = null;
                    if (assetId) moveAssetToFolder(assetId, folder);
                  }}
                  className={`bg-neutral-900/60 border rounded-2xl p-4 transition-all cursor-pointer group flex flex-col justify-between ${
                    isDropTarget
                      ? "border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-600/20"
                      : isSelected
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
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingFolder(folder);
                                setIsCreateFolderOpen(true);
                              }}
                              title="Rename folder"
                              className="opacity-0 group-hover:opacity-100 p-1 text-white/40 hover:text-white transition-opacity"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={(e) => handleDeleteFolder(e, folder)}
                              title="Delete folder"
                              className="opacity-0 group-hover:opacity-100 p-1 text-white/40 hover:text-red-400 transition-opacity"
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <h3 className="text-sm font-bold text-white truncate group-hover:text-red-400 transition-colors">
                      {folder.name}
                    </h3>
                    <p className="text-[11px] text-white/50 font-medium mt-1">
                      {folder.filesCount} file{folder.filesCount === 1 ? "" : "s"}
                    </p>
                  </div>
                  <p className="text-[10px] text-white/40 mt-3 font-mono">
                    {folder.updatedDate}
                  </p>
                </motion.div>
              );
            })}
          </div>
        )}
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
            <h3 className="text-base font-semibold text-white">
              {activeFolder ? "No assets in this folder" : "No assets match these filters"}
            </h3>
            <p className="text-xs text-white/50 mt-1">
              Try another folder or category, or upload files into this folder.
            </p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {filteredAssets.map((asset, index) => {
              const isVideo = asset.type === "video" || asset.name.endsWith(".mp4");
              return (
                // The native drag handlers live on a plain wrapper: motion
                // components claim onDragStart/onDragEnd for their own gesture
                // system and never forward them to the DOM.
                <div
                  key={asset.id}
                  draggable
                  onDragStart={(e) => {
                    draggedAssetId.current = asset.id;
                    e.dataTransfer.setData("text/asset-id", asset.id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragEnd={() => {
                    draggedAssetId.current = null;
                    setDropTargetFolder(null);
                  }}
                  className="h-full"
                >
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index, 12) * 0.04 }}
                    onClick={() => handleOpenAsset(asset)}
                    className="h-full bg-neutral-900/80 border border-white/10 rounded-2xl overflow-hidden hover:border-red-500/50 transition-all cursor-pointer group flex flex-col justify-between"
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

                      {/* Folder Badge */}
                      <span className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm text-white/80 text-[10px] font-semibold px-2 py-0.5 rounded border border-white/10 flex items-center gap-1 max-w-[70%] truncate">
                        <FolderIcon size={10} />
                        {asset.folder || DEFAULT_FOLDER_NAME}
                      </span>

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

                        {/* Card Action Menu */}
                        <div className="relative flex-shrink-0">
                          <button
                            aria-label="Asset actions"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(openMenuId === asset.id ? null : asset.id);
                            }}
                            className="text-white/40 hover:text-white p-0.5"
                          >
                            <MoreVertical size={14} />
                          </button>

                          {openMenuId === asset.id && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="absolute right-0 top-6 z-20 w-40 bg-neutral-950 border border-white/10 rounded-xl shadow-2xl overflow-hidden py-1"
                            >
                              <button
                                onClick={() => {
                                  setOpenMenuId(null);
                                  setEditingAsset(asset);
                                }}
                                className="w-full text-left px-3 py-2 text-xs text-white/80 hover:bg-white/5 hover:text-white flex items-center gap-2"
                              >
                                <Pencil size={13} />
                                Edit details
                              </button>
                              <a
                                href={asset.url}
                                download
                                target="_blank"
                                onClick={() => setOpenMenuId(null)}
                                className="w-full text-left px-3 py-2 text-xs text-white/80 hover:bg-white/5 hover:text-white flex items-center gap-2"
                              >
                                <Download size={13} />
                                Download
                              </a>
                              {canManage && (
                                <button
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    handleDeleteAsset(asset);
                                  }}
                                  className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                                >
                                  <Trash2 size={13} />
                                  Delete
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <p className="text-[11px] text-white/50 font-medium">
                        {asset.resolution || (isVideo ? "4K Video" : "Photo")} •{" "}
                        {asset.sizeFormatted || "—"}
                      </p>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-white/40 truncate max-w-[140px]">
                          {asset.projectTitle}
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
                        {asset.formattedDate}
                      </p>
                    </div>
                  </motion.div>
                </div>
              );
            })}
          </div>
        ) : (
          /* List View */
          <div className="bg-neutral-900/60 border border-white/10 rounded-2xl divide-y divide-white/5 overflow-hidden">
            {filteredAssets.map((asset) => (
              <div
                key={asset.id}
                draggable
                onDragStart={(e) => {
                  draggedAssetId.current = asset.id;
                  e.dataTransfer.setData("text/asset-id", asset.id);
                }}
                onDragEnd={() => {
                  draggedAssetId.current = null;
                  setDropTargetFolder(null);
                }}
                onClick={() => handleOpenAsset(asset)}
                className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer gap-4"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-neutral-950 border border-white/10 overflow-hidden flex items-center justify-center flex-shrink-0">
                    <img
                      src={asset.thumbnail || asset.url}
                      alt={asset.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold text-white truncate">{asset.name}</h3>
                    <p className="text-[11px] text-white/50 mt-0.5 truncate">
                      {asset.projectTitle} • {asset.folder || DEFAULT_FOLDER_NAME} •{" "}
                      {asset.sizeFormatted}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[10px] text-white/40 font-mono hidden sm:inline">
                    {asset.formattedDate}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingAsset(asset);
                    }}
                    className="text-white/60 hover:text-white"
                  >
                    <Pencil size={14} />
                  </Button>
                  <a
                    href={asset.url}
                    download
                    target="_blank"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button variant="ghost" size="sm" className="text-white/60 hover:text-white">
                      <Download size={14} />
                    </Button>
                  </a>
                  {canManage && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteAsset(asset);
                      }}
                      className="text-white/40 hover:text-red-400"
                    >
                      <Trash2 size={14} />
                    </Button>
                  )}
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
        onEdit={(asset) => {
          setIsDrawerOpen(false);
          setEditingAsset(asset);
        }}
        onDelete={canManage ? handleDeleteAsset : undefined}
      />

      {/* Edit Asset Modal */}
      <EditAssetModal
        asset={editingAsset}
        isOpen={Boolean(editingAsset)}
        onClose={() => setEditingAsset(null)}
        folders={folders}
        canManage={canManage}
        onSaved={handleAssetSaved}
      />

      {/* Create / Edit Folder Modal Component */}
      <CreateFolderModal
        isOpen={isCreateFolderOpen}
        folder={editingFolder}
        clientId={selectedClient !== ALL_CLIENTS ? selectedClient : undefined}
        onClose={() => {
          setIsCreateFolderOpen(false);
          setEditingFolder(null);
        }}
        onFolderCreated={fetchAssetsAndFolders}
      />

      {/* Upload File Modal Component — mounted only while open so each batch
          starts from a clean queue. */}
      {isUploadModalOpen && (
        <UploadFileModal
          isOpen
          onClose={() => {
            setIsUploadModalOpen(false);
            setDroppedFiles(null);
            setUploadTargetFolder(null);
          }}
          projects={data?.projects || []}
          folders={folders}
          onFileUploaded={fetchAssetsAndFolders}
          initialFiles={droppedFiles ?? undefined}
          defaultFolder={folderUploadValue(uploadTargetFolder ?? activeFolder)}
        />
      )}
    </div>
  );
}
