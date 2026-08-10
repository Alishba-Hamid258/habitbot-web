'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Library, BookOpen, Film, Video, ExternalLink, Play, Check, Sparkles, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { extractYouTubeId } from '@/lib/utils';
import { toast } from 'sonner';

type LibraryTab = 'books' | 'theater' | 'customPlayer';

const BOOKS = [
  {
    title: 'The Power of Habit',
    author: 'Charles Duhigg',
    category: 'Habit Loops',
    desc: 'Why we do what we do in life and business. Explores the cue, routine, and reward cycle.',
    link: 'https://archive.org/details/the-power-of-habit-charles-duhigg',
    icon: '🔄',
  },
  {
    title: 'Think and Grow Rich',
    author: 'Napoleon Hill',
    category: 'Mindset & Drive',
    desc: 'The timeless classic on developing unstoppable mental desire and goal persistence.',
    link: 'https://archive.org/details/thinkandgrowrich00hill',
    icon: '💰',
  },
  {
    title: 'As a Man Thinketh',
    author: 'James Allen',
    category: 'Thought Architecture',
    desc: 'A philosophical masterpiece on how daily thoughts sculpt character and circumstance.',
    link: 'https://www.gutenberg.org/ebooks/4507',
    icon: '🧠',
  },
  {
    title: 'The Science of Getting Rich',
    author: 'Wallace D. Wattles',
    category: 'Focused Action',
    desc: 'The foundational mental science behind purposeful achievement and high performance.',
    link: 'https://www.gutenberg.org/ebooks/59832',
    icon: '📈',
  },
  {
    title: 'The Power of Concentration',
    author: 'Theron Q. Dumont',
    category: 'Deep Attention',
    desc: 'Practical exercises to train and strengthen your focus muscle against distractions.',
    link: 'https://www.gutenberg.org/ebooks/49214',
    icon: '🎯',
  },
  {
    title: 'Deep Work',
    author: 'Cal Newport',
    category: 'Flow State',
    desc: 'Rules for focused success in a distracted world. Master intense, high-value output.',
    link: 'https://openlibrary.org/works/OL17841393W/Deep_Work',
    icon: '🧪',
  },
];

const MASTERCLASSES = [
  {
    title: 'Atomic Habits Animated Summary',
    speaker: 'James Clear Insights',
    url: 'https://www.youtube.com/watch?v=PZ7lDrwYdZc',
    id: 'PZ7lDrwYdZc',
  },
  {
    title: 'Deep Work Masterclass',
    speaker: 'Cal Newport Principles',
    url: 'https://www.youtube.com/watch?v=3E7hkPZ-HTk',
    id: '3E7hkPZ-HTk',
  },
  {
    title: 'The Science of Habits & Neuroplasticity',
    speaker: 'Behavioral Science',
    url: 'https://www.youtube.com/watch?v=Wcs2PFz5q6g',
    id: 'Wcs2PFz5q6g',
  },
  {
    title: 'Forget Big Change (Tiny Habits)',
    speaker: 'BJ Fogg, PhD',
    url: 'https://www.youtube.com/watch?v=AdKUJxjn-R8',
    id: 'AdKUJxjn-R8',
  },
  {
    title: 'Optimal Daily Routine Design',
    speaker: 'High Performance Coaching',
    url: 'https://www.youtube.com/watch?v=S9DdUhLLdlM',
    id: 'S9DdUhLLdlM',
  },
];

