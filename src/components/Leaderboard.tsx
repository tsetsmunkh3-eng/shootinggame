/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { LeaderboardEntry, WeaponType } from '../types';
import { Trophy, Flame, RotateCcw, Swords } from 'lucide-react';

interface LeaderboardProps {
  currentScore?: number;
  levelReached?: number;
  weaponUsed?: WeaponType;
  onClose: () => void;
  onRestart?: () => void;
  readOnly?: boolean;
}

const LOCAL_STORAGE_KEY = 'pixel_shooter_leaderboard';

const DEFAULT_SCORES: LeaderboardEntry[] = [
  { id: '1', name: 'LAM', score: 149900, levelReached: 5, weaponUsed: 'RAILGUN', date: '2026-07-09' }, // Lamine Yamal
  { id: '2', name: 'LEO', score: 125200, levelReached: 5, weaponUsed: 'LASER', date: '2026-07-08' },
  { id: '3', name: 'CR7', score: 117700, levelReached: 5, weaponUsed: 'ROCKET', date: '2026-07-07' },
  { id: '4', name: 'NEY', score: 84000, levelReached: 3, weaponUsed: 'BLASTER', date: '2026-07-06' },
  { id: '5', name: 'KDB', score: 62100, levelReached: 2, weaponUsed: 'LASER', date: '2026-07-05' },
];

