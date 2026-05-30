/**
 * Unit tests for the connection status hook and action queue integration.
 *
 * Tests:
 * - Connection state transitions (connected → disconnected → reconnecting → connected)
 * - Action queuing during disconnect
 * - Action replay on reconnection (order preserved, no duplication)
 * - Immediate execution when connected
 * - Connection status indicator display
 *
 * Validates: Requirements 13.5
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  useConnectionStore,
  queueAction,
  replayQueuedActions,
  getQueuedActionCount,
  clearQueuedActions,
  notifyConnected,
  notifyDisconnected,
  notifyReconnecting,
} from "./useConnectionStatus";

describe("useConnectionStatus", () => {
  beforeEach(() => {
    // Reset store to default state
    useConnectionStore.setState({
      status: "connected",
      queuedActionCount: 0,
    });
    clearQueuedActions();
  });

  describe("connection state transitions", () => {
    it("starts in connected state", () => {
      expect(useConnectionStore.getState().status).toBe("connected");
    });

    it("transitions to disconnected on notifyDisconnected", () => {
      notifyDisconnected();
      expect(useConnectionStore.getState().status).toBe("disconnected");
    });

    it("transitions to reconnecting on notifyReconnecting", () => {
      notifyReconnecting();
      expect(useConnectionStore.getState().status).toBe("reconnecting");
    });

    it("transitions to connected on notifyConnected", async () => {
      notifyDisconnected();
      await notifyConnected();
      expect(useConnectionStore.getState().status).toBe("connected");
    });
  });

  describe("action queuing during disconnect", () => {
    it("executes action immediately when connected", () => {
      let executed = false;
      const result = queueAction({
        id: "test-1",
        execute: () => { executed = true; },
      });

      expect(result).toBe(true);
      expect(executed).toBe(true);
      expect(getQueuedActionCount()).toBe(0);
    });

    it("queues action when disconnected", () => {
      notifyDisconnected();

      let executed = false;
      const result = queueAction({
        id: "test-1",
        execute: () => { executed = true; },
      });

      expect(result).toBe(false);
      expect(executed).toBe(false);
      expect(getQueuedActionCount()).toBe(1);
    });

    it("queues action when reconnecting", () => {
      notifyReconnecting();

      let executed = false;
      const result = queueAction({
        id: "test-1",
        execute: () => { executed = true; },
      });

      expect(result).toBe(false);
      expect(executed).toBe(false);
      expect(getQueuedActionCount()).toBe(1);
    });

    it("does not queue duplicate actions by id", () => {
      notifyDisconnected();

      queueAction({ id: "dup-1", execute: () => {} });
      queueAction({ id: "dup-1", execute: () => {} });

      expect(getQueuedActionCount()).toBe(1);
    });
  });

  describe("action replay on reconnection", () => {
    it("replays all queued actions in original order on reconnection", async () => {
      notifyDisconnected();

      const order: string[] = [];
      queueAction({ id: "a", execute: () => { order.push("a"); } });
      queueAction({ id: "b", execute: () => { order.push("b"); } });
      queueAction({ id: "c", execute: () => { order.push("c"); } });

      await notifyConnected();

      expect(order).toEqual(["a", "b", "c"]);
      expect(getQueuedActionCount()).toBe(0);
    });

    it("does not replay actions when already connected", async () => {
      // Already connected, queue is empty
      const order: string[] = [];
      await notifyConnected();
      expect(order).toEqual([]);
    });

    it("clears queue after replay", async () => {
      notifyDisconnected();

      queueAction({ id: "x", execute: () => {} });
      queueAction({ id: "y", execute: () => {} });

      await notifyConnected();

      expect(getQueuedActionCount()).toBe(0);
      expect(useConnectionStore.getState().queuedActionCount).toBe(0);
    });

    it("each action is executed exactly once during replay", async () => {
      notifyDisconnected();

      const counts = new Map<string, number>();
      queueAction({ id: "1", execute: () => { counts.set("1", (counts.get("1") ?? 0) + 1); } });
      queueAction({ id: "2", execute: () => { counts.set("2", (counts.get("2") ?? 0) + 1); } });

      await notifyConnected();

      expect(counts.get("1")).toBe(1);
      expect(counts.get("2")).toBe(1);
    });
  });

  describe("clearQueuedActions", () => {
    it("removes all queued actions without replaying", () => {
      notifyDisconnected();

      let executed = false;
      queueAction({ id: "test", execute: () => { executed = true; } });

      clearQueuedActions();

      expect(getQueuedActionCount()).toBe(0);
      expect(executed).toBe(false);
    });
  });

  describe("queued action count tracking", () => {
    it("updates queuedActionCount in store as actions are queued", () => {
      notifyDisconnected();

      queueAction({ id: "a", execute: () => {} });
      expect(useConnectionStore.getState().queuedActionCount).toBe(1);

      queueAction({ id: "b", execute: () => {} });
      expect(useConnectionStore.getState().queuedActionCount).toBe(2);
    });
  });
});
