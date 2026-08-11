import { getDB } from './db';
import { saveStudentAnswer, submitAssessmentSession } from '@/app/actions/assessmentActions';

export async function syncPendingAnswers() {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    console.log('Cannot sync, currently offline');
    return false;
  }

  const db = await getDB();
  if (!db) return false;

  const tx = db.transaction('student_answers', 'readwrite');
  const store = tx.objectStore('student_answers');
  const allAnswers = await store.getAll();
  
  const pendingAnswers = allAnswers.filter(a => a.sync_status === 'pending');
  
  if (pendingAnswers.length === 0) {
    return true; // Nothing to sync
  }

  console.log(`Syncing ${pendingAnswers.length} pending answers...`);

  let successCount = 0;
  for (const answer of pendingAnswers) {
    try {
      const result = await saveStudentAnswer(
        answer.session_id,
        answer.question_id,
        answer.answer_value
      );

      if (result.success) {
        answer.sync_status = 'synced';
        await store.put(answer);
        successCount++;
      } else {
        console.error('Failed to sync answer:', result.error);
      }
    } catch (e) {
      console.error('Error syncing answer:', e);
    }
  }

  return successCount === pendingAnswers.length;
}

export async function syncPendingSessions() {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return false;
  }

  const db = await getDB();
  if (!db) return false;

  const tx = db.transaction('assessment_sessions', 'readwrite');
  const store = tx.objectStore('assessment_sessions');
  const allSessions = await store.getAll();
  
  const pendingSessions = allSessions.filter(s => s.sync_status === 'pending');
  
  for (const session of pendingSessions) {
    if (session.status === 'completed') {
      try {
        // Need to submit session
        const res = await submitAssessmentSession(session.id, session.level_id);
        if (res.success) {
          session.sync_status = 'synced';
          await store.put(session);
        } else {
          console.error('Error syncing completed session:', res.error);
        }
      } catch (e: any) {
        console.error('Exception syncing completed session:', e);
      }
    }
  }
}

export async function runFullSync() {
  await syncPendingAnswers();
  await syncPendingSessions();
}
