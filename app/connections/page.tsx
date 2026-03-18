import { getConnections } from "@/lib/actions";
import { ConnectionsClient } from "./connections-client";

export const dynamic = "force-dynamic";

export default async function ConnectionsPage() {
  const connections = await getConnections();

  return <ConnectionsClient connections={connections} />;
}
