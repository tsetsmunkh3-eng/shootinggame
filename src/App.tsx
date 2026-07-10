/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { GameScene, GameStats, WeaponType, WEAPONS_CONFIG } from './types';
import GameCanvas from './components/GameCanvas';
import Leaderboard from './components/Leaderboard';
import { sfx } from './audio';
import {
  Gamepad2,
  Trophy,
  Volume2,
  VolumeX,
  Play,
  HelpCircle,
  ChevronRight,
  Flame,
  Award,
  Clock,
  Skull,
  Star,
  Sparkles,
  Info
} from 'lucide-react';

export default function App() {
  const [scene, setScene] = useState<GameScene>('START');
  const [isMuted, setIsMuted] = useState(false);
  const [lastStats, setLastStats] = useState<GameStats | null>(null);
  const [liveScore, setLiveScore] = useState(0);

  const handleStartGame = () => {
    // Resume and unlock AudioContext on direct user click interaction
    sfx.resume();
    sfx.setMuted(isMuted);
    sfx.playShoot('BLASTER');
    
    setLiveScore(0);
    setScene('PLAYING');
  };

  const handleGameOver = (stats: GameStats) => {
    setLastStats(stats);
    setScene('GAMEOVER');
  };

  const handleVictory = (stats: GameStats) => {
    setLastStats(stats);
    setScene('VICTORY');
  };

  const toggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    sfx.setMuted(nextMute);
  };

  return (
    <div className="min-h-screen w-full bg-[#08080c] text-zinc-100 flex flex-col items-center justify-between p-4 relative overflow-hidden">
      
      {/* Background Star Ambient Glow */}
      <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-cyan-950/10 via-[#08080c]/0 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-96 bg-gradient-to-t from-indigo-950/5 via-[#08080c]/0 to-transparent pointer-events-none" />

      {/* Header bar */}
      <header className="w-full max-w-4xl flex items-center justify-between py-3 border-b border-zinc-800/60 z-10">
        <div className="flex items-center gap-2">
          <Gamepad2 className="w-6 h-6 text-cyan-400 animate-pulse" />
          <h1 className="text-xl font-black tracking-wider uppercase font-mono bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-indigo-400">
            Pixel Strike Arcade
          </h1>
        </div>

        {/* Lamine Yamal IDOL Quick Badge */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-full">
          <Award className="w-3.5 h-3.5 text-yellow-500" />
          <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest">
            LAMINE YAMAL GUEST SUITE
          </span>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleMute}
            className="p-2 bg-[#0c0c14] border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 active:scale-95 transition-all rounded-lg text-zinc-300"
            title={isMuted ? 'Unmute SFX' : 'Mute SFX'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>
          
          <button
            onClick={() => {
              sfx.resume();
              sfx.playShoot('LASER');
              setScene('LEADERBOARD');
            }}
            className="flex items-center gap-1.5 p-2 px-3 bg-[#0c0c14] border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 active:scale-95 transition-all rounded-lg text-xs font-bold font-mono text-yellow-400 uppercase"
          >
            <Trophy className="w-3.5 h-3.5" />
            Scores
          </button>
        </div>
      </header>

      {/* Primary Action Screen Routing */}
      <main className="w-full flex-1 flex items-center justify-center my-6 z-10">
        
        {/* SCENE: START */}
        {scene === 'START' && (
          <div className="w-full max-w-xl bg-[#0c0c14]/80 border-2 border-zinc-800 rounded-3xl p-6 sm:p-8 text-center backdrop-blur-md shadow-[0_0_50px_rgba(34,211,238,0.03)] flex flex-col items-center gap-6 animate-fade-in font-mono select-none">
            
            {/* Lamine Yamal Personal Welcome Banner */}
            <div className="w-full bg-gradient-to-r from-cyan-600/10 via-indigo-600/10 to-transparent border border-cyan-500/20 rounded-2xl p-4 text-left relative overflow-hidden">
              <div className="absolute right-3 top-3 opacity-15">
                <Sparkles className="w-16 h-16 text-cyan-400" />
              </div>
              <div className="text-xs font-bold text-cyan-400 mb-1 uppercase tracking-widest flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
                ЛАМИН ЯМАЛЫН ЗӨВЛӨГӨӨ:
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed max-w-md">
                "Сайн уу найзаа! Хөлбөмбөгт хурдан гүйлт, оновчтой дамжуулалт хэрэгтэй байдаг шиг энэ тоглоомд ч бас хурдан хариу үйлдэл хамгийн чухал. Зэвсэг бүрийн давуу талыг ашиглаж, дайснуудын сумыг бултаарай. Миний дээд амжилтыг эвдэж чадах уу? Талбайн давамгайлагч болоорой!"
              </p>
            </div>

            {/* Retro Game Title Branding */}
            <div className="relative my-2">
              <div className="absolute -inset-1 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-500 opacity-20 blur-lg animate-pulse" />
              <h2 className="text-4xl sm:text-5xl font-black tracking-widest text-white uppercase drop-shadow-[0_4px_12px_rgba(6,182,212,0.4)]">
                PIXEL STRIKE
              </h2>
              <div className="text-xs font-extrabold text-cyan-400 mt-1 uppercase tracking-widest">
                2D Arcade Shooter
              </div>
            </div>

            <p className="text-xs text-zinc-400 max-w-md">
              Сонгодог 8-бит пиксел арт график, ховор зэвсэг сайжруулалтууд болон ухаалаг удирдах систем бүхий сансрын тулаант тоглоом.
            </p>

            {/* Play Button Action */}
            <button
              onClick={handleStartGame}
              className="group relative flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black text-lg rounded-2xl hover:from-cyan-400 hover:to-blue-500 active:scale-95 transition-all shadow-xl shadow-cyan-500/15 border-2 border-cyan-300/30 uppercase tracking-wider cursor-pointer"
            >
              <Play className="w-5 h-5 fill-slate-950 text-slate-950" />
              INSERT COIN & PLAY
            </button>

            {/* Quick Guides & Help Button */}
            <div className="flex gap-4">
              <button
                onClick={() => setScene('HELP')}
                className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-white transition-colors uppercase cursor-pointer"
              >
                <HelpCircle className="w-4 h-4 text-zinc-500" />
                Weapons Guide
              </button>
              <span className="text-zinc-800">|</span>
              <button
                onClick={() => setScene('LEADERBOARD')}
                className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-white transition-colors uppercase cursor-pointer"
              >
                <Trophy className="w-4 h-4 text-zinc-500" />
                Legends Rankings
              </button>
            </div>

            {/* Keyboard visual scheme footer */}
            <div className="w-full bg-[#08080c]/60 p-3 rounded-xl border border-zinc-800/40 text-[10px] text-zinc-500 flex flex-wrap gap-x-4 gap-y-1 justify-center uppercase">
              <span><b>MOVE:</b> WASD / Arrows</span>
              <span>•</span>
              <span><b>FIRE:</b> Space / J</span>
              <span>•</span>
              <span><b>DASH:</b> L-Shift / C</span>
              <span>•</span>
              <span><b>WEAPONS:</b> 1-4 or E/Q</span>
            </div>

          </div>
        )}

        {/* SCENE: PLAYING */}
        {scene === 'PLAYING' && (
          <div className="w-full flex flex-col gap-4">
            <GameCanvas
              onGameOver={handleGameOver}
              onVictory={handleVictory}
              isMuted={isMuted}
              onScoreUpdate={setLiveScore}
            />
          </div>
        )}

        {/* SCENE: GAMEOVER */}
        {scene === 'GAMEOVER' && lastStats && (
          <div className="w-full max-w-md bg-[#0c0c14] border-4 border-red-950 rounded-3xl p-6 sm:p-8 text-center shadow-[0_0_50px_rgba(239,68,68,0.15)] flex flex-col items-center gap-5 font-mono select-none animate-bounce-short">
            
            <div className="p-3 bg-red-950/40 border-2 border-red-800/50 rounded-2xl">
              <Skull className="w-10 h-10 text-red-500 animate-pulse" />
            </div>

            <div>
              <h2 className="text-3xl font-black tracking-wider text-red-500 uppercase">
                HULL DESTROYED
              </h2>
              <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">
                SYSTEM OFFLINE • GAME OVER
              </div>
            </div>

            {/* Stats Breakdown Card */}
            <div className="w-full bg-[#08080c] p-4 rounded-xl border border-zinc-800 divide-y divide-zinc-900 text-sm">
              <div className="flex justify-between py-2 border-b border-zinc-900">
                <span className="text-zinc-500 uppercase text-xs">FINAL SCORE</span>
                <span className="text-yellow-400 font-bold">{lastStats.score.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-zinc-900">
                <span className="text-zinc-500 uppercase text-xs">STAGE REACHED</span>
                <span className="text-zinc-300 font-bold">LV 0{lastStats.currentLevel}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-zinc-900">
                <span className="text-zinc-500 uppercase text-xs">ENEMIES DOWN</span>
                <span className="text-zinc-300 font-bold">{lastStats.enemiesKilled} SHIPS</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-zinc-500 uppercase text-xs">TIME IN COMBAT</span>
                <span className="text-zinc-300 font-bold">{lastStats.timePlayed} SECS</span>
              </div>
            </div>

            {/* Embedded Leaderboard to easily insert name */}
            <Leaderboard
              currentScore={lastStats.score}
              levelReached={lastStats.currentLevel}
              onClose={() => setScene('START')}
              onRestart={handleStartGame}
            />
          </div>
        )}

        {/* SCENE: VICTORY */}
        {scene === 'VICTORY' && lastStats && (
          <div className="w-full max-w-md bg-[#0c0c14] border-4 border-yellow-900/40 rounded-3xl p-6 sm:p-8 text-center shadow-[0_0_50px_rgba(234,179,8,0.15)] flex flex-col items-center gap-5 font-mono select-none">
            
            <div className="p-3 bg-yellow-950/40 border-2 border-yellow-800/50 rounded-2xl relative">
              <Star className="w-10 h-10 text-yellow-400 fill-yellow-400 animate-spin" style={{ animationDuration: '6s' }} />
              <Sparkles className="w-4 h-4 text-cyan-400 absolute -top-1 -right-1 animate-pulse" />
            </div>

            <div>
              <h2 className="text-3xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500 uppercase">
                HERO VICTORIOUS
              </h2>
              <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mt-1">
                SYSTEMS ONLINE • MISSION COMPLETE
              </div>
            </div>

            {/* Lamine Congrats */}
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 text-xs text-emerald-300 leading-relaxed text-left w-full">
              <b>ЛАМИНААС УРАМШИЛ:</b><br />
              "Ялалтад баяр хүргэе найзаа! Чи үнэхээр дээд зэрэглэлийн тоглолтыг харууллаа. Маш уян хатан хөдөлгөөн, гайхалтай оновчтой шидэлтүүд! Дараагийн шатанд дээд амжилтаа улам ахиулаарай!"
            </div>

            {/* Stats Breakdown Card */}
            <div className="w-full bg-[#08080c] p-4 rounded-xl border border-zinc-800 divide-y divide-zinc-900 text-sm">
              <div className="flex justify-between py-2 border-b border-zinc-900">
                <span className="text-zinc-500 uppercase text-xs">ULTIMATE SCORE</span>
                <span className="text-yellow-400 font-extrabold text-base">{lastStats.score.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-zinc-900">
                <span className="text-zinc-500 uppercase text-xs">STAGE COMPLETED</span>
                <span className="text-zinc-300 font-bold">ALL CLEARED</span>
              </div>
              <div className="flex justify-between py-2 border-b border-zinc-900">
                <span className="text-zinc-500 uppercase text-xs">ENEMIES CRUSHED</span>
                <span className="text-zinc-300 font-bold">{lastStats.enemiesKilled} SHIPS</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-zinc-500 uppercase text-xs">COMPLETION TIME</span>
                <span className="text-zinc-300 font-bold">{lastStats.timePlayed} SECS</span>
              </div>
            </div>

            {/* Embedded Leaderboard to save hero stats */}
            <Leaderboard
              currentScore={lastStats.score}
              levelReached={3}
              onClose={() => setScene('START')}
              onRestart={handleStartGame}
            />
          </div>
        )}

        {/* SCENE: LEADERBOARD DISPLAY */}
        {scene === 'LEADERBOARD' && (
          <Leaderboard
            onClose={() => setScene('START')}
            onRestart={handleStartGame}
            readOnly={true}
          />
        )}

        {/* SCENE: HELP / WEAPONS GUIDE */}
        {scene === 'HELP' && (
          <div className="w-full max-w-2xl bg-[#0c0c14] border border-zinc-800 rounded-3xl p-6 sm:p-8 font-mono select-none animate-fade-in">
            <div className="flex items-center gap-2 mb-4 border-b border-zinc-800 pb-3">
              <Info className="w-5 h-5 text-cyan-400" />
              <h2 className="text-xl font-bold uppercase tracking-wider text-zinc-100">
                Weapons Codex & Manual
              </h2>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed mb-6">
              Устгагдсан дайснуудаас унадаг гэрэлтдэг хайрцгуудыг цуглуулж зэвсгээ сайжруулаарай. Сонгосон зэвсгээ олон удаа авснаар түүний түвшин дээшилж (Макс 3), улам их хор хөнөөл учруулдаг.
            </p>

            {/* Grid of Weapons stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {(Object.keys(WEAPONS_CONFIG) as WeaponType[]).map((key) => {
                const w = WEAPONS_CONFIG[key];
                return (
                  <div key={key} className="p-4 bg-[#08080c] border border-zinc-800/80 rounded-2xl flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span
                        className="font-black text-xs px-2 py-0.5 rounded uppercase tracking-wider text-slate-950"
                        style={{ backgroundColor: w.color }}
                      >
                        {w.name}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-bold uppercase">SPD: {1000 / w.fireRate}/S</span>
                    </div>
                    <p className="text-[11px] text-zinc-300 leading-relaxed">
                      {w.description}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1 text-[10px] text-zinc-500">
                      <span>BASE DAMAGE:</span>
                      <span className="text-red-400 font-bold">{w.damage} hp</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Mechanics Guides */}
            <div className="bg-[#08080c] border border-zinc-800 p-4 rounded-2xl mb-6">
              <h3 className="text-xs font-bold text-zinc-400 mb-2 uppercase tracking-widest">ADVANCED TACTICAL MANEUVERS</h3>
              <ul className="text-[11px] text-zinc-300 space-y-2 list-disc list-inside">
                <li><b className="text-cyan-400">Dash (Shift / C):</b> Provides complete damage immunity for a short window while dashing. Use it to escape bullet-hell traps!</li>
                <li><b className="text-blue-400">Shield Core:</b> Shields block all incoming damage automatically. It regenerates slowly over time if you stay safe.</li>
                <li><b className="text-amber-500">Arc Railgun (Chaining):</b> Chained lightning can leap up to 180px between adjacent scouts. Highly effective against waves.</li>
              </ul>
            </div>

            <button
              onClick={() => setScene('START')}
              className="w-full py-3 bg-zinc-800 text-zinc-300 font-bold rounded-xl hover:bg-zinc-700 active:scale-95 transition-all text-xs uppercase cursor-pointer"
            >
              Return To Base
            </button>
          </div>
        )}

      </main>

      {/* Footer copyright */}
      <footer className="w-full max-w-4xl text-center py-4 border-t border-zinc-800/40 text-[9px] text-zinc-600 font-mono uppercase tracking-widest z-10 flex flex-wrap justify-between gap-2">
        <span>© 2026 PIXEL STRIKE INC • ALL RIGHTS RESERVED</span>
        <span>DESIGNED WITH RETRO PIXEL PRECISION</span>
      </footer>

    </div>
  );
}
