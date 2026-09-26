import React, { useState, useEffect, useRef } from 'react';
import {
  Folder,
  FolderPlus,
  File,
  FileText,
  FileCode,
  FileArchive,
  Image,
  Cpu,
  Package,
  Upload,
  Download,
  Trash2,
  Edit2,
  Search,
  RefreshCw,
  Eye,
  Lock,
  Globe,
  Users,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  X,
  Share2,
  HardDrive,
  Copy,
} from 'lucide-react';
import { StorageItem, FileVisibility } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface FileManagerViewProps {
  initialFolderId?: string;
  onRefreshStorage?: () => void;
}

export const FileManagerView: React.FC<FileManagerViewProps> = ({
  initialFolderId = 'root',
  onRefreshStorage,
}) => {
  const { isAdmin } = useAuth();
  const [folderHistory, setFolderHistory] = useState<{ id: string; name: string }[]>([
    { id: 'root', name: 'Root / AI-HOST' },
  ]);
  const currentFolder = folderHistory[folderHistory.length - 1];

  const [items, setItems] = useState<StorageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'name' | 'modifiedAt' | 'sizeBytes'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [error, setError] = useState<string | null>(null);

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadVisibility, setUploadVisibility] = useState<FileVisibility>('PRIVATE');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Create folder modal
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Rename modal
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renamingItem, setRenamingItem] = useState<StorageItem | null>(null);
  const [newName, setNewName] = useState('');

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingItem, setDeletingItem] = useState<StorageItem | null>(null);

  // Preview modal
  const [previewItem, setPreviewItem] = useState<StorageItem | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const fetchFiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.files.list({
        folderId: currentFolder.id,
        search: search ? search : undefined,
        sortBy,
        sortOrder,
      });
      setItems(res.items);
    } catch (err: any) {
      setError(err.message || 'Failed to load files from storage provider.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [currentFolder.id, sortBy, sortOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchFiles();
  };

  const handleOpenFolder = (folder: StorageItem) => {
    setFolderHistory(prev => [...prev, { id: folder.id, name: folder.name }]);
  };

  const handleNavigateBreadcrumb = (index: number) => {
    setFolderHistory(prev => prev.slice(0, index + 1));
  };

  const handleUploadSubmit = async () => {
    if (!selectedUploadFile) return;

    setIsUploading(true);
    setUploadProgress(20);
    setError(null);

    try {
      setUploadProgress(60);
      await api.files.upload(selectedUploadFile, currentFolder.id, uploadVisibility);
      setUploadProgress(100);
      setSelectedUploadFile(null);
      setShowUploadModal(false);
      fetchFiles();
      onRefreshStorage?.();
    } catch (err: any) {
      setError(err.message || 'Upload failed. Please retry.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    try {
      await api.files.createFolder(newFolderName.trim(), currentFolder.id);
      setNewFolderName('');
      setShowFolderModal(false);
      fetchFiles();
    } catch (err: any) {
      setError(err.message || 'Failed to create folder.');
    }
  };

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renamingItem || !newName.trim()) return;

    try {
      await api.files.rename(renamingItem.id, newName.trim());
      setShowRenameModal(false);
      setRenamingItem(null);
      fetchFiles();
    } catch (err: any) {
      setError(err.message || 'Failed to rename item.');
    }
  };

  const handleDeleteSubmit = async () => {
    if (!deletingItem) return;

    try {
      await api.files.delete(deletingItem.id);
      setShowDeleteModal(false);
      setDeletingItem(null);
      fetchFiles();
      onRefreshStorage?.();
    } catch (err: any) {
      setError(err.message || 'Failed to delete item.');
    }
  };

  const copyDirectDownload = (file: StorageItem) => {
    const url = `${window.location.origin}${api.files.getDownloadUrl(file.id)}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const getFileIcon = (item: StorageItem) => {
    if (item.isFolder) {
      return <Folder className="h-5 w-5 text-amber-400 fill-amber-400/20" />;
    }
    const name = item.name.toLowerCase();
    if (name.endsWith('.gguf') || name.endsWith('.safetensors') || name.endsWith('.onnx')) {
      return <Cpu className="h-5 w-5 text-purple-400" />;
    }
    if (name.endsWith('.apk')) {
      return <Package className="h-5 w-5 text-emerald-400" />;
    }
    if (name.endsWith('.zip') || name.endsWith('.tar.gz') || name.endsWith('.7z')) {
      return <FileArchive className="h-5 w-5 text-yellow-400" />;
    }
    if (name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.webp')) {
      return <Image className="h-5 w-5 text-sky-400" />;
    }
    if (name.endsWith('.json') || name.endsWith('.ts') || name.endsWith('.py') || name.endsWith('.js')) {
      return <FileCode className="h-5 w-5 text-indigo-400" />;
    }
    return <FileText className="h-5 w-5 text-slate-400" />;
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Filter items by type tab
  const filteredItems = items.filter(item => {
    if (selectedType === 'ALL') return true;
    if (selectedType === 'FOLDERS') return item.isFolder;
    if (item.isFolder) return false;
    const name = item.name.toLowerCase();
    if (selectedType === 'MODELS') return name.endsWith('.gguf') || name.endsWith('.onnx') || name.endsWith('.safetensors');
    if (selectedType === 'APK') return name.endsWith('.apk');
    if (selectedType === 'DATASETS') return name.endsWith('.jsonl') || name.endsWith('.csv') || name.endsWith('.txt');
    if (selectedType === 'DOCS') return name.endsWith('.pdf') || name.endsWith('.md') || name.endsWith('.docx');
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Top action & toolbar bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-1.5 overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-xs">
          <HardDrive className="h-3.5 w-3.5 text-indigo-400 shrink-0 mr-1" />
          {folderHistory.map((f, i) => (
            <React.Fragment key={f.id}>
              {i > 0 && <ChevronRight className="h-3 w-3 text-slate-600 shrink-0" />}
              <button
                onClick={() => handleNavigateBreadcrumb(i)}
                className={`truncate max-w-[140px] font-medium transition-colors ${
                  i === folderHistory.length - 1
                    ? 'text-indigo-400 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {f.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFolderModal(true)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
          >
            <FolderPlus className="h-3.5 w-3.5 text-amber-400" />
            <span>New Folder</span>
          </button>

          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Upload File</span>
          </button>

          <button
            onClick={fetchFiles}
            disabled={loading}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-white transition-colors"
            title="Refresh folder"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {[
            { id: 'ALL', label: 'All Files' },
            { id: 'FOLDERS', label: 'Folders' },
            { id: 'MODELS', label: 'AI Models' },
            { id: 'APK', label: 'APK Builds' },
            { id: 'DATASETS', label: 'Datasets/Text' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedType(tab.id)}
              className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
                selectedType === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'border border-slate-800 bg-slate-900/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search files by name..."
            className="w-full rounded-lg border border-slate-800 bg-slate-900/80 py-1.5 pl-8 pr-3 text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
          />
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
        </form>
      </div>

      {/* Error alert if any */}
      {error && (
        <div className="flex items-start gap-2.5 rounded-lg border border-red-500/30 bg-red-950/30 p-3.5 text-xs text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">Storage error: </span>
            {error}
          </div>
          <button
            onClick={() => fetchFiles()}
            className="underline font-semibold hover:text-white"
          >
            Retry
          </button>
        </div>
      )}

      {/* Files Table / List */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Size</th>
                <th className="py-3 px-4">Visibility</th>
                <th className="py-3 px-4">Modified</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <div className="inline-flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin text-indigo-400" />
                      <span>Reading files from storage driver...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <Folder className="mx-auto h-8 w-8 text-slate-600 mb-2" />
                    <p className="font-medium text-slate-400">This folder is empty</p>
                    <p className="text-[11px] text-slate-500 mt-1">Upload a file or create a subfolder to get started.</p>
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => (
                  <tr
                    key={item.id}
                    className="group hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="shrink-0">{getFileIcon(item)}</div>
                        <div className="min-w-0">
                          {item.isFolder ? (
                            <button
                              onClick={() => handleOpenFolder(item)}
                              className="font-semibold text-slate-200 hover:text-indigo-400 text-left truncate block max-w-xs sm:max-w-md transition-colors"
                            >
                              {item.name}
                            </button>
                          ) : (
                            <span className="font-medium text-slate-200 truncate block max-w-xs sm:max-w-md">
                              {item.name}
                            </span>
                          )}
                          <span className="block text-[10px] text-slate-500 font-mono">
                            {item.storageProvider}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                      {item.isFolder ? '—' : formatBytes(item.sizeBytes)}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${
                          item.visibility === 'PUBLIC'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : item.visibility === 'AUTHENTICATED'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {item.visibility === 'PUBLIC' ? (
                          <Globe className="h-2.5 w-2.5" />
                        ) : item.visibility === 'AUTHENTICATED' ? (
                          <Users className="h-2.5 w-2.5" />
                        ) : (
                          <Lock className="h-2.5 w-2.5" />
                        )}
                        {item.visibility}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                      {new Date(item.modifiedAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5 opacity-90 group-hover:opacity-100">
                        {!item.isFolder && (
                          <>
                            <a
                              href={api.files.getDownloadUrl(item.id)}
                              download={item.name}
                              className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-indigo-400 transition-colors"
                              title="Download File"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </a>

                            <button
                              onClick={() => copyDirectDownload(item)}
                              className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-emerald-400 transition-colors"
                              title="Copy Secure Download URL"
                            >
                              <Share2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}

                        <button
                          onClick={() => {
                            setRenamingItem(item);
                            setNewName(item.name);
                            setShowRenameModal(true);
                          }}
                          className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
                          title="Rename"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>

                        <button
                          onClick={() => {
                            setDeletingItem(item);
                            setShowDeleteModal(true);
                          }}
                          className="rounded p-1.5 text-slate-400 hover:bg-red-950/40 hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {copiedLink && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xl">
          <CheckCircle className="h-4 w-4" />
          <span>Secure direct download link copied to clipboard!</span>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">Upload File to Storage</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* Drag & Drop Area */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-700 bg-slate-950/50 p-6 text-center cursor-pointer hover:border-indigo-500 transition-colors"
              >
                <Upload className="h-8 w-8 text-indigo-400 mb-2" />
                <p className="text-xs font-semibold text-slate-200">
                  {selectedUploadFile ? selectedUploadFile.name : 'Click to select or drag and drop a file'}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Supports GGUF, SafeTensors, APK, Datasets, ZIP, and Docs (up to 500 MB)
                </p>
                {selectedUploadFile && (
                  <span className="mt-2 rounded bg-indigo-500/20 px-2 py-0.5 text-[11px] font-medium text-indigo-300">
                    {formatBytes(selectedUploadFile.size)}
                  </span>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={e => {
                    if (e.target.files && e.target.files[0]) {
                      setSelectedUploadFile(e.target.files[0]);
                    }
                  }}
                />
              </div>

              {/* Visibility Selector (Requirement 14) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300">
                  Storage Access Policy
                </label>
                <p className="text-[11px] text-slate-500 mb-1.5">
                  Default is PRIVATE (authenticated token required to download).
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {(['PRIVATE', 'AUTHENTICATED', 'PUBLIC'] as FileVisibility[]).map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setUploadVisibility(v)}
                      className={`flex flex-col items-center gap-1 rounded-lg border p-2.5 text-xs font-medium transition-colors ${
                        uploadVisibility === v
                          ? 'border-indigo-500 bg-indigo-950/40 text-indigo-300'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      {v === 'PRIVATE' && <Lock className="h-3.5 w-3.5 text-amber-400" />}
                      {v === 'AUTHENTICATED' && <Users className="h-3.5 w-3.5 text-blue-400" />}
                      {v === 'PUBLIC' && <Globe className="h-3.5 w-3.5 text-emerald-400" />}
                      <span>{v}</span>
                    </button>
                  ))}
                </div>
              </div>

              {isUploading && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Streaming to active storage provider...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full bg-indigo-500 transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-slate-800 pt-3">
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUploadSubmit}
                disabled={!selectedUploadFile || isUploading}
                className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
              >
                {isUploading ? 'Uploading...' : 'Confirm Upload'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Folder Modal */}
      {showFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-3">Create New Folder</h3>
            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Folder Name
                </label>
                <input
                  type="text"
                  required
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  placeholder="e.g. mobile-weights-v2"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFolderModal(false)}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {showRenameModal && renamingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-3">Rename Item</h3>
            <form onSubmit={handleRenameSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  New Name
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRenameModal(false)}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-sm font-bold text-red-400 mb-2">Confirm Delete</h3>
            <p className="text-xs text-slate-300">
              Are you sure you want to permanently delete <strong className="text-white">{deletingItem.name}</strong> from {deletingItem.storageProvider}?
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              This action cannot be undone.
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteSubmit}
                className="rounded-lg bg-red-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-red-500"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
