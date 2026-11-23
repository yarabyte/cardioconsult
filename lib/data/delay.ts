/** Optional simulated latency for mock repositories. */
export async function mockDelay(ms = 40): Promise<void> {
  if (process.env.MOCK_DELAY === "0") return;
  await new Promise((r) => setTimeout(r, ms));
}

export const MOCK_ACTIVE = true;