export default function LibraryPage() {
  const [activeTab, setActiveTab] = useState<LibraryTab>('books');
  const [customUrl, setCustomUrl] = useState('');
  const [activeVideoId, setActiveVideoId] = useState('jfKfPfyJRdk');

  useEffect(() => {
    const saved = localStorage.getItem('habitbot_active_video');
    if (saved) {
      setCustomUrl(saved);
      const vidId = extractYouTubeId(saved);
      if (vidId) setActiveVideoId(vidId);
    }
  }, []);

  const handleApplyCustomVideo = (e: React.FormEvent) => {
    e.preventDefault();
    const vidId = extractYouTubeId(customUrl);
    if (!vidId) {
      toast.error('Please enter a valid YouTube video link.');
      return;
    }

    setActiveVideoId(vidId);
    localStorage.setItem('habitbot_active_video', customUrl);

    // Log to media history
    try {
      const savedHist = localStorage.getItem('habitbot_media_history');
      const hist = savedHist ? JSON.parse(savedHist) : [];
      hist.push({
        date: new Date().toISOString().split('T')[0],
        url: customUrl,
        title: `YouTube Video (${vidId})`,
      });
      localStorage.setItem('habitbot_media_history', JSON.stringify(hist));
    } catch {}

    toast.success('Custom focus video loaded! Also playing continuously in the sidebar.');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold gradient-text flex items-center gap-2">
          <Library className="w-5 h-5 text-purple-400" /> Behavioral Mastery Library
        </h1>
        <p className="text-xs text-slate-400">Curated free literature, habit masterclasses, and distraction-free custom media player</p>
      </div>

      {/* Sub Tabs Bar */}
      <div className="flex items-center gap-1.5 p-1.5 bg-slate-900/80 rounded-xl border border-white/5 max-w-fit">
        <button
          onClick={() => setActiveTab('books')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
            activeTab === 'books' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>📖 Essential Books</span>
        </button>

        <button
          onClick={() => setActiveTab('theater')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
            activeTab === 'theater' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Film className="w-3.5 h-3.5" />
          <span>🎥 Mastery Theater</span>
        </button>

        <button
          onClick={() => setActiveTab('customPlayer')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
            activeTab === 'customPlayer' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Video className="w-3.5 h-3.5" />
          <span>🎬 Custom Player</span>
        </button>
      </div>

      {/* TAB 1: ESSENTIAL BOOKS */}
      {activeTab === 'books' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="text-xs font-semibold text-purple-300">📖 The Habit Blueprint (100% Free Online Reading)</div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {BOOKS.map((b, i) => (
              <div
                key={i}
                className="p-4 bg-slate-900/60 hover:bg-slate-900/90 border border-white/5 hover:border-purple-500/30 rounded-xl transition-all space-y-2.5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{b.icon}</span>
                      <div>
                        <h3 className="text-sm font-bold text-white">{b.title}</h3>
                        <p className="text-[11px] text-slate-400">by {b.author}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono bg-purple-950/60 text-purple-300 border border-purple-500/20 px-2 py-0.5 rounded">
                      {b.category}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">{b.desc}</p>
                </div>

                <div className="pt-2 border-t border-white/5 flex justify-end">
                  <a
                    href={b.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 bg-cyan-950/40 hover:bg-cyan-950/70 border border-cyan-500/30 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <span>Read Free Online</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* TAB 2: MASTERY THEATER */}
      {activeTab === 'theater' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="text-xs font-semibold text-cyan-300">🎥 Curated Habit & High-Performance Masterclasses</div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {MASTERCLASSES.map((v, i) => (
              <div key={i} className="p-4 bg-slate-900/60 rounded-xl border border-white/5 space-y-2.5">
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
                  <p className="text-[10px] text-slate-400">{v.speaker}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* TAB 3: CUSTOM MEDIA PLAYER */}
      {activeTab === 'customPlayer' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="p-5 bg-slate-900/60 rounded-xl border border-white/5 space-y-4">
            <div>
              <div className="text-sm font-semibold text-white flex items-center gap-2">
                <Video className="w-4 h-4 text-purple-400" />
                <span>Distraction-Free Focus Media Player</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Paste any YouTube study stream, binaural focus beats, or habit lecture. It will play here <b>and</b> keep playing uninterrupted in the sidebar across all tabs!
              </p>
            </div>

            <form onSubmit={handleApplyCustomVideo} className="flex gap-2">
              <Input
                type="text"
                placeholder="https://www.youtube.com/watch?v=..."
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                className="flex-1 bg-slate-950/80 border-white/10 text-white text-xs"
              />
              <Button type="submit" size="sm" className="gradient-button text-xs px-5 rounded-lg">
                Load & Play
              </Button>
            </form>

            {/* Video Player Display */}
            {activeVideoId && (
              <div className="space-y-2 pt-2">
                <div className="relative aspect-video max-w-2xl mx-auto rounded-xl overflow-hidden border border-white/10 bg-black shadow-2xl">
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${activeVideoId}?autoplay=1&enablejsapi=1`}
                    title="Custom Focus Stream"
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                <div className="text-center text-xs text-emerald-400 font-medium">
                  ✅ Active in Global Sidebar — You can switch to Coach, Tasks, or Analytics and this soundtrack continues playing!
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
