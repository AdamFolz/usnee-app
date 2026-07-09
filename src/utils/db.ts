import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { ConsumptionEntry, Batch, SleepEntry, MoodEntry, FoodEntry, WaterEntry, NorsSession } from '../types';

interface USNEEDB extends DBSchema {
  entries: {
    key: string;
    value: ConsumptionEntry;
    indexes: { 'by-timestamp': number; 'by-substance': string };
  };
  batches: {
    key: string;
    value: Batch;
  };
  sleep: {
    key: string;
    value: SleepEntry;
  };
  mood: {
    key: string;
    value: MoodEntry;
  };
  food: {
    key: string;
    value: FoodEntry;
  };
  water: {
    key: string;
    value: WaterEntry;
  };
  nors: {
    key: string;
    value: NorsSession;
  };
}

let db: IDBPDatabase<USNEEDB> | null = null;

export async function initDB(): Promise<IDBPDatabase<USNEEDB>> {
  if (db) return db;
  db = await openDB<USNEEDB>('usnee-db', 1, {
    upgrade(db) {
      const entriesStore = db.createObjectStore('entries', { keyPath: 'id' });
      entriesStore.createIndex('by-timestamp', 'timestamp');
      entriesStore.createIndex('by-substance', 'substanceId');
      db.createObjectStore('batches', { keyPath: 'id' });
      db.createObjectStore('sleep', { keyPath: 'id' });
      db.createObjectStore('mood', { keyPath: 'id' });
      db.createObjectStore('food', { keyPath: 'id' });
      db.createObjectStore('water', { keyPath: 'id' });
      db.createObjectStore('nors', { keyPath: 'id' });
    }
  });
  return db;
}

export async function getDB() {
  return initDB();
}

export async function addEntry(entry: ConsumptionEntry): Promise<void> {
  const d = await getDB();
  await d.put('entries', entry);
}

export async function getEntries(): Promise<ConsumptionEntry[]> {
  const d = await getDB();
  return d.getAllFromIndex('entries', 'by-timestamp');
}

export async function getEntriesBySubstance(substanceId: string): Promise<ConsumptionEntry[]> {
  const d = await getDB();
  return d.getAllFromIndex('entries', 'by-substance', substanceId);
}

export async function deleteEntry(id: string): Promise<void> {
  const d = await getDB();
  await d.delete('entries', id);
}

export async function updateEntry(entry: ConsumptionEntry): Promise<void> {
  const d = await getDB();
  await d.put('entries', entry);
}

export async function getEntryById(id: string): Promise<ConsumptionEntry | undefined> {
  const d = await getDB();
  return d.get('entries', id);
}

export async function getLastEntry(): Promise<ConsumptionEntry | undefined> {
  const d = await getDB();
  const all = await d.getAllFromIndex('entries', 'by-timestamp');
  return all.length > 0 ? all[all.length - 1] : undefined;
}

export async function getEntriesBetween(start: number, end: number): Promise<ConsumptionEntry[]> {
  const d = await getDB();
  const all = await d.getAllFromIndex('entries', 'by-timestamp');
  return all.filter(e => e.timestamp >= start && e.timestamp <= end);
}

export async function addBatch(batch: Batch): Promise<void> {
  const d = await getDB();
  await d.put('batches', batch);
}

export async function getBatches(): Promise<Batch[]> {
  const d = await getDB();
  return d.getAll('batches');
}

export async function getActiveBatch(substanceId?: string): Promise<Batch | undefined> {
  const batches = await getBatches();
  if (substanceId) {
    return batches.find(b => b.substanceId === substanceId && b.active);
  }
  return batches.find(b => b.active);
}

export async function updateBatch(batch: Batch): Promise<void> {
  const d = await getDB();
  await d.put('batches', batch);
}

export async function addMood(entry: MoodEntry): Promise<void> {
  const d = await getDB();
  await d.put('mood', entry);
}

export async function getMoods(): Promise<MoodEntry[]> {
  const d = await getDB();
  return d.getAll('mood');
}

export async function addSleep(entry: SleepEntry): Promise<void> {
  const d = await getDB();
  await d.put('sleep', entry);
}

export async function getSleep(): Promise<SleepEntry[]> {
  const d = await getDB();
  return d.getAll('sleep');
}

export async function addFood(entry: FoodEntry): Promise<void> {
  const d = await getDB();
  await d.put('food', entry);
}

export async function getFood(): Promise<FoodEntry[]> {
  const d = await getDB();
  return d.getAll('food');
}

export async function addWater(entry: WaterEntry): Promise<void> {
  const d = await getDB();
  await d.put('water', entry);
}

export async function getWater(): Promise<WaterEntry[]> {
  const d = await getDB();
  return d.getAll('water');
}

export async function addNors(session: NorsSession): Promise<void> {
  const d = await getDB();
  await d.put('nors', session);
}

export async function getNorsSessions(): Promise<NorsSession[]> {
  const d = await getDB();
  return d.getAll('nors');
}

export async function clearAllData(): Promise<void> {
  const d = await getDB();
  const tx = d.transaction(['entries', 'batches', 'sleep', 'mood', 'food', 'water', 'nors'], 'readwrite');
  await Promise.all([
    tx.objectStore('entries').clear(),
    tx.objectStore('batches').clear(),
    tx.objectStore('sleep').clear(),
    tx.objectStore('mood').clear(),
    tx.objectStore('food').clear(),
    tx.objectStore('water').clear(),
    tx.objectStore('nors').clear()
  ]);
  await tx.done;
}
