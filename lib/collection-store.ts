import { PlatformCollectionStatus } from "./platforms/types";

const store = new Map<string, PlatformCollectionStatus[]>();

export function getStatus(id: string) {
  return store.get(id) || [];
}

export function setStatus(id: string, statuses: PlatformCollectionStatus[]) {
  store.set(id, statuses);
}

export function deleteStatus(id: string) {
  store.delete(id);
}
