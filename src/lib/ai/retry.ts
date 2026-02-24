export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  /** Per-attempt timeout in ms. If an attempt takes longer, it's aborted. */
  timeout?: number;
}

const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503]);
const NON_RETRYABLE_STATUS_CODES = new Set([400, 401, 403]);

function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const anyError = error as unknown as Record<string, unknown>;
    const status = anyError.status ?? anyError.statusCode;
    if (typeof status === 'number') {
      if (NON_RETRYABLE_STATUS_CODES.has(status)) return false;
      if (RETRYABLE_STATUS_CODES.has(status)) return true;
    }
    if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT') || error.name === 'TimeoutError') {
      return true;
    }
    if (error.message.includes('ECONNRESET') || error.message.includes('fetch failed')) {
      return true;
    }
  }
  return false;
}

/**
 * Race a promise against a timeout. Rejects with TimeoutError if timeout expires.
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new TimeoutError(`Operation timed out after ${ms}ms`));
    }, ms);

    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}

class TimeoutError extends Error {
  name = 'TimeoutError';
  constructor(message: string) {
    super(message);
  }
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const { maxRetries = 2, baseDelay = 1000, maxDelay = 10000, timeout = 60_000 } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Each attempt is bounded by timeout
      return await withTimeout(fn(), timeout);
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries || !isRetryableError(error)) {
        throw error;
      }

      const exponentialDelay = baseDelay * Math.pow(2, attempt);
      const jitter = Math.random() * baseDelay * 0.5;
      const delay = Math.min(exponentialDelay + jitter, maxDelay);

      console.warn(
        `[Retry] Attempt ${attempt + 1}/${maxRetries} failed, retrying in ${Math.round(delay)}ms...`,
        error instanceof Error ? error.message : error,
      );

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
