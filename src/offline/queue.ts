// Lightweight IndexedDB queue for offline actions (no external deps).
// Shape:
// {
//   id: string;
//   type: string;
//   payload: Record<string, unknown>;
//   clientCreatedAt: number;
//   source: 'offline' | 'online' | string;
//   synced: boolean;
//   retryCount: number;
// }

const DB_NAME = 'salonflow-offline';
const STORE_NAME = 'queue_actions';
const DB_VERSION = 1;
const MAX_QUEUE = 500;

type QueueAction = {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  clientCreatedAt: number;
  source: string;
  synced: boolean;
  retryCount: number;
};

function randomId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `qa_${Math.random().toString(36).slice(2)}${Date.now()}`;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('synced', 'synced', { unique: false });
        store.createIndex('clientCreatedAt', 'clientCreatedAt', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest | Promise<T>,
): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    const result = fn(store);
    if (result instanceof IDBRequest) {
      result.onsuccess = () => resolve(result.result as T);
      result.onerror = () => reject(result.error);
    } else {
      // Promise path (caller handled resolution)
      (result as Promise<T>).then(resolve).catch(reject);
    }
    tx.onerror = () => reject(tx.error);
  });
}

export async function enqueueAction(input: {
  type: string;
  payload: Record<string, unknown>;
  source?: string;
  clientCreatedAt?: number;
}): Promise<QueueAction | null> {
  const db = await openDb();
  const count = await new Promise<number>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  if (count >= MAX_QUEUE) {
    // Caller should surface a friendly toast.
    return null;
  }

  const action: QueueAction = {
    id: randomId(),
    type: input.type,
    payload: input.payload,
    clientCreatedAt: input.clientCreatedAt ?? Date.now(),
    source: input.source ?? 'offline',
    synced: false,
    retryCount: 0,
  };

  await withStore('readwrite', (store) => store.add(action));
  return action;
}

export async function getPendingActions(): Promise<QueueAction[]> {
  return withStore<QueueAction[]>('readonly', (store) => {
    const index = store.index('synced');
    const req = index.getAll(IDBKeyRange.only(false));
    req.onsuccess = () => {
      const items = (req.result as QueueAction[]).sort(
        (a, b) => a.clientCreatedAt - b.clientCreatedAt,
      );
      (req as any).result = items;
    };
    return req;
  });
}

export async function markSynced(id: string): Promise<void> {
  await withStore('readwrite', (store) => {
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const existing = getReq.result as QueueAction | undefined;
      if (!existing) return;
      existing.synced = true;
      existing.retryCount = 0;
      store.put(existing);
    };
    return getReq;
  });
}

export async function incrementRetry(id: string): Promise<void> {
  await withStore('readwrite', (store) => {
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const existing = getReq.result as QueueAction | undefined;
      if (!existing) return;
      existing.retryCount = (existing.retryCount ?? 0) + 1;
      store.put(existing);
    };
    return getReq;
  });
}

export async function clearSynced(): Promise<void> {
  await withStore('readwrite', (store) => {
    const index = store.index('synced');
    const cursorReq = index.openCursor(IDBKeyRange.only(true));
    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
    return cursorReq;
  });
}
