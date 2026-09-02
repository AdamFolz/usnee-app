/**
 * Krea AI Integration for USNEE v2
 * Генерация изображений через Krea API
 */

const KREA_API_BASE = 'https://api.krea.ai';
const KREA_API_KEY = (import.meta as any).env?.VITE_KREA_API_KEY || '3c702185-15b2-43e5-aa0d-4b849b1e736f:wa3U2-rjtXn1VnZ09TF_FdS1Sjc2MohA';

interface KreaJob {
  job_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: {
    urls: string[];
  };
}

interface GenerateOptions {
  prompt: string;
  aspect_ratio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  resolution?: '512x512' | '1K' | '2K';
}

class KreaClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl: string = KREA_API_BASE) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  async generateImage(options: GenerateOptions): Promise<string> {
    const job = await this.createJob(options);
    const result = await this.waitForCompletion(job.job_id);
    return result.result?.urls?.[0] || '';
  }

  async createJob(options: GenerateOptions): Promise<KreaJob> {
    const response = await fetch(`${this.baseUrl}/generate/image/krea/krea-2/medium`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        prompt: options.prompt,
        aspect_ratio: options.aspect_ratio || '16:9',
        resolution: options.resolution || '1K',
      }),
    });

    if (!response.ok) {
      throw new Error(`Krea API error: ${response.status}`);
    }

    return response.json() as Promise<KreaJob>;
  }

  async waitForCompletion(jobId: string): Promise<KreaJob> {
    const maxAttempts = 60; // 5 minutes max
    let attempts = 0;

    while (attempts < maxAttempts) {
      const response = await fetch(`${this.baseUrl}/jobs/${jobId}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to check job status: ${response.status}`);
      }

      const job = await response.json() as KreaJob;

      if (job.status === 'completed') {
        return job;
      }

      if (job.status === 'failed') {
        throw new Error('Image generation failed');
      }

      await new Promise(resolve => setTimeout(resolve, 5000));
      attempts++;
    }

    throw new Error('Timeout waiting for image generation');
  }
}

export const krea = new KreaClient(KREA_API_KEY);
export type { KreaJob, GenerateOptions };