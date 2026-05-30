/**
 * Connection status hook for tracking WebSocket connection state.
 *
 * Provides:
 * - Real-time connection status (connected/disconnected/reconnecting)
 * - Action queuing during disconnect via ActionQueue
 * - Automatic replay of queued actions on reconnection
 * - Connection status for UI display (TopBar indicator)
 *
 * Requirements: 13.5
 */
import { create } from "zustand";
import { ActionQueue, QueuedAction } from "./reconnect";

export type ConnectionStatus = "connected" | "disconnected" | "reconnecting";

interface ConnectionState {
  status: ConnectionStatus;
  /** Number of actions currently queued for replay */
  queuedActionCount: number;

  setStatus: (status: ConnectionStatus) => void;
  setQueuedActionCount: (count: number) => void;
}

/**
 * Zustand store for global connection status.
 * Consumed by TopBar and other UI components to display connection state.
 */
export const useConnectionStore = create<ConnectionState>((set) => ({
  status: "connected",
  queuedActionCount: 0,

  setStatus: (status) => set({ status }),
  setQueuedActionCount: (count) => set({ queuedActionCount: count }),
}));

/**
 * Singleton ActionQueue instance shared across the application.
 * Actions are queued here during WebSocket disconnect and replayed on reconnection.
 */
const actionQueue = new ActionQueue();

/**
 * Queue a user action to be replayed on reconnection.
 * If currently connected, the action is executed immediately.
 * If disconnected/reconnecting, the action is queued for later replay.
 *
 * @param action - The action to queue or execute
 * @returns true if the action was executed immediately, false if queued
 */
export function queueAction(action: QueuedAction): boolean {
  const { status } = useConnectionStore.getState();

  if (status === "connected") {
    // Execute immediately when connected
    action.execute();
    return true;
  }

  // Queue for replay when disconnected/reconnecting
  actionQueue.enqueue(action);
  useConnectionStore.getState().setQueuedActionCount(actionQueue.size);
  return false;
}

/**
 * Replay all queued actions in original order.
 * Called internally when connection is re-established.
 * Clears the queue after replay (no duplication).
 */
export async function replayQueuedActions(): Promise<void> {
  await actionQueue.replay();
  useConnectionStore.getState().setQueuedActionCount(0);
}

/**
 * Get the current number of queued actions.
 */
export function getQueuedActionCount(): number {
  return actionQueue.size;
}

/**
 * Clear all queued actions without replaying them.
 */
export function clearQueuedActions(): void {
  actionQueue.clear();
  useConnectionStore.getState().setQueuedActionCount(0);
}

/**
 * Notify the connection system that a WebSocket has connected.
 * Triggers replay of any queued actions.
 */
export async function notifyConnected(): Promise<void> {
  const store = useConnectionStore.getState();
  const previousStatus = store.status;
  store.setStatus("connected");

  // Replay queued actions if we were previously disconnected/reconnecting
  if (previousStatus !== "connected" && actionQueue.size > 0) {
    await replayQueuedActions();
  }
}

/**
 * Notify the connection system that a WebSocket has disconnected.
 */
export function notifyDisconnected(): void {
  useConnectionStore.getState().setStatus("disconnected");
}

/**
 * Notify the connection system that a reconnection attempt is in progress.
 */
export function notifyReconnecting(): void {
  useConnectionStore.getState().setStatus("reconnecting");
}
