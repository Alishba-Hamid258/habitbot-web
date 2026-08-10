'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Send, Plus, Sparkles, User, RefreshCw, Trash2, Archive, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface SavedSession {
  id: string;
  title: string;
  timestamp: string;
  messages: Message[];
}

const QUICK_PROMPTS = [
  { label: '⚡ Plan My Day', prompt: 'Help me design an optimal daily plan using time-blocking and habit stacking.' },
  { label: '🧠 Beat Procrastination', prompt: 'I am struggling to start a difficult task. Guide me through the 2-Minute Rule to build momentum.' },
  { label: '💪 Morning Routine', prompt: 'Design a science-backed 30-minute morning routine to maximize energy and focus.' },
  { label: '🎯 Habit Audit', prompt: 'Conduct a quick audit of my daily habits. Ask me 3 questions to identify friction points.' },
];

export default function CoachPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "👋 **Hello! I'm HabitBot**, your behavioral scientist and Atomic Habits coach.\n\nHow can I help you level up your routines, build unbreakable consistency, or conquer procrastination today?",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [archives, setArchives] = useState<SavedSession[]>([]);
  const [showArchives, setShowArchives] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Load saved archives from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('habitbot_chat_archives');
    if (saved) {
      try {
        setArchives(JSON.parse(saved));
      } catch {}
    }
  }, []);

  const saveArchivesToStorage = (updated: SavedSession[]) => {
    setArchives(updated);
    localStorage.setItem('habitbot_chat_archives', JSON.stringify(updated));
  };

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: query,
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    const assistantMsgId = (Date.now() + 1).toString();
    // Optimistically add empty assistant message to stream into
    setMessages((prev) => [...prev, { id: assistantMsgId, role: 'assistant', content: '' }]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.filter((m) => m.role !== 'system'),
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let streamedAnswer = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          streamedAnswer += chunk;

          setMessages((prev) =>
            prev.map((m) => (m.id === assistantMsgId ? { ...m, content: streamedAnswer } : m))
          );
        }
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? {
                ...m,
                content:
                  "⚠️ *Connection note*: Make sure your `GROQ_API_KEY` is added in `.env.local` to enable live LLM streaming. You can still test all local habit mechanics!",
              }
            : m
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = () => {
    // If conversation has messages beyond welcome, archive it
    if (messages.length > 2) {
      const firstUserMsg = messages.find((m) => m.role === 'user')?.content || 'Session';
      const sessionTitle = firstUserMsg.slice(0, 30) + (firstUserMsg.length > 30 ? '...' : '');

      const newArchive: SavedSession = {
        id: Date.now().toString(),
        title: sessionTitle,
        timestamp: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        messages: [...messages],
      };

      const updated = [newArchive, ...archives];
      saveArchivesToStorage(updated);
      toast.success('Current chat archived to vault 📦');
    }

    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: "👋 Ready for a fresh start! What habit or goal are we focusing on today?",
      },
    ]);
  };

  const handleResumeChat = (session: SavedSession) => {
    // Save current before resuming
    if (messages.length > 2) {
      const firstUserMsg = messages.find((m) => m.role === 'user')?.content || 'Session';
      const currentArchive: SavedSession = {
        id: Date.now().toString(),
        title: firstUserMsg.slice(0, 30) + '...',
        timestamp: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        messages: [...messages],
      };
      saveArchivesToStorage([currentArchive, ...archives.filter((a) => a.id !== session.id)]);
    } else {
      saveArchivesToStorage(archives.filter((a) => a.id !== session.id));
    }

    setMessages(session.messages);
    setShowArchives(false);
    toast.success(`🔄 Resumed session: "${session.title}"`, { icon: '💬' });
  };

  const handleDeleteArchive = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = archives.filter((a) => a.id !== id);
    saveArchivesToStorage(updated);
    toast.info('Archived session deleted.');
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Copied message to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto space-y-4">
      {/* Top Header & Actions Bar */}
      <div className="flex items-center justify-between pb-2 border-b border-white/5">
        <div>
          <h1 className="text-xl font-bold gradient-text flex items-center gap-2">
            <Bot className="w-5 h-5 text-purple-400" /> AI Habit Coach
          </h1>
          <p className="text-xs text-slate-400">Powered by Atomic Habits behavioral science</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowArchives(!showArchives)}
            className="h-8 text-xs bg-slate-900/60 border-white/10 text-slate-300 gap-1.5 rounded-lg"
          >
            <Archive className="w-3.5 h-3.5 text-purple-400" />
            <span>Vault ({archives.length})</span>
            {showArchives ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </Button>

          <Button
            size="sm"
            onClick={handleNewChat}
            className="h-8 text-xs gradient-button gap-1.5 rounded-lg shadow-md shadow-purple-500/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </Button>
        </div>
      </div>

      {/* Expandable Previous Sessions Archive */}
      <AnimatePresence>
        {showArchives && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 bg-slate-900/80 rounded-xl border border-white/10 space-y-2">
              <div className="text-xs font-semibold text-purple-300 flex items-center gap-1.5">
                <Archive className="w-3.5 h-3.5 text-purple-400" />
                <span>📜 Previous Sessions Vault</span>
              </div>

              {archives.length === 0 ? (
                <div className="text-xs text-slate-500 py-2 text-center">No archived sessions yet.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {archives.map((arch) => (
                    <div
                      key={arch.id}
                      onClick={() => handleResumeChat(arch)}
                      className="p-2.5 bg-slate-950/60 hover:bg-purple-950/20 border border-white/5 hover:border-purple-500/30 rounded-lg cursor-pointer transition-all flex items-center justify-between group"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="text-xs font-medium text-slate-200 truncate">{arch.title}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{arch.timestamp}</div>
                      </div>

                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-[10px] text-purple-300 hover:text-purple-200 hover:bg-purple-600/30 gap-1 rounded"
                        >
                          <RefreshCw className="w-2.5 h-2.5" /> Resume
                        </Button>
                        <button
                          onClick={(e) => handleDeleteArchive(arch.id, e)}
                          className="p-1 text-slate-500 hover:text-red-400 rounded transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Prompt Chips (Visible when conversation is short) */}
      {messages.length <= 2 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {QUICK_PROMPTS.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(p.prompt)}
              className="p-2.5 bg-slate-900/60 hover:bg-slate-800/80 border border-white/5 hover:border-purple-500/30 rounded-xl text-left transition-all shadow-sm group"
            >
              <div className="text-xs font-semibold text-purple-300 group-hover:text-purple-200">{p.label}</div>
              <div className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">{p.prompt}</div>
            </button>
          ))}
        </div>
      )}

      {/* Scrollable Message History Area */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar min-h-[350px]">
        {messages.map((m) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-start gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {m.role === 'assistant' && (
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 p-0.5 shrink-0 shadow-md shadow-purple-500/20">
                <div className="w-full h-full bg-slate-950 rounded-lg flex items-center justify-center">
                  <Bot className="w-4 h-4 text-purple-400" />
                </div>
              </div>
            )}

            <div
              className={`relative group max-w-[80%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed shadow-lg ${
                m.role === 'user'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-tr-sm'
                  : 'bg-slate-900/90 border border-white/10 text-slate-200 rounded-tl-sm backdrop-blur-xl'
              }`}
            >
              <div className="prose prose-invert prose-xs sm:prose-sm max-w-none break-words">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {m.content}
                </ReactMarkdown>
              </div>

              {m.role === 'assistant' && m.content && (
                <button
                  onClick={() => copyToClipboard(m.content, m.id)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-all text-[10px] flex items-center gap-1"
                >
                  {copiedId === m.id ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                </button>
              )}
            </div>

            {m.role === 'user' && (
              <div className="w-8 h-8 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center shrink-0 text-slate-300">
                <User className="w-4 h-4" />
              </div>
            )}
          </motion.div>
        ))}

        {loading && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 p-0.5 shrink-0 shadow-md">
              <div className="w-full h-full bg-slate-950 rounded-lg flex items-center justify-center">
                <Bot className="w-4 h-4 text-purple-400 animate-spin" />
              </div>
            </div>
            <div className="p-3.5 bg-slate-900/80 rounded-2xl border border-white/10 text-xs text-slate-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              <span>HabitBot is formulating actionable advice...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Fixed Bottom Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="relative flex items-center gap-2 p-2 bg-slate-900/90 rounded-2xl border border-white/10 backdrop-blur-2xl shadow-xl"
      >
        <Input
          type="text"
          placeholder="Ask HabitBot anything about your habits, routines, or focus..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          className="flex-1 bg-transparent border-0 text-white placeholder:text-slate-500 focus-visible:ring-0 text-xs sm:text-sm pl-3"
        />

        <Button
          type="submit"
          size="sm"
          disabled={!input.trim() || loading}
          className="gradient-button h-10 px-4 rounded-xl shadow-lg shadow-purple-500/20 flex items-center gap-1.5"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">Send</span>
        </Button>
      </form>
    </div>
  );
}
