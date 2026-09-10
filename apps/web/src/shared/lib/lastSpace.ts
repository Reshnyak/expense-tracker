/**
 * Remembers the space the user last opened so `/` and `/spaces` can send them
 * straight back to it. Best-effort: every access is guarded for private-mode /
 * disabled storage, mirroring `shared/auth/tokenStore`.
 */
const KEY = "et.last_space_id";

export function getLastSpaceId(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setLastSpaceId(id: string): void {
  try {
    localStorage.setItem(KEY, id);
  } catch {
    /* ignore */
  }
}

export function clearLastSpaceId(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
