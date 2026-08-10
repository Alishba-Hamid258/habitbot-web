'use client';

import React from 'react';
import { Library, BookOpen, Film, ExternalLink, Play, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

const BOOKS = [
  {
    title: 'Atomic Habits',
    author: 'James Clear',
    category: 'Habit Systems',
    desc: 'An easy & proven way to build good habits and break bad ones. The foundational text for HabitBot.',
    link: 'https://jamesclear.com/atomic-habits',
  },
  {
    title: 'Deep Work',
    author: 'Cal Newport',
    category: 'Focus & Flow',
    desc: 'Rules for focused success in a distracted world. Master intense, uninterrupted productivity.',
    link: 'https://calnewport.com/deep-work-rules-for-focused-success-in-a-distracted-world/',
  },
  {
    title: 'Tiny Habits',
    author: 'BJ Fogg, PhD',
    category: 'Behavior Design',
    desc: 'The small changes that change everything by the founder of Stanford’s Behavior Design Lab.',
    link: 'https://tinyhabits.com/book/',
  },
  {
    title: 'Make Time',
    author: 'Jake Knapp & John Zeratsky',
    category: 'Time Optimization',
    desc: 'How to focus on what matters every day, from former Google design sprint creators.',
    link: 'https://maketime.blog/',
  },
];

const MASTERCLASSES = [
  {
    title: 'How to Build & Break Habits Science-Backed',
    speaker: 'Andrew Huberman, Ph.D.',
    duration: '1h 50m',
    id: 'WxFQYn_Wk_4',
  },
  {
    title: 'Atomic Habits Masterclass & 1% Rule',
    speaker: 'James Clear',
    duration: '45 mins',
    id: 'U_nzqnXWvSo',
  },
];

export default function LibraryPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold gradient-text flex items-center gap-2">
          <Library className="w-5 h-5 text-purple-400" /> Behavioral Mastery Library
        </h1>
        <p className="text-xs text-slate-400">Curated high-performance literature and video masterclasses</p>
      </div>

      {/* Essential Reading Grid */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-purple-300">
          <BookOpen className="w-4 h-4 text-purple-400" />
          <span>📖 Core Behavioral Books</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {BOOKS.map((b, i) => (
            <div
              key={i}
              className="p-4 bg-slate-900/60 hover:bg-slate-900/90 border border-white/5 hover:border-purple-500/30 rounded-xl transition-all space-y-2 group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">
                    {b.title}
                  </h3>
                  <p className="text-[11px] text-slate-400">by {b.author}</p>
                </div>
                <span className="text-[10px] font-mono bg-purple-950/60 text-purple-300 border border-purple-500/20 px-2 py-0.5 rounded">
                  {b.category}
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">{b.desc}</p>

              <div className="pt-1">
                <a
                  href={b.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 font-medium"
                >
                  <span>Explore Book</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Mastery Theater Video Grid */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-cyan-300">
          <Film className="w-4 h-4 text-cyan-400" />
          <span>🎬 Mastery Theater & Video Lectures</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {MASTERCLASSES.map((v, i) => (
            <div key={i} className="p-3.5 bg-slate-900/60 rounded-xl border border-white/5 space-y-2">
              <div className="relative aspect-video rounded-lg overflow-hidden border border-white/10 bg-black">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${v.id}`}
                  title={v.title}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>

              <div>
                <h4 className="text-xs font-bold text-white truncate">{v.title}</h4>
                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5">
                  <span>{v.speaker}</span>
                  <span className="font-mono">{v.duration}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
