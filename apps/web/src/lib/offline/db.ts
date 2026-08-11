import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface PemantikDB extends DBSchema {
  questions: {
    key: string;
    value: {
      id: string;
      level_id: string;
      content: any;
      type: string;
      options: any;
      order_index: number;
    };
    indexes: { 'by-level': string };
  };
  assessment_sessions: {
    key: string;
    value: {
      id: string;
      student_id: string;
      level_id: string;
      category_id: string;
      access_id: string;
      started_at: string;
      status: string;
      phase: string;
      attempt_number: number;
      time_spent_sec?: number;
      cheat_strikes?: number;
      sync_status?: 'synced' | 'pending';
    };
  };
  student_answers: {
    key: string; // Composite key: `${session_id}_${question_id}`
    value: {
      id: string; // The composite key
      session_id: string;
      question_id: string;
      answer_value: any;
      answered_at: string;
      sync_status: 'synced' | 'pending';
    };
    indexes: { 'by-session': string };
  };
  levels_cache: {
    key: string;
    value: {
      id: string;
      time_limit_sec: number;
      passing_threshold: number;
      level_number: number;
      question_categories: {
        id: string;
        name: string;
        subject_area: string;
      };
    };
  };
}

let dbPromise: Promise<IDBPDatabase<PemantikDB>> | null = null;

export function getDB() {
  if (typeof window === 'undefined') {
    return null; // Don't run on server
  }

  if (!dbPromise) {
    dbPromise = openDB<PemantikDB>('pemantik-offline', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('questions')) {
          const qStore = db.createObjectStore('questions', { keyPath: 'id' });
          qStore.createIndex('by-level', 'level_id');
        }
        if (!db.objectStoreNames.contains('assessment_sessions')) {
          db.createObjectStore('assessment_sessions', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('student_answers')) {
          const aStore = db.createObjectStore('student_answers', { keyPath: 'id' });
          aStore.createIndex('by-session', 'session_id');
        }
        if (!db.objectStoreNames.contains('levels_cache')) {
          db.createObjectStore('levels_cache', { keyPath: 'id' });
        }
      },
    });
  }

  return dbPromise;
}

// Utility to clear session data (optional)
export async function clearOfflineSession(sessionId: string) {
  const db = await getDB();
  if (!db) return;

  const tx = db.transaction(['student_answers', 'assessment_sessions'], 'readwrite');
  const answersStore = tx.objectStore('student_answers');
  
  const index = answersStore.index('by-session');
  const keys = await index.getAllKeys(sessionId);
  for (const key of keys) {
    await answersStore.delete(key);
  }

  await tx.objectStore('assessment_sessions').delete(sessionId);
  await tx.done;
}
