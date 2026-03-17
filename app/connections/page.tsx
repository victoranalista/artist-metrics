import { getConnections } from "@/lib/actions";
import { ConnectionsClient } from "./connections-client";

export default async function ConnectionsPage() {
  const connections = await getConnections();

  return <ConnectionsClient connections={connections} />;
}
