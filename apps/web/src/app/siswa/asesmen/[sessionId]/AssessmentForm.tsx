'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  sessionId, levelData, categoryData, questions, initialAnswers, session 
}: AssessmentFormProps) {
  const router = useRouter();
  const isOnline = useOnlineStatus();
  const totalQuestions = questions.length || 1;
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>(() => {
    const map: Record<string, any> = {};
    initialAnswers.forEach(a => { map[a.question_id] = a.answer_data; });
    return map;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const timeLimitSec = levelData?.time_limit_sec || 3600;
  // Start with full time to avoid SSR hydration mismatch
  const [timeLeft, setTimeLeft] = useState<number>(timeLimitSec);
  const [timerReady, setTimerReady] = useState(false);
  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDone, setRecordingDone] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [audioPlayback, setAudioPlayback] = useState<string | null>(null);

  // Sync real timer client-side after mount (fixes SSR hydration mismatch)
  useEffect(() => {
    if (session.started_at) {
      const started = new Date(session.started_at).getTime();
      const diffSec = Math.floor((Date.now() - started) / 1000);
      const remain = timeLimitSec - diffSec;
      setTimeLeft(remain > 0 ? remain : 0);
    }
    setTimerReady(true);
  }, []); // eslint-disable-line

  useEffect(() => {
    if (!timerReady) return;
    if (timeLeft <= 0) { handleFinish(); return; }
    const timer = setInterval(() => setTimeLeft(p => p > 1 ? p - 1 : 0), 1000);
    return () => clearInterval(timer);
  }, [timerReady, timeLeft]);

  useEffect(() => {
    async function initOffline() {
      const db = await getDB();
      if (!db) return;
      const tx = db.transaction(['questions', 'assessment_sessions', 'levels_cache'], 'readwrite');
      for (const q of questions) await tx.objectStore('questions').put(q);
      await tx.objectStore('assessment_sessions').put({ ...session, sync_status: 'synced' });
      if (levelData) await tx.objectStore('levels_cache').put(levelData);
      await tx.done;
    }
    initOffline();
  }, []); // eslint-disable-line

  useEffect(() => { if (isOnline) runFullSync(); }, [isOnline]);

  const formatTime = (s: number) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;

  const currentQuestion = questions[currentQIndex];
  const selectedAnswer = currentQuestion ? answers[currentQuestion.id] : null;

  const handleSelectAnswer = async (value: any) => {
    if (!currentQuestion || isSaving || isSubmitting) return;
    setIsSaving(true);
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: value }));
    try {
      const db = await getDB();
      if (db) await db.put('student_answers', { id: `${sessionId}_${currentQuestion.id}`, session_id: sessionId, question_id: currentQuestion.id, answer_value: value, answered_at: new Date().toISOString(), sync_status: 'pending' });
      if (isOnline) {
        const res = await saveStudentAnswer(sessionId, currentQuestion.id, value);
        if (res?.success && db) {
          const tx = db.transaction('student_answers', 'readwrite');
          const store = tx.objectStore('student_answers');
          const a = await store.get(`${sessionId}_${currentQuestion.id}`);
          if (a) { a.sync_status = 'synced'; await store.put(a); }
        }
      }
    } catch(e) { console.error(e); }
    setIsSaving(false);
  };

  const handleNext = () => { if (currentQIndex < totalQuestions - 1) setCurrentQIndex(p => p + 1); };
  const handlePrev = () => { if (currentQIndex > 0) setCurrentQIndex(p => p - 1); };
  const handleFinish = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (isOnline) { await submitAssessmentSession(sessionId, levelData.id); }
      else {
        const db = await getDB();
        if (db) {
          const tx = db.transaction('assessment_sessions', 'readwrite');
          const store = tx.objectStore('assessment_sessions');
          const s = await store.get(sessionId);
          if (s) { s.status = 'completed'; s.sync_status = 'pending'; await store.put(s); }
        }
        router.push(`/siswa/asesmen/${sessionId}/hasil`);
      }
    } catch (e) {
      alert('Gagal mengirim hasil. Hasil disimpan lokal.');
      router.push(`/siswa/asesmen/${sessionId}/hasil`);
      setIsSubmitting(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      audioChunksRef.current = [];
      mr.ondataavailable = e => audioChunksRef.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioPlayback(URL.createObjectURL(blob));
        setRecordingDone(true);
        handleSelectAnswer('voice_recorded');
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      setIsRecording(true);
    } catch { alert('Tidak dapat mengakses mikrofon.'); }
  };
  const stopRecording = () => { mediaRecorderRef.current?.stop(); setIsRecording(false); };

  const answeredCount = Object.keys(answers).length;
  const progressPercent = Math.round((answeredCount / totalQuestions) * 100);
  const isDanger = timeLeft < 300;

  if (!currentQuestion) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui', background: '#f8f9ff' }}>
      <div style={{ textAlign: 'center', padding: '48px', background: '#fff', borderRadius: '24px', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
        <h2 style={{ fontSize: '20px', color: '#001934', marginBottom: '8px' }}>Tidak Ada Soal</h2>
        <p style={{ color: '#74777f', fontSize: '14px' }}>Soal untuk level ini belum tersedia atau belum dipublikasikan.</p>
      </div>
    </div>
  );

  const qType = currentQuestion.question_type as string;
  
  // ── Parse options based on actual JSONB structure ──
  // multiple_choice/audio_question/video_question: options = string[]
  // image_choice: options = [{url, label}]
  // drag_drop: options = {subtype, ...}
  const rawOptions = currentQuestion.options || [];
  const mcOptions = (qType === 'multiple_choice' || qType === 'audio_question' || qType === 'video_question')
    ? (Array.isArray(rawOptions) ? rawOptions as string[] : [])
    : [];
  const imgOptions = qType === 'image_choice'
    ? (Array.isArray(rawOptions) ? rawOptions as Array<{url: string; label: string}> : [])
    : [];

  // ── Shared MC radio list component ──
  const McList = ({ opts }: { opts: string[] }) => (
    <div className="as-mc-grid">
      {opts.map((optText, i) => {
        const isSelected = selectedAnswer === optText;
        const lbl = String.fromCharCode(65 + i);
        return (
          <label key={i} className="as-mc-label">
            <input className="as-mc-radio" type="radio" name={`q_${currentQuestion.id}`} value={optText} checked={isSelected} onChange={() => handleSelectAnswer(optText)} disabled={isSaving} />
            <div className="as-mc-card">
              <div className="as-indicator">{isSelected && <span className="material-symbols-outlined" style={{fontSize:'14px',color:'#fff'}}>check</span>}</div>
              <span className="as-mc-text">{optText || `Pilihan ${lbl}`}</span>
            </div>
          </label>
        );
      })}
    </div>
  );

  return (
    <>
      <style>{`
        .as-page{min-height:100vh;background-image:radial-gradient(circle at top right,#e5eeff 0%,#f8f9ff 50%,#eff4ff 100%);background-attachment:fixed;background-color:#f8f9ff;font-family:var(--font-rubik,system-ui,sans-serif);color:#0b1c30;display:flex;flex-direction:column;}
        .as-header{position:fixed;top:0;left:0;right:0;z-index:50;height:72px;display:flex;justify-content:center;background:rgba(248,249,255,.95);backdrop-filter:blur(10px);border-bottom:1px solid rgba(196,198,207,.3);box-shadow:0 2px 12px rgba(16,46,80,.06);}
        .as-header-inner{width:100%;max-width:1280px;display:flex;align-items:center;justify-content:space-between;padding:0 20px;gap:16px;}
        @media(min-width:768px){.as-header-inner{padding:0 40px;}}
        .as-brand{display:flex;align-items:center;gap:8px;font-family:var(--font-noto-serif,Georgia,serif);font-size:20px;font-weight:700;color:#001934;flex-shrink:0;}
        .as-sync-badge{display:none;align-items:center;gap:6px;padding:4px 12px;border-radius:999px;font-size:13px;font-weight:500;color:#74777f;background:#eff4ff;border:1px solid #c4c6cf;}
        @media(min-width:768px){.as-sync-badge{display:flex;}}
        .as-dot{width:6px;height:6px;border-radius:50%;background:#10B981;}
        .as-dot.saving{background:#feba48;} .as-dot.offline{background:#74777f;}
        .as-progress-wrap{display:none;flex:1;max-width:400px;flex-direction:column;gap:6px;}
        @media(min-width:768px){.as-progress-wrap{display:flex;}}
        .as-prog-row{display:flex;justify-content:space-between;font-size:13px;}
        .as-prog-label{color:#74777f;} .as-prog-pct{color:#001934;font-weight:700;}
        .as-prog-bg{height:8px;background:#ffddb0;border-radius:999px;overflow:hidden;}
        .as-prog-fill{height:100%;background:#feba48;border-radius:999px;transition:width .4s;}
        .as-actions{display:flex;align-items:center;gap:12px;}
        .as-timer{display:flex;align-items:center;gap:6px;background:#feba48;color:#714b00;padding:8px 14px;border-radius:8px;font-size:20px;font-weight:700;min-width:96px;justify-content:center;}
        .as-timer.danger{background:#ffdad6;color:#93000a;}
        .as-grid-btn{width:38px;height:38px;border-radius:50%;border:none;cursor:pointer;background:#e5eeff;color:#43474e;display:flex;align-items:center;justify-content:center;transition:background .15s;}
        .as-grid-btn:hover{background:#dce9ff;}
        .as-main{flex:1;margin-top:72px;padding:20px;display:flex;justify-content:center;align-items:flex-start;}
        @media(min-width:768px){.as-main{padding:32px 40px;}}
        .as-card{width:100%;max-width:960px;background:#fff;border-radius:24px;box-shadow:0 8px 32px rgba(16,46,80,.1);border-top:4px solid #feba48;overflow:hidden;display:flex;flex-direction:column;margin-top:16px;}
        .as-card-body{padding:28px 24px;flex:1;}
        @media(min-width:768px){.as-card-body{padding:40px 48px;}}
        .as-q-meta{display:flex;align-items:center;gap:10px;margin-bottom:12px;}
        .as-q-num{width:30px;height:30px;border-radius:50%;background:#e5eeff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#001934;}
        .as-q-cat{font-size:12px;font-weight:600;color:#74777f;text-transform:uppercase;letter-spacing:.06em;}
        .as-q-instruction{font-size:15px;color:#43474e;margin-bottom:12px;font-style:italic;}
        .as-q-text{font-family:var(--font-noto-serif,Georgia,serif);font-size:22px;font-weight:600;color:#001934;line-height:1.4;margin-bottom:20px;}
        @media(min-width:768px){.as-q-text{font-size:28px;}}
        .as-q-image{margin-bottom:20px;border-radius:12px;overflow:hidden;border:1px solid #e5eeff;}
        .as-q-image img{width:100%;height:auto;display:block;object-fit:contain;max-height:360px;}
        /* MC */
        .as-mc-grid{display:grid;grid-template-columns:1fr;gap:12px;margin-bottom:24px;}
        @media(min-width:600px){.as-mc-grid{grid-template-columns:1fr 1fr;}}
        .as-mc-label{display:block;cursor:pointer;}
        .as-mc-radio{position:absolute;opacity:0;width:0;height:0;}
        .as-mc-card{display:flex;align-items:flex-start;gap:14px;padding:14px 16px;border:2px solid #c4c6cf;border-radius:14px;background:#fff;transition:border-color .15s,background .15s;}
        .as-mc-label:hover .as-mc-card{border-color:#adc8f2;background:#f5f8ff;}
        .as-mc-radio:checked~.as-mc-card{border-color:#001934;background:#eaf0ff;}
        .as-indicator{width:22px;height:22px;flex-shrink:0;border:2px solid #74777f;border-radius:50%;display:flex;align-items:center;justify-content:center;transition:all .15s;margin-top:2px;}
        .as-mc-radio:checked~.as-mc-card .as-indicator{background:#feba48;border-color:#feba48;}
        .as-mc-text{font-size:16px;font-weight:500;color:#0b1c30;line-height:1.5;}
        /* Image Choice */
        .as-ic-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px;}
        @media(max-width:480px){.as-ic-grid{grid-template-columns:1fr;}}
        .as-ic-label{display:block;cursor:pointer;}
        .as-ic-radio{position:absolute;opacity:0;width:0;height:0;}
        .as-ic-card{border:2px solid #c4c6cf;border-radius:14px;overflow:hidden;background:#fff;transition:border-color .15s,box-shadow .15s;position:relative;}
        .as-ic-label:hover .as-ic-card{border-color:#adc8f2;}
        .as-ic-radio:checked~.as-ic-card{border-color:#001934;box-shadow:0 0 0 1px #001934;}
        .as-ic-img{width:100%;height:180px;object-fit:cover;display:block;}
        .as-ic-placeholder{height:180px;background:#e5eeff;display:flex;align-items:center;justify-content:center;font-size:40px;font-weight:700;color:#001934;}
        .as-ic-footer{display:flex;align-items:center;gap:10px;padding:10px 14px;background:#f8f9ff;}
        .as-ic-radio:checked~.as-ic-card .as-indicator{background:#feba48;border-color:#feba48;}
        .as-ic-text{font-size:14px;font-weight:600;color:#001934;}
        /* Media */
        .as-media-wrap{background:#f0f4ff;border:2px solid #dce9ff;border-radius:16px;padding:24px;display:flex;flex-direction:column;gap:16px;align-items:center;margin-bottom:24px;}
        .as-media-icon{font-size:48px !important;color:#001934;}
        .as-media-label{font-size:15px;font-weight:600;color:#001934;text-align:center;}
        .as-audio-player,.as-vr-playback{width:100%;max-width:480px;}
        .as-video-wrap{background:#000;border-radius:16px;overflow:hidden;border:2px solid #dce9ff;margin-bottom:24px;}
        .as-video-player{width:100%;max-height:400px;display:block;}
        .as-vr-btn{width:72px;height:72px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:transform .15s,box-shadow .15s;}
        .as-vr-btn.start{background:#001934;color:#fff;} .as-vr-btn.stop{background:#ba1a1a;color:#fff;}
        .as-vr-btn:hover{transform:scale(1.06);box-shadow:0 4px 16px rgba(0,0,0,.18);}
        /* Footer */
        .as-footer{background:#e5eeff;border-top:1px solid rgba(196,198,207,.3);padding:20px 24px;display:flex;justify-content:space-between;align-items:center;gap:12px;}
        @media(min-width:768px){.as-footer{padding:24px 48px;}}
        @media(max-width:480px){.as-footer{flex-direction:column-reverse;}.as-btn-prev,.as-btn-next,.as-btn-finish{width:100%;justify-content:center;}}
        .as-btn-prev{display:flex;align-items:center;gap:6px;background:transparent;border:none;cursor:pointer;font-size:14px;font-weight:700;color:#001934;padding:12px 20px;border-radius:999px;transition:background .15s;font-family:inherit;}
        .as-btn-prev:hover:not(:disabled){background:#dce9ff;} .as-btn-prev:disabled{color:#74777f;cursor:not-allowed;opacity:.5;}
        .as-btn-next,.as-btn-finish{display:flex;align-items:center;gap:8px;border:none;cursor:pointer;border-radius:999px;font-size:14px;font-weight:700;padding:14px 36px;transition:all .15s;font-family:inherit;}
        .as-btn-next{background:#001934;color:#fff;} .as-btn-next:hover{background:#102e50;} .as-btn-next:active{transform:scale(.97);}
        .as-btn-finish{background:#10B981;color:#fff;} .as-btn-finish:hover{filter:brightness(.92);} .as-btn-finish:disabled{background:#c4c6cf;cursor:not-allowed;}
      `}</style>

      <div className="as-page">
        <header className="as-header">
          <div className="as-header-inner">
            <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
              <div className="as-brand">
                <span className="material-symbols-outlined" style={{color:'#feba48',fontVariationSettings:"'FILL' 1",fontSize:'24px'}}>local_fire_department</span>
                Pemantik
              </div>
              <div className="as-sync-badge">
                <div className={`as-dot${isSaving?' saving':!isOnline?' offline':''}`}></div>
                <span>{!isOnline?'Offline: Ready':isSaving?'Menyimpan...':'Tersimpan (Sinkron)'}</span>
              </div>
            </div>
            <div className="as-progress-wrap">
              <div className="as-prog-row">
                <span className="as-prog-label">Soal {currentQIndex+1} dari {totalQuestions}</span>
                <span className="as-prog-pct">{progressPercent}%</span>
              </div>
              <div className="as-prog-bg"><div className="as-prog-fill" style={{width:`${progressPercent}%`}}></div></div>
            </div>
            <div className="as-actions">
              <div className={`as-timer${isDanger?' danger':''}`} suppressHydrationWarning>
                <span className="material-symbols-outlined" style={{fontVariationSettings:"'FILL' 1",fontSize:'20px'}}>timer</span>
                <span suppressHydrationWarning>{formatTime(timeLeft)}</span>
              </div>
              <button aria-label="Peta Soal" className="as-grid-btn">
                <span className="material-symbols-outlined" style={{fontSize:'20px'}}>grid_view</span>
              </button>
            </div>
          </div>
        </header>

        <main className="as-main">
          <div className="as-card">
            <div className="as-card-body">
              {/* Meta */}
              <div className="as-q-meta">
                <span className="as-q-num">{currentQIndex+1}</span>
                <span className="as-q-cat">{categoryData?.subject_area==='literasi'?'Literasi':'Numerasi'}</span>
                <span className="as-q-cat" style={{color:'#adc8f2'}}>·</span>
                <span className="as-q-cat">{qType.replace(/_/g,' ')}</span>
              </div>

              {/* Instruction (optional) */}
              {currentQuestion.question_instruction && (
                <p className="as-q-instruction">{currentQuestion.question_instruction}</p>
              )}

              {/* Question Text */}
              {currentQuestion.question_text && (
                <h2 className="as-q-text" dangerouslySetInnerHTML={{__html: currentQuestion.question_text}}></h2>
              )}

              {/* Question Image (stimulus for MC) */}
              {currentQuestion.question_image_url && qType !== 'image_choice' && (
                <div className="as-q-image"><img src={currentQuestion.question_image_url} alt="Gambar Soal" /></div>
              )}

              {/* ═══ MULTIPLE CHOICE ═══ */}
              {qType === 'multiple_choice' && mcOptions.length > 0 && <McList opts={mcOptions} />}

              {/* ═══ IMAGE CHOICE ═══ */}
              {qType === 'image_choice' && imgOptions.length > 0 && (
                <div className="as-ic-grid">
                  {imgOptions.map((opt, i) => {
                    const isSelected = selectedAnswer === opt.url;
                    const lbl = String.fromCharCode(65 + i);
                    return (
                      <label key={i} className="as-ic-label">
                        <input className="as-ic-radio" type="radio" name={`q_${currentQuestion.id}`} value={opt.url} checked={isSelected} onChange={() => handleSelectAnswer(opt.url)} disabled={isSaving} />
                        <div className="as-ic-card">
                          {opt.url
                            ? <img className="as-ic-img" src={opt.url} alt={opt.label || `Pilihan ${lbl}`} />
                            : <div className="as-ic-placeholder">{lbl}</div>
                          }
                          <div className="as-ic-footer">
                            <div className="as-indicator">{isSelected && <span className="material-symbols-outlined" style={{fontSize:'14px',color:'#fff'}}>check</span>}</div>
                            <span className="as-ic-text">{opt.label || `Pilihan ${lbl}`}</span>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}

              {/* ═══ AUDIO QUESTION ═══ */}
              {qType === 'audio_question' && (
                <>
                  <div className="as-media-wrap">
                    <span className="material-symbols-outlined as-media-icon" style={{fontVariationSettings:"'FILL' 1"}}>headphones</span>
                    <p className="as-media-label">Dengarkan audio berikut, lalu jawab soal di bawahnya.</p>
                    {currentQuestion.question_audio_url
                      ? <audio className="as-audio-player" controls src={currentQuestion.question_audio_url}>Browser tidak mendukung audio.</audio>
                      : <p style={{color:'#74777f',fontStyle:'italic',fontSize:'14px'}}>File audio tidak tersedia.</p>
                    }
                  </div>
                  {mcOptions.length > 0 && <McList opts={mcOptions} />}
                </>
              )}

              {/* ═══ VIDEO QUESTION ═══ */}
              {qType === 'video_question' && (
                <>
                  {currentQuestion.question_video_url
                    ? <div className="as-video-wrap"><video className="as-video-player" controls src={currentQuestion.question_video_url}>Browser tidak mendukung video.</video></div>
                    : <div className="as-media-wrap"><span className="material-symbols-outlined as-media-icon">videocam_off</span><p className="as-media-label" style={{color:'#74777f'}}>File video tidak tersedia.</p></div>
                  }
                  {mcOptions.length > 0 && <McList opts={mcOptions} />}
                </>
              )}

              {/* ═══ VOICE RECORDING ═══ */}
              {qType === 'voice_recording' && (
                <div className="as-media-wrap">
                  <span className="material-symbols-outlined as-media-icon" style={{fontVariationSettings:"'FILL' 1"}}>mic</span>
                  <p className="as-media-label">
                    {recordingDone ? '✅ Rekaman tersimpan! Kamu bisa merekam ulang jika perlu.' : isRecording ? '🔴 Sedang merekam...' : 'Tekan tombol untuk mulai merekam jawaban suara kamu.'}
                  </p>
                  <button type="button" onClick={isRecording ? stopRecording : startRecording} className={`as-vr-btn${isRecording?' stop':' start'}`}>
                    <span className="material-symbols-outlined" style={{fontSize:'32px',fontVariationSettings:"'FILL' 1"}}>{isRecording?'stop':'mic'}</span>
                  </button>
                  {audioPlayback && <audio className="as-vr-playback" controls src={audioPlayback}>Browser tidak mendukung audio.</audio>}
                </div>
              )}

              {/* ═══ DRAG DROP ═══ (shown as unsupported on web for now) */}
              {qType === 'drag_drop' && (
                <div style={{padding:'24px',background:'#fff3cd',borderRadius:'12px',color:'#856404',fontSize:'14px',lineHeight:'1.6'}}>
                  ⚠️ Soal tipe <strong>Drag & Drop</strong> tidak dapat ditampilkan di versi web. Gunakan aplikasi mobile untuk mengerjakan soal ini.
                </div>
              )}

              {/* ═══ UNSUPPORTED ═══ */}
              {!['multiple_choice','image_choice','audio_question','video_question','voice_recording','drag_drop'].includes(qType) && (
                <div style={{padding:'24px',background:'#fff3cd',borderRadius:'12px',color:'#856404',fontSize:'14px'}}>
                  ⚠️ Format soal <strong>{qType}</strong> belum didukung di versi web ini.
                </div>
              )}
            </div>

            <div className="as-footer">
              <button type="button" onClick={handlePrev} disabled={currentQIndex===0} className="as-btn-prev">
                <span className="material-symbols-outlined" style={{fontSize:'20px'}}>arrow_back</span>
                Sebelumnya
              </button>
              {currentQIndex < totalQuestions-1
                ? <button type="button" onClick={handleNext} className="as-btn-next">Lanjut<span className="material-symbols-outlined" style={{fontSize:'20px'}}>arrow_forward</span></button>
                : <button type="button" onClick={handleFinish} disabled={isSubmitting} className="as-btn-finish">
                    {isSubmitting ? 'Memproses...' : 'Selesai & Kumpulkan'}
                    <span className="material-symbols-outlined" style={{fontSize:'20px'}}>check_circle</span>
                  </button>
              }
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
