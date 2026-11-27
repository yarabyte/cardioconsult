import { AcceptInvitationClient } from "./AcceptInvitationClient";

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <AcceptInvitationClient token={token} />;
}
