import Dexie from 'dexie';

// DB layer — swap these functions for Firebase equivalents to migrate to cloud
export const db = new Dexie('MilkledgerDB');

// Version 1 — original schema
db.version(1).stores({
  users: '++id, pin',
  customers: '++id, name, rate, fixedFat, createdAt',
  milkEntries: '++id, customerId, date, period, cycleId'
});

// Version 2 — adds month + year to entries for per-month history
db.version(2).stores({
  users: '++id, pin',
  customers: '++id, name, rate, fixedFat, createdAt',
  milkEntries: '++id, customerId, date, period, cycleId, month, year'
}).upgrade(tx => {
  // Old entries get assigned to month=0, year=0 (they'll be invisible under normal month filters)
  return tx.table('milkEntries').toCollection().modify(entry => {
    if (entry.month === undefined) { entry.month = 0; entry.year = 0; }
  });
});

export const initDb = async () => {
  const userCount = await db.users.count();
  if (userCount === 0) {
    await db.users.add({ pin: '1234' });
  }
};

// Helper to load entries for a customer/cycle/month/year
export const loadEntries = async (customerId, cycleId, month, year) => {
  const all = await db.milkEntries
    .where('customerId').equals(customerId)
    .filter(e => e.cycleId === cycleId && e.month === month && e.year === year)
    .toArray();
  return all;
};

// Helper to get all entries for a customer in a month/year (all cycles)
export const loadAllCycleEntries = async (customerId, month, year) => {
  return db.milkEntries
    .where('customerId').equals(customerId)
    .filter(e => e.month === month && e.year === year)
    .toArray();
};
