import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { AIModelRecord } from './types.js';
import { ActivityLogger } from './activity.js';

export class ModelManager {
  private static instance: ModelManager;
  private modelsFile: string;
  private models: Map<string, AIModelRecord> = new Map();

  private constructor() {
    const dataDir = process.env.STORAGE_LOCAL_DIR ? path.dirname(process.env.STORAGE_LOCAL_DIR) : path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch {}
    }
    this.modelsFile = path.join(dataDir, 'models.json');
    this.initModels();
  }

  public static getInstance(): ModelManager {
    if (!ModelManager.instance) {
      ModelManager.instance = new ModelManager();
    }
    return ModelManager.instance;
  }

  private initModels() {
    try {
      if (fs.existsSync(this.modelsFile)) {
        const raw = fs.readFileSync(this.modelsFile, 'utf-8');
        const list: AIModelRecord[] = JSON.parse(raw);
        for (const m of list) {
          this.models.set(m.id, m);
        }
      } else {
        this.seedInitialModels();
      }
    } catch (err) {
      console.error('[ModelManager] Error reading models.json:', err);
      this.seedInitialModels();
    }
  }

  private seedInitialModels() {
    const defaultModels: AIModelRecord[] = [
      {
        id: 'gemma-2-2b-it-q4',
        name: 'Gemma 2 2B Instruct',
        version: '2.0.0',
        format: 'GGUF',
        quantization: 'Q4_K_M',
        sizeBytes: 1650000000, // ~1.65 GB
        minRamGB: 3,
        recommendedRamGB: 4,
        downloadUrl: '/api/models/gemma-2-2b-it-q4/download',
        sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
        license: 'Gemma Terms of Use',
        source: 'google/gemma-2-2b-it',
        storageProvider: 'google-drive',
        status: 'ACTIVE',
        description: 'Lightweight, state-of-the-art open model from Google, optimized for mobile on-device Android inference.',
        tags: ['mobile', 'instruction-tuned', 'edge-ai'],
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'llama-3.2-1b-q4km',
        name: 'Llama 3.2 1B Compact',
        version: '3.2.0',
        format: 'GGUF',
        quantization: 'Q4_K_M',
        sizeBytes: 1240000000, // ~1.24 GB
        minRamGB: 2,
        recommendedRamGB: 3,
        downloadUrl: '/api/models/llama-3.2-1b-q4km/download',
        sha256: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
        license: 'Llama 3.2 Community License',
        source: 'meta-llama/Llama-3.2-1B-Instruct',
        storageProvider: 'local-disk',
        status: 'ACTIVE',
        description: 'Ultra-efficient compact language model designed for smartphone RAM constraints.',
        tags: ['low-ram', 'summarization', 'fast'],
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'whisper-base-en-int8',
        name: 'Whisper Base English (ASR)',
        version: '1.0.0',
        format: 'ONNX',
        quantization: 'INT8',
        sizeBytes: 145000000, // ~145 MB
        minRamGB: 1,
        recommendedRamGB: 2,
        downloadUrl: '/api/models/whisper-base-en-int8/download',
        sha256: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
        license: 'MIT',
        source: 'openai/whisper-base.en',
        storageProvider: 'google-drive',
        status: 'ACTIVE',
        description: 'Automatic speech recognition model for Android voice transcription.',
        tags: ['audio', 'speech-to-text', 'whisper'],
        updatedAt: new Date().toISOString(),
      },
    ];

    for (const m of defaultModels) {
      this.models.set(m.id, m);
    }
    this.saveModels();
  }

  private saveModels() {
    try {
      const list = Array.from(this.models.values());
      fs.writeFileSync(this.modelsFile, JSON.stringify(list, null, 2), 'utf-8');
    } catch (err) {
      console.error('[ModelManager] Failed to save models.json:', err);
    }
  }

  public getModels(): AIModelRecord[] {
    return Array.from(this.models.values());
  }

  public getModelById(id: string): AIModelRecord | null {
    return this.models.get(id) || null;
  }

  public createModel(data: Omit<AIModelRecord, 'downloadUrl' | 'updatedAt'>, actorEmail: string): AIModelRecord {
    if (this.models.has(data.id)) {
      throw new Error(`Model with ID '${data.id}' already exists.`);
    }

    const newModel: AIModelRecord = {
      ...data,
      downloadUrl: `/api/models/${data.id}/download`,
      updatedAt: new Date().toISOString(),
    };

    this.models.set(newModel.id, newModel);
    this.saveModels();

    ActivityLogger.getInstance().log({
      userId: actorEmail,
      userEmail: actorEmail,
      action: 'MODEL_CREATED',
      category: 'MODELS',
      details: `Registered AI Model: ${newModel.name} (${newModel.format} ${newModel.quantization})`,
      status: 'SUCCESS',
    });

    return newModel;
  }

  public updateModel(id: string, updates: Partial<AIModelRecord>, actorEmail: string): AIModelRecord {
    const existing = this.models.get(id);
    if (!existing) throw new Error(`Model not found with ID ${id}`);

    const updated: AIModelRecord = {
      ...existing,
      ...updates,
      id: existing.id, // prevent changing primary key
      updatedAt: new Date().toISOString(),
      downloadUrl: `/api/models/${existing.id}/download`,
    };

    this.models.set(id, updated);
    this.saveModels();

    ActivityLogger.getInstance().log({
      userId: actorEmail,
      userEmail: actorEmail,
      action: 'MODEL_UPDATED',
      category: 'MODELS',
      details: `Updated AI Model metadata for ${updated.name}`,
      status: 'SUCCESS',
    });

    return updated;
  }

  public deleteModel(id: string, actorEmail: string): boolean {
    const existing = this.models.get(id);
    if (!existing) throw new Error(`Model not found with ID ${id}`);

    this.models.delete(id);
    this.saveModels();

    ActivityLogger.getInstance().log({
      userId: actorEmail,
      userEmail: actorEmail,
      action: 'MODEL_DELETED',
      category: 'MODELS',
      details: `Deleted AI Model record for ${existing.name}`,
      status: 'SUCCESS',
    });

    return true;
  }

  public getAndroidManifest(): { count: number; updated: string; models: AIModelRecord[] } {
    const activeModels = Array.from(this.models.values()).filter(m => m.status === 'ACTIVE');
    return {
      count: activeModels.length,
      updated: new Date().toISOString(),
      models: activeModels,
    };
  }
}
