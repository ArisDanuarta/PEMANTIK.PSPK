'use client';

import React, { useState, useEffect } from 'react';

type DragDropChallengeProps = {
  options: any; // e.g. { subtype: 'fill_blank' | 'sorting' | 'matching', ... }
  initialAnswer?: string[];
  onChange: (answer: string[]) => void;
};

// Fungsi Fisher-Yates Shuffle murni
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function DragDropChallenge({ options, initialAnswer, onChange }: DragDropChallengeProps) {
  const subtype = options?.subtype || 'fill_blank';

  // State untuk Fill in the Blanks
  const [fbAnswers, setFbAnswers] = useState<(string | null)[]>([]); // Menyimpan id yang di-drop ke index blank
  const [fbBank, setFbBank] = useState<any[]>([]); // Daftar sisa kata
  
  // State untuk Sorting
  const [sortItems, setSortItems] = useState<any[]>([]); // Daftar item urut saat ini
  
  // State untuk Matching
  const [matchAnswers, setMatchAnswers] = useState<(string | null)[]>([]); // id dari right pairs
  const [matchBank, setMatchBank] = useState<any[]>([]); // Daftar sisa pasangan kanan

  // State global drag
  const [draggedItem, setDraggedItem] = useState<{ id: string, sourceIndex: number, sourceType: 'bank' | 'slot', data?: any } | null>(null);

  useEffect(() => {
    // Inisialisasi awal
    if (subtype === 'fill_blank') {
      const sentence = options.sentence || '';
      const numBlanks = (sentence.match(/___/g) || []).length;
      
      let initialFb = new Array(numBlanks).fill(null);
      let initialBank = [...(options.word_bank || [])];
      
      if (initialAnswer && initialAnswer.length === numBlanks) {
        initialFb = [...initialAnswer];
        // Hapus dari bank kata-kata yang sudah ada di jawaban
        initialBank = initialBank.filter(w => !initialAnswer.includes(w.id));
      } else {
        initialBank = shuffleArray(initialBank);
      }
      
      setFbAnswers(initialFb);
      setFbBank(initialBank);
    } 
    else if (subtype === 'sorting') {
      const items = options.items || [];
      if (initialAnswer && initialAnswer.length === items.length) {
        // Susun berdasarkan jawaban awal
        const sorted = initialAnswer.map(id => items.find((i: any) => i.id === id)).filter(Boolean);
        setSortItems(sorted);
      } else {
        setSortItems(shuffleArray(items));
      }
    } 
    else if (subtype === 'matching') {
      const pairs = options.pairs || [];
      let initialMatch = new Array(pairs.length).fill(null);
      let initialBank = pairs.map((p: any) => ({ id: p.id, text: p.right }));
      
      if (initialAnswer && initialAnswer.length === pairs.length) {
        initialMatch = [...initialAnswer];
        initialBank = initialBank.filter((w: any) => !initialAnswer.includes(w.id));
      } else {
        initialBank = shuffleArray(initialBank);
      }
      
      setMatchAnswers(initialMatch);
      setMatchBank(initialBank);
    }
  }, [options, subtype, initialAnswer]);

  // --- Handlers for Fill in the Blanks ---
  const handleFbDrop = (targetIndex: number) => {
    if (!draggedItem) return;
    
    const newAnswers = [...fbAnswers];
    const newBank = [...fbBank];

    if (draggedItem.sourceType === 'bank') {
      // Pindahkan dari bank ke slot
      const existingInSlot = newAnswers[targetIndex];
      if (existingInSlot) {
        // Tukar posisi jika slot sudah ada isinya
        const oldWord = options.word_bank.find((w: any) => w.id === existingInSlot);
        if (oldWord) newBank.push(oldWord);
      }
      newAnswers[targetIndex] = draggedItem.id;
      const bankIdx = newBank.findIndex((w: any) => w.id === draggedItem.id);
      if (bankIdx > -1) newBank.splice(bankIdx, 1);
    } else {
      // Pindahkan antar slot
      const temp = newAnswers[targetIndex];
      newAnswers[targetIndex] = draggedItem.id;
      newAnswers[draggedItem.sourceIndex] = temp;
    }

    setFbAnswers(newAnswers);
    setFbBank(newBank);
    onChange(newAnswers.map(a => a || ''));
  };

  const handleFbDropToBank = () => {
    if (!draggedItem || draggedItem.sourceType === 'bank') return;
    const newAnswers = [...fbAnswers];
    const word = options.word_bank.find((w: any) => w.id === draggedItem.id);
    
    newAnswers[draggedItem.sourceIndex] = null;
    setFbAnswers(newAnswers);
    if (word) setFbBank([...fbBank, word]);
    onChange(newAnswers.map(a => a || ''));
  };

  // --- Handlers for Sorting ---
  const handleSortDrop = (targetIndex: number) => {
    if (!draggedItem || draggedItem.sourceType !== 'slot') return;
    const newItems = [...sortItems];
    const [moved] = newItems.splice(draggedItem.sourceIndex, 1);
    newItems.splice(targetIndex, 0, moved);
    
    setSortItems(newItems);
    onChange(newItems.map(i => i.id));
  };

  // --- Handlers for Matching ---
  const handleMatchDrop = (targetIndex: number) => {
    if (!draggedItem) return;
    const newAnswers = [...matchAnswers];
    const newBank = [...matchBank];

    const allRightPairs = (options.pairs || []).map((p: any) => ({ id: p.id, text: p.right }));

    if (draggedItem.sourceType === 'bank') {
      const existingInSlot = newAnswers[targetIndex];
      if (existingInSlot) {
        const oldPair = allRightPairs.find((p: any) => p.id === existingInSlot);
        if (oldPair) newBank.push(oldPair);
      }
      newAnswers[targetIndex] = draggedItem.id;
      const bankIdx = newBank.findIndex((w: any) => w.id === draggedItem.id);
      if (bankIdx > -1) newBank.splice(bankIdx, 1);
    } else {
      const temp = newAnswers[targetIndex];
      newAnswers[targetIndex] = draggedItem.id;
      newAnswers[draggedItem.sourceIndex] = temp;
    }

    setMatchAnswers(newAnswers);
    setMatchBank(newBank);
    onChange(newAnswers.map(a => a || ''));
  };

  const handleMatchDropToBank = () => {
    if (!draggedItem || draggedItem.sourceType === 'bank') return;
    const newAnswers = [...matchAnswers];
    const allRightPairs = (options.pairs || []).map((p: any) => ({ id: p.id, text: p.right }));
    const pair = allRightPairs.find((p: any) => p.id === draggedItem.id);
    
    newAnswers[draggedItem.sourceIndex] = null;
    setMatchAnswers(newAnswers);
    if (pair) setMatchBank([...matchBank, pair]);
    onChange(newAnswers.map(a => a || ''));
  };

  // --- Renderers ---

  if (subtype === 'fill_blank') {
    const parts = (options.sentence || '').split('___');
    return (
      <div className="as-dnd-container">
        <style>{`
          .as-fb-word { display:inline-block; padding:6px 12px; background:#fff; border:2px solid #c4c6cf; border-radius:8px; font-weight:600; font-size:14px; color:#001934; cursor:grab; margin:4px; transition:all 0.2s; box-shadow:0 2px 4px rgba(0,0,0,0.05); }
          .as-fb-word:active { cursor:grabbing; transform:scale(0.95); }
          .as-fb-slot { display:inline-flex; align-items:center; justify-content:center; min-width:80px; min-height:36px; border-bottom:2px dashed #001934; background:#f0f4ff; margin:0 8px; vertical-align:middle; transition:background 0.2s; border-radius:4px 4px 0 0; }
          .as-fb-slot.filled { border-bottom:2px solid #001934; background:transparent; padding-bottom:4px; }
          .as-fb-bank { min-height:60px; padding:16px; background:#f8f9ff; border:2px dashed #adc8f2; border-radius:12px; margin-top:24px; display:flex; flex-wrap:wrap; gap:8px; }
          .as-fb-sentence { font-size:18px; line-height:2; color:#0b1c30; }
        `}</style>
        
        <div className="as-fb-sentence">
          {parts.map((part: string, i: number) => {
            if (i === parts.length - 1) return <span key={i}>{part}</span>;
            const slotId = fbAnswers[i];
            const word = slotId ? options.word_bank.find((w: any) => w.id === slotId) : null;
            
            return (
              <React.Fragment key={i}>
                <span>{part}</span>
                <span 
                  className={`as-fb-slot ${slotId ? 'filled' : ''}`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleFbDrop(i)}
                >
                  {word && (
                    <span 
                      className="as-fb-word" 
                      draggable 
                      onDragStart={() => setDraggedItem({ id: word.id, sourceIndex: i, sourceType: 'slot' })}
                    >
                      {word.text}
                    </span>
                  )}
                </span>
              </React.Fragment>
            );
          })}
        </div>

        <div className="as-fb-bank" onDragOver={(e) => e.preventDefault()} onDrop={handleFbDropToBank}>
          {fbBank.length === 0 ? (
            <div style={{color:'#6c757d', fontSize:'14px', fontStyle:'italic', width:'100%', textAlign:'center'}}>Semua kata telah digunakan</div>
          ) : (
            fbBank.map((w: any) => (
              <span 
                key={w.id} 
                className="as-fb-word" 
                draggable 
                onDragStart={() => setDraggedItem({ id: w.id, sourceIndex: -1, sourceType: 'bank' })}
              >
                {w.text}
              </span>
            ))
          )}
        </div>
      </div>
    );
  }

  if (subtype === 'sorting') {
    return (
      <div className="as-dnd-container">
        <style>{`
          .as-sort-list { display:flex; flexDirection:column; gap:8px; }
          .as-sort-item { display:flex; align-items:center; padding:12px 16px; background:#fff; border:2px solid #c4c6cf; border-radius:12px; cursor:grab; transition:all 0.2s; font-size:16px; font-weight:500; color:#0b1c30; }
          .as-sort-item:hover { border-color:#adc8f2; }
          .as-sort-item:active { cursor:grabbing; border-color:#001934; transform:scale(0.98); }
          .as-sort-handle { margin-right:12px; color:#6c757d; cursor:grab; font-size:20px; font-weight:700; display:flex; align-items:center; }
        `}</style>
        
        <div className="as-sort-list">
          {sortItems.map((item, i) => (
            <div 
              key={item.id} 
              className="as-sort-item" 
              draggable 
              onDragStart={() => setDraggedItem({ id: item.id, sourceIndex: i, sourceType: 'slot' })}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleSortDrop(i)}
            >
              <span className="as-sort-handle">⠿</span>
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (subtype === 'matching') {
    const pairs = options.pairs || [];
    const allRightPairs = pairs.map((p: any) => ({ id: p.id, text: p.right }));
    
    return (
      <div className="as-dnd-container">
        <style>{`
          .as-match-grid { display:flex; flex-direction:column; gap:12px; }
          .as-match-row { display:grid; grid-template-columns:1fr 1fr; gap:16px; align-items:center; }
          .as-match-left { padding:14px 16px; background:#f0f4ff; border:2px solid #dce9ff; border-radius:12px; font-size:15px; font-weight:600; color:#001934; text-align:center; }
          .as-match-slot { padding:14px 16px; min-height:54px; background:#f8f9ff; border:2px dashed #c4c6cf; border-radius:12px; display:flex; align-items:center; justify-content:center; }
          .as-match-slot.filled { border-style:solid; border-color:#adc8f2; padding:0; background:transparent; }
          .as-match-item { width:100%; height:100%; padding:14px 16px; background:#fff; border:2px solid #c4c6cf; border-radius:12px; font-size:15px; font-weight:500; color:#0b1c30; cursor:grab; text-align:center; box-shadow:0 2px 4px rgba(0,0,0,0.02); transition:all 0.2s; }
          .as-match-item:active { cursor:grabbing; transform:scale(0.95); }
          .as-fb-bank { min-height:80px; padding:20px; background:#f8f9ff; border:2px dashed #adc8f2; border-radius:12px; margin-top:24px; display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        `}</style>
        
        <div className="as-match-grid">
          {pairs.map((p: any, i: number) => {
            const rightId = matchAnswers[i];
            const rightPair = rightId ? allRightPairs.find((rp: any) => rp.id === rightId) : null;
            
            return (
              <div key={p.id} className="as-match-row">
                <div className="as-match-left">{p.left}</div>
                <div 
                  className={`as-match-slot ${rightId ? 'filled' : ''}`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleMatchDrop(i)}
                >
                  {rightPair ? (
                    <div 
                      className="as-match-item" 
                      draggable 
                      onDragStart={() => setDraggedItem({ id: rightPair.id, sourceIndex: i, sourceType: 'slot' })}
                    >
                      {rightPair.text}
                    </div>
                  ) : (
                    <span style={{color:'#adb5bd', fontSize:'14px'}}>Tarik ke sini</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="as-fb-bank" onDragOver={(e) => e.preventDefault()} onDrop={handleMatchDropToBank}>
          {matchBank.length === 0 ? (
            <div style={{gridColumn:'1 / -1', color:'#6c757d', fontSize:'14px', fontStyle:'italic', textAlign:'center'}}>Semua pasangan telah digunakan</div>
          ) : (
            matchBank.map((w: any) => (
              <div 
                key={w.id} 
                className="as-match-item" 
                draggable 
                onDragStart={() => setDraggedItem({ id: w.id, sourceIndex: -1, sourceType: 'bank' })}
              >
                {w.text}
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return null;
}
