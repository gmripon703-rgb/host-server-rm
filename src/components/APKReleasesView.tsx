import React, { useState } from 'react';
import {
  Package,
  Plus,
  Download,
  Trash2,
  Edit2,
  Calendar,
  CheckCircle,
  Smartphone,
  Copy,
  ExternalLink,
  AlertCircle,
  X,
  FileCheck,
} from 'lucide-react';
import { APKReleaseRecord } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface APKReleasesViewProps {
  releases: APKReleaseRecord[];
  onRefresh: () => void;
}

export const APKReleasesView: React.FC<APKReleasesViewProps> = ({ releases, onRefresh }) => {
  const { isAdmin } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);
  const [copiedSha, setCopiedSha] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [version, setVersion] = useState('1.3.0');
  const [versionCode, setVersionCode] = useState(130);
  const [releaseDate, setReleaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [fileSize, setFileSize] = useState<number>(49500000);
  const [sha256, setSha256] = useState('');
  const [releaseNotes, setReleaseNotes] = useState('• Added model quantization options\n• UI performance improvements');
  const [minAndroidVersion, setMinAndroidVersion] = useState('Android 10 (API 29)');
  const [targetAndroidVersion, setTargetAndroidVersion] = useState('Android 14 (API 34)');
  const [isLatest, setIsLatest] = useState(true);

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!version.trim() || !versionCode) return;

    try {
      await api.apk.create({
        version: version.trim(),
        versionCode: Number(versionCode),
        releaseDate,
        fileSize: Number(fileSize),
        sha256: sha256.trim() || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        releaseNotes: releaseNotes.trim(),
        minAndroidVersion: minAndroidVersion.trim(),
        targetAndroidVersion: targetAndroidVersion.trim(),
        isLatest,
      });

      setShowAddModal(false);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to publish APK release.');
    }
  };

  const handleDelete = async (id: string, ver: string) => {
    if (!window.confirm(`Delete APK release v${ver}?`)) return;
    try {
      await api.apk.delete(id);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to delete release.');
    }
  };

  const copySha = (sha: string, id: string) => {
    navigator.clipboard.writeText(sha);
    setCopiedSha(id);
    setTimeout(() => setCopiedSha(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="rounded bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-400">
                Application Releases
              </span>
              <span className="text-xs text-slate-400">Android OTA Distribution</span>
            </div>
            <h2 className="text-lg font-bold text-white sm:text-xl">
              APK Version Manager & Mobile Update Channel
            </h2>
            <p className="max-w-2xl text-xs text-slate-400">
              Publish and catalog APK builds for your private Android app. The mobile client checks <code className="text-indigo-400 font-mono">GET /api/apk/latest</code> to detect new versions and initiate automated in-app downloads.
            </p>
          </div>

          {isAdmin && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-indigo-500 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Publish APK Release</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 rounded-lg border border-red-500/30 bg-red-950/30 p-3.5 text-xs text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
          <div className="flex-1">{error}</div>
        </div>
      )}

      {/* APK Releases List */}
      <div className="space-y-4">
        {releases.map(rel => (
          <div
            key={rel.id}
            className={`rounded-xl border p-5 transition ${
              rel.isLatest
                ? 'border-indigo-500/50 bg-slate-900/90 shadow-md ring-1 ring-indigo-500/20'
                : 'border-slate-800 bg-slate-900/60'
            }`}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3.5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">v{rel.version}</h3>
                    <span className="rounded bg-slate-800 px-2 py-0.5 text-xs font-mono font-semibold text-slate-300">
                      Code {rel.versionCode}
                    </span>
                    {rel.isLatest && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                        <CheckCircle className="h-3 w-3" />
                        LATEST RELEASE
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-slate-500" />
                      Released {rel.releaseDate}
                    </span>
                    <span>Size: {formatBytes(rel.fileSize)}</span>
                    <span>Min OS: {rel.minAndroidVersion}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={rel.downloadUrl}
                  download={`nexus-ai-v${rel.version}.apk`}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download APK</span>
                </a>

                {isAdmin && (
                  <button
                    onClick={() => handleDelete(rel.id, rel.version)}
                    className="rounded p-1.5 text-slate-500 hover:bg-red-950/40 hover:text-red-400 transition-colors"
                    title="Delete Release"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Release Notes */}
            <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/60 p-3.5 text-xs">
              <span className="font-semibold text-slate-300 block mb-1">Release Notes:</span>
              <p className="whitespace-pre-line text-slate-400 leading-relaxed font-sans">
                {rel.releaseNotes}
              </p>
            </div>

            {/* SHA-256 Checksum */}
            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <FileCheck className="h-3.5 w-3.5 text-slate-500" />
                APK SHA-256 Checksum:
              </span>
              <button
                onClick={() => copySha(rel.sha256, rel.id)}
                className="font-mono text-[10px] text-indigo-400 hover:underline"
              >
                {copiedSha === rel.id ? '✓ Copied to clipboard' : rel.sha256}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Publish APK Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="my-8 w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">Publish New APK Build</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Version String</label>
                  <input
                    type="text"
                    required
                    value={version}
                    onChange={e => setVersion(e.target.value)}
                    placeholder="1.3.0"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Version Code</label>
                  <input
                    type="number"
                    required
                    value={versionCode}
                    onChange={e => setVersionCode(Number(e.target.value))}
                    placeholder="130"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Release Date</label>
                  <input
                    type="date"
                    required
                    value={releaseDate}
                    onChange={e => setReleaseDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">File Size (Bytes)</label>
                  <input
                    type="number"
                    value={fileSize}
                    onChange={e => setFileSize(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">SHA-256 Checksum</label>
                <input
                  type="text"
                  value={sha256}
                  onChange={e => setSha256(e.target.value)}
                  placeholder="64-character SHA-256 hash"
                  className="w-full font-mono text-[11px] rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Min Android OS</label>
                  <input
                    type="text"
                    value={minAndroidVersion}
                    onChange={e => setMinAndroidVersion(e.target.value)}
                    placeholder="Android 10 (API 29)"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Target Android OS</label>
                  <input
                    type="text"
                    value={targetAndroidVersion}
                    onChange={e => setTargetAndroidVersion(e.target.value)}
                    placeholder="Android 14 (API 34)"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Release Notes</label>
                <textarea
                  rows={3}
                  value={releaseNotes}
                  onChange={e => setReleaseNotes(e.target.value)}
                  placeholder="• Fixed audio recording&#10;• Added Gemma model loading"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="latestCheckbox"
                  checked={isLatest}
                  onChange={e => setIsLatest(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="latestCheckbox" className="font-semibold text-slate-300">
                  Mark as primary/latest APK release for OTA updater
                </label>
              </div>

              <div className="mt-5 flex justify-end gap-2 border-t border-slate-800 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500"
                >
                  Publish Build
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
