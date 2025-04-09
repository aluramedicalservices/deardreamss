import { openDB } from 'idb';

const DB_NAME = 'gameDB';
const STORE_NAME = 'characterState';

export async function initDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    },
  });
}

export async function saveCharacterState(state: any) {
  const db = await initDB();
  await db.put(STORE_NAME, state, 'state');
}

export async function loadCharacterState() {
  const db = await initDB();
  return (await db.get(STORE_NAME, 'state')) || null;
}
