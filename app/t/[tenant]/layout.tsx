/** Segment commun cabinet — la présence du tenant est vérifiée dans (auth)/(app). */
export default function TenantRootLayout({ children }: LayoutProps<"/t/[tenant]">) {
  return children;
}
