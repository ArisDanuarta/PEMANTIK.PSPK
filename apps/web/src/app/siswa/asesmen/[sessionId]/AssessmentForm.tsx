'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { saveStudentAnswer, submitAssessmentSession } from '@/app/actions/assessmentActions';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { getDB } from '@/lib/offline/db';
import { runFullSync } from '@/lib/offline/sync';

interface AssessmentFormProps {
  sessionId: string;
  levelData: any;
  categoryData: any;
  questions: any[];
  initialAnswers: any[];
  session: any;
}

export default function AssessmentForm({ 
  sessionId, 
  levelData, 
  categoryData, 
  questions, 
  initialAnswers, 
  session 
}: AssessmentFormProps) {
  const router = useRouter();
  const isOnline = useOnlineStatus();
  
  const totalQuestions = questions.length || 1;
  const [currentQIndex, setCurrentQIndex] = useState(0);
  
  // Map of question_id -> selected answer value
  const [answers, setAnswers] = useState<Record<string, any>>(() => {
    const map: Record<string, any> = {};
    initialAnswers.forEach(a => {
      map[a.question_id] = a.answer_data;
    });
    return map;
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Calculate Time Left
  const timeLimitSec = levelData?.time_limit_sec || 3600;
  
  const [timeLeft, setTimeLeft] = useState<number>(() => {
    if (!session.started_at) return timeLimitSec;
    const started = new Date(session.started_at).getTime();
    const now = new Date().getTime();
    const diffSec = Math.floor((now - started) / 1000);
    const remain = timeLimitSec - diffSec;
    return remain > 0 ? remain : 0;
  });

  useEffect(() => {
    if (timeLeft <= 0) {
      handleFinish(); // Auto submit when time is up
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  useEffect(() => {
    async function initOffline() {
      const db = await getDB();
      if (!db) return;
      
      const tx = db.transaction(['questions', 'assessment_sessions', 'levels_cache'], 'readwrite');
      const qStore = tx.objectStore('questions');
      for (const q of questions) {
        await qStore.put(q);
      }
      
      await tx.objectStore('assessment_sessions').put({
        ...session,
        sync_status: 'synced',
      });
      
      if (levelData) {
        await tx.objectStore('levels_cache').put(levelData);
      }
      
      await tx.done;
    }
    initOffline();
  }, [questions, session, levelData]);

  useEffect(() => {
    if (isOnline) {
      runFullSync();
    }
  }, [isOnline]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const currentQuestion = questions[currentQIndex];
  const selectedAnswer = currentQuestion ? answers[currentQuestion.id] : null;

  const handleSelectAnswer = async (value: any) => {
    if (!currentQuestion || isSaving || isSubmitting) return;
    
    setIsSaving(true);
    // Optimistic update
    setAnswers((prev: Record<string, any>) => ({
      ...prev,
      [currentQuestion.id]: value
    }));

    // Server Action or IndexedDB
    try {
      const db = await getDB();
      if (db) {
        await db.put('student_answers', {
          id: `${sessionId}_${currentQuestion.id}`,
          session_id: sessionId,
          question_id: currentQuestion.id,
          answer_value: value,
          answered_at: new Date().toISOString(),
          sync_status: 'pending'
        });
      }

      if (isOnline) {
        const res = await saveStudentAnswer(sessionId, currentQuestion.id, value);
        if (res && res.success && db) {
           const tx = db.transaction('student_answers', 'readwrite');
           const store = tx.objectStore('student_answers');
           const a = await store.get(`${sessionId}_${currentQuestion.id}`);
           if (a) {
             a.sync_status = 'synced';
             await store.put(a);
           }
        }
      }
    } catch(e) {
      console.error(e);
    }
    setIsSaving(false);
  };

  const handleNext = () => {
    if (currentQIndex < totalQuestions - 1) {
      setCurrentQIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentQIndex > 0) {
      setCurrentQIndex(prev => prev - 1);
    }
  };

  const handleFinish = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (isOnline) {
        await submitAssessmentSession(sessionId, levelData.id);
      } else {
        const db = await getDB();
        if (db) {
          const tx = db.transaction('assessment_sessions', 'readwrite');
          const store = tx.objectStore('assessment_sessions');
          const s = await store.get(sessionId);
          if (s) {
            s.status = 'completed';
            s.sync_status = 'pending';
            await store.put(s);
          }
        }
        router.push(`/siswa/asesmen/${sessionId}/hasil`);
      }
    } catch (e) {
      console.error(e);
      alert('Gagal mengirim hasil secara online. Hasil disimpan lokal.');
      router.push(`/siswa/asesmen/${sessionId}/hasil`);
      setIsSubmitting(false);
    }
  };

  const answeredCount = Object.keys(answers).length;
  const progressPercent = Math.round((answeredCount / totalQuestions) * 100);

  if (!currentQuestion) {
    return <div className="p-10 text-center">Tidak ada soal.</div>;
  }

  // Type of question (currently handling multiple_choice primarily)
  const isMultipleChoice = currentQuestion.question_type === 'multiple_choice';
  const options = currentQuestion.options as Array<{id: string, text?: string, image_url?: string}>;

  return (
    <div className="min-h-screen bg-surface-bright text-on-surface font-sans flex flex-col" style={{ backgroundImage: 'radial-gradient(circle at top right, var(--color-surface-container) 0%, var(--color-surface-bright) 50%, var(--color-surface-container-low) 100%)', backgroundAttachment: 'fixed' }}>
      
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-5 md:px-10 h-20 max-w-[1280px] left-1/2 -translate-x-1/2 shadow-md bg-surface-container-lowest">
        <div className="flex items-center gap-4">
          <div className="font-serif text-2xl font-bold text-secondary-container flex items-center gap-2">
            <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
            <span className="hidden md:inline text-primary">Pemantik</span>
          </div>
          
          <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-surface-container-low rounded-full ml-4 border border-outline-variant">
            <div className={`w-[6px] h-[6px] rounded-full ${!isOnline ? 'bg-outline' : (isSaving ? 'bg-secondary-container animate-pulse' : 'bg-success')}`}></div>
            <span className="font-sans text-sm font-medium text-outline">
              {!isOnline ? 'Offline (Tersimpan Lokal)' : (isSaving ? 'Menyimpan...' : 'Tersimpan (Sinkron)')}
            </span>
          </div>
        </div>
        
        {/* Center Progress Bar */}
        <div className="hidden md:flex flex-col items-center justify-center flex-1 max-w-md mx-8">
          <div className="flex justify-between w-full mb-2">
            <span className="font-sans text-sm font-medium text-outline">Soal {currentQIndex + 1} dari {totalQuestions}</span>
            <span className="font-sans text-sm font-bold text-primary">{progressPercent}% Terjawab</span>
          </div>
          <div className="w-full h-3 bg-secondary-fixed rounded-full overflow-hidden">
            <div className="h-full bg-secondary-container rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
          </div>
        </div>
        
        <div className="flex items-center gap-4 md:gap-6">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-sans text-lg md:text-xl font-bold shadow-sm ${timeLeft < 300 ? 'bg-error-container text-on-error-container' : 'bg-secondary-container text-on-secondary-container'}`}>
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>timer</span>
            <span>{formatTime(timeLeft)}</span>
          </div>
          <button aria-label="Question Grid" className="flex items-center justify-center w-10 h-10 rounded-full text-on-surface-variant hover:text-secondary transition-colors bg-surface-container hover:bg-surface-container-high">
            <span className="material-symbols-outlined">grid_view</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 mt-20 p-5 md:p-10 flex justify-center items-start">
        <div className="w-full max-w-[1000px] bg-surface-container-lowest rounded-[24px] shadow-level-1 overflow-hidden border-t-4 border-secondary-container relative mt-8 flex flex-col">
          
          <div className="p-6 md:p-12 flex-1">
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-4">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-surface-container text-primary font-bold font-sans text-sm">
                  {currentQIndex + 1}
                </span>
                <span className="font-sans text-sm font-medium text-outline uppercase tracking-wider">
                  {categoryData?.subject_area === 'literasi' ? 'Literasi' : 'Numerasi'}
                </span>
              </div>
              
              {currentQuestion.question_image_url && (
                 <div className="mb-6 rounded-xl overflow-hidden max-w-2xl border border-surface-container">
                   <img src={currentQuestion.question_image_url} alt="Gambar Soal" className="w-full h-auto object-contain" />
                 </div>
              )}
              
              <h2 className="font-serif text-2xl md:text-3xl font-bold text-primary mb-6 whitespace-pre-line" dangerouslySetInnerHTML={{ __html: currentQuestion.question_text || '' }}>
              </h2>
            </div>
            
            {/* Answer Options */}
            {isMultipleChoice && options && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {options.map((opt, i) => {
                  const isSelected = selectedAnswer === opt.id;
                  const label = String.fromCharCode(65 + i); // A, B, C, D
                  return (
                    <label key={opt.id} className="relative cursor-pointer group">
                      <input 
                        className="peer sr-only" 
                        name={`question_${currentQuestion.id}`} 
                        type="radio" 
                        value={opt.id} 
                        checked={isSelected}
                        onChange={() => handleSelectAnswer(opt.id)}
                        disabled={isSaving}
                      />
                      <div className={`h-full border-2 rounded-xl p-4 transition-all duration-200 flex flex-col gap-4 bg-surface-container-lowest hover:border-inverse-primary group-hover:bg-surface-container-low ${isSelected ? 'border-primary bg-surface-container' : 'border-outline-variant'}`}>
                        {opt.image_url && (
                          <div className="w-full h-48 rounded-lg overflow-hidden relative border border-surface-container">
                            <img className="w-full h-full object-cover" alt={`Option ${label}`} src={opt.image_url} />
                          </div>
                        )}
                        <div className="flex items-center gap-4">
                          <div className={`w-6 h-6 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-secondary-container border-secondary-container' : 'border-outline'}`}>
                            {isSelected && <span className="material-symbols-outlined text-on-secondary-container text-[16px] font-bold">check</span>}
                          </div>
                          <span className="font-sans text-lg font-medium text-on-surface" dangerouslySetInnerHTML={{ __html: opt.text || label }}></span>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            {!isMultipleChoice && (
               <div className="p-6 bg-surface-bright border border-inverse-primary rounded-xl">
                 <p className="text-on-surface-variant italic">Format soal ini ({currentQuestion.question_type}) belum didukung di tampilan ini.</p>
               </div>
            )}
            
          </div>
          
          {/* Bottom Action Area */}
          <div className="bg-surface-container p-6 md:p-8 flex justify-between border-t border-outline-variant/30 mt-auto">
            <button 
              onClick={handlePrev}
              disabled={currentQIndex === 0}
              className={`font-sans text-sm font-bold py-4 px-8 rounded-full flex items-center gap-2 transition-colors ${currentQIndex === 0 ? 'text-outline cursor-not-allowed opacity-50' : 'text-primary hover:bg-surface-container-high'}`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>arrow_back</span>
              Sebelumnya
            </button>

            {currentQIndex < totalQuestions - 1 ? (
              <button 
                onClick={handleNext}
                className="bg-primary text-on-primary font-sans text-sm font-bold py-4 px-12 rounded-[24px] hover:bg-primary-container hover:shadow-lg transition-all duration-200 flex items-center gap-2 active:scale-95"
              >
                Selanjutnya
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>arrow_forward</span>
              </button>
            ) : (
              <button 
                onClick={handleFinish}
                disabled={isSubmitting}
                className={`text-white font-sans text-sm font-bold py-4 px-12 rounded-[24px] flex items-center gap-2 transition-all duration-200 ${isSubmitting ? 'bg-outline cursor-not-allowed' : 'bg-success hover:brightness-95 hover:shadow-lg active:scale-95'}`}
              >
                {isSubmitting ? 'Memproses...' : 'Selesai & Kumpulkan'}
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>check_circle</span>
              </button>
            )}
          </div>
          
        </div>
      </main>
    </div>
  );
}
