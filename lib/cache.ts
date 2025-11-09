import "server-only";

type CacheOptions = {
  tags?: string[];
  revalidate?: number | false;
};

type CacheEntry = {
  data: any;
  expiresAt: number | null;
  tags: Set<string>;
  paths: Set<string>;
};

// --- In-memory cache stores ---
const memoryStore = new Map<string, CacheEntry>();
const tagMap = new Map<string, Set<string>>(); // tag -> cache keys
const pathMap = new Map<string, Set<string>>(); // path -> cache keys

function generateKey(fn: Function, args: any[], keyParts?: any[]): string {
  const fnString = fn.toString();
  const baseKey = JSON.stringify(args);
  const extraKey = keyParts ? JSON.stringify(keyParts) : "";
  return `${fnString}:${baseKey}:${extraKey}`;
}

// --- In-memory cache logic ---
function inMemoryCache<T>(
  fetchFn: (...args: any[]) => Promise<T>,
  keyParts?: any[],
  options?: CacheOptions & { paths?: string[] },
): (...args: any[]) => Promise<T> {
  return async function (...args: any[]): Promise<T> {
    const key = generateKey(fetchFn, args, keyParts);
    const now = Date.now();

    const cached = memoryStore.get(key);

    if (cached && (cached.expiresAt === null || cached.expiresAt > now)) {
      return cached.data;
    }

    const data = await fetchFn(...args);

    const expiresAt =
      typeof options?.revalidate === "number"
        ? now + options.revalidate * 1000
        : null;

    const tags = new Set(options?.tags || []);
    const paths = new Set(options?.paths || []);

    memoryStore.set(key, { data, expiresAt, tags, paths });

    for (const tag of Array.from(tags)) {
      if (!tagMap.has(tag)) tagMap.set(tag, new Set());
      tagMap.get(tag)!.add(key);
    }

    for (const path of Array.from(paths)) {
      if (!pathMap.has(path)) pathMap.set(path, new Set());
      pathMap.get(path)!.add(key);
    }

    return data;
  };
}

// --- Public API ---

export function cache<T>(
  fetchFn: (...args: any[]) => Promise<T>,
  keyParts?: any[],
  options?: CacheOptions & { paths?: string[] },
): (...args: any[]) => Promise<T> {
  return inMemoryCache(fetchFn, keyParts, options);
}

export function revalidateTag(tag: string) {
  const keys = tagMap.get(tag);
  if (!keys) return;
  for (const key of Array.from(keys)) {
    memoryStore.delete(key);
  }
  tagMap.delete(tag);
}

export function revalidatePath(path: string, type?: "page" | "layout") {
  const keys = pathMap.get(path);
  if (!keys) return;
  for (const key of Array.from(keys)) {
    memoryStore.delete(key);
  }
  pathMap.delete(path);
}

export function clearAllCache() {
  memoryStore.clear();
  tagMap.clear();
  pathMap.clear();
}
