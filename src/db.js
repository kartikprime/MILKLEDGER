import Dexie from 'dexie';

// We use Dexie (IndexedDB wrapper) for local storage that can scale.
// To move to Firebase later, you just need to replace these DB calls with Firestore calls.
export const db = new Dexie('MilkledgerDB');

db.version(1).stores({
  users: '++id, pin', // For simplicity: just storing a pin locally
  customers: '++id, name, rate, fixedFat, createdAt',
  milkEntries: '++id, customerId, date, period, weight, fat, inOutWeight, finalWeight, amount, cycleId' 
});

export const initDb = async () => {
    const userCount = await db.users.count();
    if (userCount === 0) {
        // Default PIN is 1234
        await db.users.add({ pin: '1234' });
    }
};
