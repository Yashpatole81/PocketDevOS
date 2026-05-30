/**
 * Reconnection utilities for WebSocket disconnect handling.
 * Provides exponential backoff retry logic and an action queue
 * for replaying user actions on reconnection.
 */

/**
 * Exponential backoff calculator for reconnection attempts.
 * Delay formula: baseDelay × 2^attempt
 */
export class ExponentialBackoff {
  private readonly baseDelay: number;
  private readonly maxRetries: number;
  private attempt: number;

  constructor(baseDelay: number = 1000, maxRetries: number = 3) {
    this.baseDelay = baseDelay;
    this.maxRetries = maxRetries;
    this.attempt = 0;
  }

  /** Returns the delay in ms for the given attempt: baseDelay × 2^attempt */
  getDelay(attempt: number): number {
    return this.baseDelay * Math.pow(2, attempt);
  }

  /** Returns true if the attempt number is less than maxRetries */
  shouldRetry(attempt: number): boolean {
    return attempt < this.maxRetries;
  }

  /** Resets internal attempt counter */
  reset(): void {
    this.attempt = 0;
  }

  /** Returns the current attempt number */
  get currentAttempt(): number {
    return this.attempt;
  }

  /** Increments the internal attempt counter and returns the new value */
  nextAttempt(): number {
    return ++this.attempt;
  }
}

export interface QueuedAction {
  id: string;
  execute: () => void | Promise<void>;
}

/**
 * FIFO action queue for replaying user actions on WebSocket reconnection.
 * Prevents duplicate actions by id.
 */
export class ActionQueue {
  private queue: QueuedAction[] = [];

  /** Adds an action to the queue. Ignores duplicates by id. */
  enqueue(action: QueuedAction): void {
    if (this.queue.some((a) => a.id === action.id)) {
      return;
    }
    this.queue.push(action);
  }

  /** Executes all queued actions in FIFO order, then clears the queue. */
  async replay(): Promise<void> {
    const actions = [...this.queue];
    this.queue = [];
    for (const action of actions) {
      await action.execute();
    }
  }

  /** Removes all queued actions. */
  clear(): void {
    this.queue = [];
  }

  /** Returns the number of actions in the queue. */
  get size(): number {
    return this.queue.length;
  }
}
