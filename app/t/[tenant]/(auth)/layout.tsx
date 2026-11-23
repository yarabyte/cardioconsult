export const instant = false;

export default function TenantAuthLayout({ children }: LayoutProps<"/t/[tenant]">) {
  return children;
}