export const DEMO_ROLE_COOKIE = "demo-role";

export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO === "true";
}