export default function Leaderboard({
  currentScore,
  levelReached = 1,
  weaponUsed = 'BLASTER',
  onClose,
  onRestart,
  readOnly = false,
}: LeaderboardProps) {
  const [scores, setScores] = useState<LeaderboardEntry[]>([]);
  const [name, setName] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isNewHighScore, setIsNewHighScore] = useState(false);

  useEffect(() => {
    // Load scores
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    let loadedScores: LeaderboardEntry[] = [];
    if (stored) {
      try {
        loadedScores = JSON.parse(stored);
      } catch (e) {
        loadedScores = DEFAULT_SCORES;
      }
    } else {
      loadedScores = DEFAULT_SCORES;
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEFAULT_SCORES));
    }

    // Sort scores descending
    loadedScores.sort((a, b) => b.score - a.score);
    setScores(loadedScores);

    // Check if current score qualifies for top 10
    if (currentScore !== undefined && currentScore > 0 && !readOnly) {
      const qualifies = loadedScores.length < 10 || currentScore > loadedScores[loadedScores.length - 1].score;
      setIsNewHighScore(qualifies);
    }
  }, [currentScore, readOnly]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || currentScore === undefined) return;

    const formattedName = name.trim().slice(0, 3).toUpperCase();
    const newEntry: LeaderboardEntry = {
      id: Math.random().toString(36).substr(2, 9),
      name: formattedName || 'AAA',
      score: currentScore,
      levelReached,
      weaponUsed,
      date: new Date().toISOString().split('T')[0],
    };

    const updatedScores = [...scores, newEntry];
    updatedScores.sort((a, b) => b.score - a.score);
    const trimmedScores = updatedScores.slice(0, 10); // Keep top 10

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(trimmedScores));
    setScores(trimmedScores);
    setSubmitted(true);
    setIsNewHighScore(false);
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset the leaderboard back to default legends?')) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEFAULT_SCORES));
      setScores(DEFAULT_SCORES);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-[#0c0c14]/95 text-zinc-100 max-w-md w-full mx-auto rounded-2xl border-4 border-zinc-800 shadow-2xl backdrop-blur-md font-mono select-none">
      
      {/* Retro Title banner */}
      <div className="flex items-center gap-2 mb-6">
        <Trophy className="w-8 h-8 text-yellow-400 animate-bounce" />
        <h2 className="text-3xl font-extrabold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500 uppercase drop-shadow-[0_2px_4px_rgba(234,179,8,0.3)]">
          Hall of Fame
        </h2>
        <Trophy className="w-8 h-8 text-yellow-400 animate-bounce" style={{ animationDelay: '0.2s' }} />
      </div>

      {/* New High Score Entry Screen */}
      {isNewHighScore && !submitted && currentScore !== undefined && (
        <form onSubmit={handleSubmit} className="w-full bg-[#08080c]/80 border-2 border-amber-500/50 rounded-xl p-4 mb-6 text-center animate-pulse">
          <div className="flex justify-center items-center gap-2 text-amber-400 font-bold mb-1 text-sm">
            <Flame className="w-5 h-5 text-orange-500" />
            NEW ARCADE RECORD!
          </div>
          <div className="text-2xl font-black text-yellow-300 tracking-wider mb-3">
            {currentScore.toLocaleString()} PTS
          </div>
          <div className="text-xs text-zinc-400 mb-3">
            ENTER YOUR initials (MAX 3 CHARACTERS)
          </div>
          
          <div className="flex justify-center gap-2 items-center">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 3))}
              placeholder="LAM"
              className="w-24 px-3 py-2 text-center text-2xl font-bold bg-[#08080c] border-2 border-yellow-400 text-yellow-400 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400 uppercase tracking-widest"
              required
              autoFocus
            />
            <button
              type="submit"
              className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-amber-600 text-slate-950 font-bold rounded-md hover:from-yellow-400 hover:to-amber-500 active:scale-95 transition-all text-sm uppercase cursor-pointer"
            >
              REGISTER
            </button>
          </div>
        </form>
      )}

      {/* Leaderboard list */}
      <div className="w-full bg-[#08080c] border-2 border-zinc-800 rounded-xl overflow-hidden mb-6">
        <div className="grid grid-cols-12 bg-[#0c0c14] text-zinc-400 text-[10px] font-bold uppercase py-2 px-3 tracking-wider border-b border-zinc-800">
          <span className="col-span-2 text-center">RANK</span>
          <span className="col-span-3">HERO</span>
          <span className="col-span-4 text-right">SCORE</span>
          <span className="col-span-3 text-center">STAGE</span>
        </div>

        <div className="divide-y divide-zinc-900">
          {scores.map((entry, index) => {
            const isSelf = currentScore !== undefined && entry.score === currentScore && entry.name === name.toUpperCase() && submitted;
            const rankColor = 
              index === 0 ? 'text-yellow-400 font-black' : 
              index === 1 ? 'text-zinc-300' : 
              index === 2 ? 'text-amber-600' : 'text-zinc-400';
              
            const rowBg = isSelf ? 'bg-amber-500/10' : index % 2 === 0 ? 'bg-[#08080c]' : 'bg-[#0c0c14]/30';

            return (
              <div
                key={entry.id}
                className={`grid grid-cols-12 items-center py-2.5 px-3 text-sm transition-all ${rowBg} ${isSelf ? 'border-l-4 border-yellow-400' : ''}`}
              >
                <span className={`col-span-2 text-center font-bold ${rankColor}`}>
                  {index + 1}
                </span>
                <span className="col-span-3 font-extrabold tracking-widest text-zinc-200">
                  {entry.name}
                </span>
                <span className="col-span-4 text-right font-bold text-emerald-400">
                  {entry.score.toLocaleString()}
                </span>
                <span className="col-span-3 text-center text-xs text-zinc-400">
                  {entry.levelReached === 5 ? 'CLEAR' : `LV ${entry.levelReached}`}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer controls */}
      <div className="flex w-full gap-3">
        {onRestart && (
          <button
            onClick={onRestart}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-cyan-600 to-blue-700 text-white font-bold rounded-xl hover:from-cyan-500 hover:to-blue-600 active:scale-95 transition-all text-sm uppercase shadow-lg border border-cyan-500/30 cursor-pointer"
          >
            <Swords className="w-4 h-4" />
            Play Again
          </button>
        )}
        <button
          onClick={onClose}
          className="px-4 py-3 bg-zinc-800 text-zinc-300 font-bold rounded-xl hover:bg-zinc-700 active:scale-95 transition-all text-sm uppercase border border-zinc-700 cursor-pointer"
        >
          Close
        </button>
      </div>

      <button
        onClick={handleReset}
        title="Reset High Scores"
        className="mt-4 text-[9px] text-zinc-600 hover:text-red-400 transition-colors flex items-center gap-1 uppercase tracking-wider cursor-pointer"
      >
        <RotateCcw className="w-3 h-3" />
        Reset Leaderboard
      </button>

    </div>
  );
}
