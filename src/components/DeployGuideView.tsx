import React, { useState } from 'react';
import {
  Rocket,
  Github,
  Cloud,
  Terminal,
  Shield,
  ExternalLink,
  Copy,
  CheckCircle,
  Server,
  Layers,
  HelpCircle,
  Lock,
} from 'lucide-react';

export const DeployGuideView: React.FC = () => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copySnippet = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const steps = [
    {
      num: 1,
      title: 'Create Private GitHub Repository',
      desc: 'Create an empty repository on GitHub marked as PRIVATE so your organization and team configurations remain confidential.',
      command: `# 1. Initialize git locally (if not already done)\ngit init\n\n# 2. Add files while respecting .gitignore (never commit .env!)\ngit add .\n\n# 3. Create your initial commit\ngit commit -m "feat: initial commit of NexusControl panel"\n\n# 4. Link to your private GitHub repository\ngit remote add origin git@github.com:YOUR_USERNAME/nexus-control-private.git\n\n# 5. Push to main\ngit branch -M main\ngit push -u origin main`,
    },
    {
      num: 2,
      title: 'Configure Secrets & Environment Variables',
      desc: 'Set up your secret environment variables in your deployment platform (e.g. Cloud Run, Render, or Railway secrets dashboard).',
      command: `# Required Security & Auth Secrets:\nNODE_ENV=production\nPORT=3000\nJWT_SECRET=super_secret_random_64_character_hex_key\nDEFAULT_ADMIN_EMAIL=admin@nexus.internal\nDEFAULT_ADMIN_PASSWORD=YourStrongPassword#2026!\n\n# Google Drive API Credentials:\nACTIVE_STORAGE_PROVIDER=google-drive\nGOOGLE_DRIVE_ROOT_FOLDER_NAME=AI-HOST\nGOOGLE_SERVICE_ACCOUNT_EMAIL=drive-worker@your-project.iam.gserviceaccount.com\nGOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----"`,
    },
    {
      num: 3,
      title: 'Deploy Without Renting a VPS (Zero-VPS Serverless)',
      desc: 'Option A: Google Cloud Run (Recommended - Free Tier includes 2M requests/month, scales to zero, zero maintenance).',
      command: `# Build and deploy container directly to Google Cloud Run:\ngcloud builds submit --tag gcr.io/YOUR_GCP_PROJECT/nexus-control\n\ngcloud run deploy nexus-control \\\n  --image gcr.io/YOUR_GCP_PROJECT/nexus-control \\\n  --platform managed \\\n  --region us-central1 \\\n  --allow-unauthenticated \\\n  --set-env-vars "NODE_ENV=production,ACTIVE_STORAGE_PROVIDER=google-drive"`,
    },
    {
      num: 4,
      title: 'Where Does My Admin URL Come From?',
      desc: 'Once deployed, Cloud Run or Render automatically provisions a dedicated HTTPS URL for your application.',
      command: `# 1. Cloud Run Default URL: https://nexus-control-xyz-uc.a.run.app\n# 2. Render Default URL: https://nexus-control.onrender.com\n# 3. Custom Domain mapping (optional):\n#    Map your domain e.g. admin.yourdomain.com via CNAME\n#    DNS -> ghs.googlehosted.com or your host's CNAME target`,
    },
    {
      num: 5,
      title: 'Connect Google Drive & Grant Folder Permissions',
      desc: 'Enable Google Drive API v3 in Google Cloud Console and share your target folder with your service account email.',
      command: `# 1. Go to console.cloud.google.com -> APIs & Services -> Library\n# 2. Search for "Google Drive API" and click ENABLE\n# 3. Go to IAM & Admin -> Service Accounts -> Create Service Account\n# 4. Create Key (JSON) and download\n# 5. Open your Google Drive -> Create folder "AI-HOST" -> Click Share -> Paste Service Account Email as Editor!`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400">
              Production Zero-VPS Blueprint
            </span>
            <span className="text-xs text-slate-400">Private GitHub & Cloud Deployment</span>
          </div>
          <h2 className="text-lg font-bold text-white sm:text-xl">
            Deployment & Private GitHub Setup Guide
          </h2>
          <p className="max-w-2xl text-xs text-slate-400">
            Everything you need to publish this project to a private GitHub repository and launch it on free-tier serverless cloud infrastructure without renting or maintaining a traditional VPS.
          </p>
        </div>
      </div>

      {/* Architecture Explainer Card (Requirement 28) */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Layers className="h-4 w-4 text-indigo-400" />
          Component Separation & Security Boundaries
        </h3>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3 text-xs">
          <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
            <div className="flex items-center gap-2 text-indigo-400 font-bold mb-1">
              <Github className="h-4 w-4" />
              <span>1. Private GitHub Repo</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Stores your source code, CI/CD GitHub Actions workflows, and Dockerfile. <strong className="text-slate-300">Never stores secrets or .env files.</strong>
            </p>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
            <div className="flex items-center gap-2 text-emerald-400 font-bold mb-1">
              <Server className="h-4 w-4" />
              <span>2. Cloud Run / Container API</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Serves the admin web UI and protects all API endpoints. Holds environment secrets securely in server memory.
            </p>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
            <div className="flex items-center gap-2 text-amber-400 font-bold mb-1">
              <Cloud className="h-4 w-4" />
              <span>3. Google Drive / Storage</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Provides raw file and model weight storage. Does NOT run code or handle authentication—all requests are proxied via your backend.
            </p>
          </div>
        </div>
      </div>

      {/* Step by Step Guide */}
      <div className="space-y-4">
        {steps.map(step => (
          <div
            key={step.num}
            className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-3"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600/20 text-xs font-bold text-indigo-400 border border-indigo-500/30">
                {step.num}
              </span>
              <h3 className="text-sm font-bold text-white">{step.title}</h3>
            </div>

            <p className="text-xs text-slate-300 pl-10 leading-relaxed">{step.desc}</p>

            <div className="relative pl-10">
              <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950 p-3.5 font-mono text-xs text-indigo-300">
                {step.command}
              </pre>

              <button
                onClick={() => copySnippet(step.command, `step-${step.num}`)}
                className="absolute right-3 top-3 flex items-center gap-1 rounded bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-300 hover:bg-slate-700 shadow"
              >
                {copiedId === `step-${step.num}` ? (
                  <>
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
