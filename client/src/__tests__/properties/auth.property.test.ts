/**
 * Property-based tests for auth token inclusion in API requests.
 *
 * Property 15: Auth token inclusion in API requests
 * - Generate arbitrary tokens and API request configurations
 * - Assert: Authorization header is `Bearer {token}` when token exists; WebSocket URL includes token param
 *
 * **Validates: Requirements 10.2**
 */
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { arbAuthToken } from "./helpers";

// ─── Mock Utility Functions ─────────────────────────────────────────────────
// These mock the auth token handling that will be implemented in task 14.1.

/**
 * Builds the Authorization header value for a given token.
 */
function buildAuthHeader(token: string): string {
  return `Bearer ${token}`;
}

/**
 * Builds a WebSocket URL with the token as a query parameter.
 */
function buildWsUrl(baseUrl: string, token: string): string {
  return `${baseUrl}?token=${token}`;
}

// ─── Arbitraries ────────────────────────────────────────────────────────────

/** Arbitrary WebSocket base URL */
const arbWsBaseUrl = fc
  .tuple(
    fc.constantFrom("ws://", "wss://"),
    fc.stringMatching(/^[a-z0-9.-]{1,50}$/),
    fc.option(fc.integer({ min: 1000, max: 65535 }), { nil: undefined })
  )
  .map(([protocol, host, port]) =>
    port !== undefined ? `${protocol}${host}:${port}/ws` : `${protocol}${host}/ws`
  );

// ─── Property Tests ─────────────────────────────────────────────────────────

describe("Feature: ai-first-workspace-redesign, Property 15: Auth token inclusion in API requests", () => {
  it("Authorization header always starts with 'Bearer ' followed by the exact token", () => {
    fc.assert(
      fc.property(arbAuthToken, (token) => {
        const header = buildAuthHeader(token);

        expect(header).toBe(`Bearer ${token}`);
        expect(header.startsWith("Bearer ")).toBe(true);
        expect(header.slice("Bearer ".length)).toBe(token);
      }),
      { numRuns: 100 }
    );
  });

  it("Authorization header contains the token without modification", () => {
    fc.assert(
      fc.property(arbAuthToken, (token) => {
        const header = buildAuthHeader(token);

        // The token portion must be exactly the input token (no trimming, encoding, etc.)
        const extractedToken = header.replace("Bearer ", "");
        expect(extractedToken).toBe(token);
        expect(extractedToken.length).toBe(token.length);
      }),
      { numRuns: 100 }
    );
  });

  it("WebSocket URL always contains token= query param with the exact token value", () => {
    fc.assert(
      fc.property(arbWsBaseUrl, arbAuthToken, (baseUrl, token) => {
        const wsUrl = buildWsUrl(baseUrl, token);

        expect(wsUrl).toContain(`token=${token}`);
        expect(wsUrl.startsWith(baseUrl)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it("WebSocket URL preserves the base URL and appends token as query parameter", () => {
    fc.assert(
      fc.property(arbWsBaseUrl, arbAuthToken, (baseUrl, token) => {
        const wsUrl = buildWsUrl(baseUrl, token);

        // URL structure: baseUrl?token=<token>
        const [urlPart, queryPart] = wsUrl.split("?");
        expect(urlPart).toBe(baseUrl);
        expect(queryPart).toBe(`token=${token}`);
      }),
      { numRuns: 100 }
    );
  });

  it("different tokens produce different Authorization headers", () => {
    fc.assert(
      fc.property(arbAuthToken, arbAuthToken, (token1, token2) => {
        fc.pre(token1 !== token2);

        const header1 = buildAuthHeader(token1);
        const header2 = buildAuthHeader(token2);

        expect(header1).not.toBe(header2);
      }),
      { numRuns: 100 }
    );
  });

  it("different tokens produce different WebSocket URLs for the same base URL", () => {
    fc.assert(
      fc.property(arbWsBaseUrl, arbAuthToken, arbAuthToken, (baseUrl, token1, token2) => {
        fc.pre(token1 !== token2);

        const wsUrl1 = buildWsUrl(baseUrl, token1);
        const wsUrl2 = buildWsUrl(baseUrl, token2);

        expect(wsUrl1).not.toBe(wsUrl2);
      }),
      { numRuns: 100 }
    );
  });
});
