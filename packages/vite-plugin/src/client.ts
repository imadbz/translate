export interface UploadRequest {
  projectId?: string;
  files: { path: string; content: string }[];
}

export interface UploadResponse {
  jobId: string;
  status: string;
}

export interface JobResponse {
  jobId: string;
  status: 'processing' | 'complete' | 'error';
  files?: { path: string; content: string }[];
  translations?: Record<string, string>;
  error?: string;
}

export async function upload(
  serverUrl: string,
  request: UploadRequest,
): Promise<UploadResponse> {
  const res = await fetch(`${serverUrl}/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Upload failed (${res.status}): ${body}`);
  }

  return res.json() as Promise<UploadResponse>;
}

export async function pollJob(
  serverUrl: string,
  jobId: string,
  options: { interval: number; timeout: number },
): Promise<JobResponse> {
  const start = Date.now();

  while (Date.now() - start < options.timeout) {
    const res = await fetch(`${serverUrl}/jobs/${jobId}`);

    if (!res.ok) {
      if (res.status >= 500) {
        // Retry on server errors
        await sleep(options.interval);
        continue;
      }
      const body = await res.text();
      throw new Error(`Poll failed (${res.status}): ${body}`);
    }

    const job = (await res.json()) as JobResponse;

    if (job.status === 'complete') return job;
    if (job.status === 'error') {
      throw new Error(`Job failed: ${job.error}`);
    }

    await sleep(options.interval);
  }

  throw new Error(`Poll timeout after ${options.timeout}ms for job ${jobId}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
