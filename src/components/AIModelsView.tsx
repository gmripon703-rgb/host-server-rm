import React, { useState } from 'react';
import {
  Cpu,
  Plus,
  Download,
  Trash2,
  Edit2,
  ExternalLink,
  Shield,
  FileCode,
  HardDrive,
  Copy,
  CheckCircle,
  AlertCircle,
  X,
  Smartphone,
  Layers,
} from 'lucide-react';
import { AIModelRecord } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface AIModelsViewProps {
  models: AIModelRecord[];
  onRefresh: () => void;
}

export const AIModelsView: React.FC<AIModelsViewProps> = ({ models, onRefresh }) => {
  const { isAdmin } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showManifestModal, setShowManifestModal] = useState(false);
  const [copiedManifest, setCopiedManifest] = useState(false);
  const [copiedSha, setCopiedSha] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [modelId, setModelId] = useState('');
  const [name, setName] = useState('');
  const [version, setVersion] = useState('1.0.0');
  const [format, setFormat] = useState<'GGUF' | 'SafeTensors' | 'ONNX'>('GGUF');
  const [quantization, setQuantization] = useState('Q4_K_M');
  const [sizeBytes, setSizeBytes] = useState<number>(1650000000);
  const [minRamGB, setMinRamGB] = useState<number>(3);
  const [recommendedRamGB, setRecommendedRamGB] = useState<number>(4);
  const [sha256, setSha256] = useState('');
  const [license, setLicense] = useState('Apache 2.0');
  const [source, setSource] = useState('huggingface/repo');
  const [storageProvider, setStorageProvider] = useState('google-drive');
  const [status, setStatus] = useState<'ACTIVE' | 'ARCHIVED' | 'TESTING'>('ACTIVE');
  const [description, setDescription] = useState('');

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modelId.trim() || !name.trim()) return;

    try {
      await api.models.create({
        id: modelId.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-'),
        name: name.trim(),
        version: version.trim(),
        format,
        quantization: quantization.trim(),
        sizeBytes: Number(sizeBytes),
        minRamGB: Number(minRamGB),
        recommendedRamGB: Number(recommendedRamGB),
        sha256: sha256.trim() || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        license: license.trim(),
        source: source.trim(),
        storageProvider,
        status,
        description: description.trim(),
        tags: ['android-edge', format.toLowerCase()],
      });

      setShowAddModal(false);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to register model.');
    }
  };

  const handleDelete = async (id: string, modelName: string) => {
    if (!window.confirm(`Delete model ${modelName}?`)) return;
    try {
      await api.models.delete(id);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to delete model.');
    }
  };

  const copyToClipboard = (text: string, type: 'manifest' | 'sha', id?: string) => {
    navigator.clipboard.writeText(text);
    if (type === 'manifest') {
      setCopiedManifest(true);
      setTimeout(() => setCopiedManifest(false), 2000);
    } else if (id) {
      setCopiedSha(id);
      setTimeout(() => setCopiedSha(null), 2000);
    }
  };

  const androidManifestJson = JSON.stringify(
    {
      manifestVersion: '1.0',
      timestamp: new Date().toISOString(),
      models: models.filter(m => m.status === 'ACTIVE'),
    },
    null,
    2
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="rounded bg-purple-500/10 px-2 py-0.5 text-xs font-semibold text-purple-400">
                On-Device AI Registry
              </span>
              <span className="text-xs text-slate-400">Android Edge API</span>
            </div>
            <h2 className="text-lg font-bold text-white sm:text-xl">
              AI Models & Mobile Weights Manager
            </h2>
            <p className="max-w-2xl text-xs text-slate-400">
              Manage LLM weights (GGUF, SafeTensors, ONNX) served to your Android AI client. The mobile app queries <code className="text-indigo-400">GET /api/models</code> and downloads weights securely without knowing storage secrets.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowManifestModal(true)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
            >
              <Smartphone className="h-4 w-4 text-purple-400" />
              <span>Android Manifest (models.json)</span>
            </button>

            {isAdmin && (
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-indigo-500 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Register Model</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 rounded-lg border border-red-500/30 bg-red-950/30 p-3.5 text-xs text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
          <div className="flex-1">{error}</div>
        </div>
      )}

      {/* Model Cards Grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {models.map(m => (
          <div
            key={m.id}
            className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-slate-700 hover:bg-slate-900/80 shadow-sm"
          >
            <div>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <Cpu className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{m.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-[11px] text-slate-400">v{m.version}</span>
                      <span className="rounded bg-slate-800 px-1.5 py-0.2 text-[10px] font-semibold text-purple-300">
                        {m.format}
                      </span>
                      <span className="rounded bg-slate-800 px-1.5 py-0.2 text-[10px] font-mono text-emerald-300">
                        {m.quantization}
                      </span>
                    </div>
                  </div>
                </div>

                <span
                  className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                    m.status === 'ACTIVE'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {m.status}
                </span>
              </div>

              {m.description && (
                <p className="mt-3 text-xs leading-relaxed text-slate-300">{m.description}</p>
              )}

              {/* Specs Grid */}
              <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg border border-slate-800 bg-slate-950/70 p-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">File Size</span>
                  <div className="font-bold text-slate-200 mt-0.5">{formatBytes(m.sizeBytes)}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Min RAM</span>
                  <div className="font-bold text-slate-200 mt-0.5">{m.minRamGB} GB</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Rec. RAM</span>
                  <div className="font-bold text-slate-200 mt-0.5">{m.recommendedRamGB} GB</div>
                </div>
              </div>

              {/* SHA-256 and Storage Details */}
              <div className="mt-3 space-y-1 text-[11px]">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Storage Driver:</span>
                  <span className="font-mono text-slate-300">{m.storageProvider}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>License:</span>
                  <span className="text-slate-300">{m.license}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>SHA-256:</span>
                  <button
                    onClick={() => copyToClipboard(m.sha256, 'sha', m.id)}
                    className="font-mono text-[10px] text-indigo-400 hover:underline truncate max-w-[180px]"
                    title="Click to copy SHA-256 checksum"
                  >
                    {copiedSha === m.id ? '✓ Copied' : `${m.sha256.slice(0, 10)}...${m.sha256.slice(-8)}`}
                  </button>
                </div>
              </div>
            </div>

            {/* Footer Action buttons */}
            <div className="mt-5 flex items-center justify-between border-t border-slate-800 pt-3">
              <a
                href={m.downloadUrl}
                download
                className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
              >
                <Download className="h-3.5 w-3.5 text-indigo-400" />
                <span>Test Download</span>
              </a>

              {isAdmin && (
                <button
                  onClick={() => handleDelete(m.id, m.name)}
                  className="rounded p-1.5 text-slate-500 hover:bg-red-950/40 hover:text-red-400 transition-colors"
                  title="Delete Model Record"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Android Manifest Modal (Requirement 10 & 23) */}
      {showManifestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-purple-400" />
                <h3 className="text-sm font-bold text-white">Android AI Manifest (models.json)</h3>
              </div>
              <button
                onClick={() => setShowManifestModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-3 text-xs text-slate-400">
              Your Android client application can poll <code className="text-indigo-400 font-mono">GET /api/models</code> or <code className="text-indigo-400 font-mono">GET /api/android/manifest</code> to fetch this exact payload:
            </p>

            <div className="relative mt-3">
              <pre className="max-h-80 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-emerald-400">
                {androidManifestJson}
              </pre>

              <button
                onClick={() => copyToClipboard(androidManifestJson, 'manifest')}
                className="absolute right-3 top-3 flex items-center gap-1 rounded bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-700 shadow"
              >
                {copiedManifest ? (
                  <>
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy JSON</span>
                  </>
                )}
              </button>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowManifestModal(false)}
                className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Model Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="my-8 w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">Register New AI Model Asset</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Model Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => {
                      setName(e.target.value);
                      if (!modelId) {
                        setModelId(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'));
                      }
                    }}
                    placeholder="e.g. Gemma 2 2B Instruct"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Model ID (Slug)</label>
                  <input
                    type="text"
                    required
                    value={modelId}
                    onChange={e => setModelId(e.target.value)}
                    placeholder="gemma-2-2b-it-q4"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Format</label>
                  <select
                    value={format}
                    onChange={e => setFormat(e.target.value as any)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="GGUF">GGUF</option>
                    <option value="SafeTensors">SafeTensors</option>
                    <option value="ONNX">ONNX</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Quantization</label>
                  <input
                    type="text"
                    value={quantization}
                    onChange={e => setQuantization(e.target.value)}
                    placeholder="Q4_K_M"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Version</label>
                  <input
                    type="text"
                    value={version}
                    onChange={e => setVersion(e.target.value)}
                    placeholder="1.0.0"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Size (Bytes)</label>
                  <input
                    type="number"
                    value={sizeBytes}
                    onChange={e => setSizeBytes(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Min RAM (GB)</label>
                  <input
                    type="number"
                    value={minRamGB}
                    onChange={e => setMinRamGB(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Rec. RAM (GB)</label>
                  <input
                    type="number"
                    value={recommendedRamGB}
                    onChange={e => setRecommendedRamGB(Number(e.target.value))}
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
                  placeholder="64-character hex hash"
                  className="w-full font-mono text-[11px] rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">License</label>
                  <input
                    type="text"
                    value={license}
                    onChange={e => setLicense(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Storage Provider</label>
                  <select
                    value={storageProvider}
                    onChange={e => setStorageProvider(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="google-drive">Google Drive</option>
                    <option value="local-disk">Local Persistent Storage</option>
                    <option value="onedrive">OneDrive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Notes on inference speed, quantization quality, or target smartphone chipsets..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                />
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
                  Register Model
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
