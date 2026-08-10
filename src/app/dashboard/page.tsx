'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Send, Plus, Sparkles, User, RefreshCw, Trash2, Archive, Copy, Check, Paperclip, X, Image as ImageIcon, Cpu, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getActiveUser, getUserScopedData, setUserScopedData } from '@/lib/auth-storage';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  imagePreview?: string;
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
      content: "👋 **Hello! I'm HabitBot**, your behavioral scientist and Atomic Habits coach.\n\nI can stream responses with **Groq** or **Google Gemini**, analyze schedule photos with Vision, and help you design peak routines. What are we optimizing today?",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<'groq' | 'gemini'>('groq');
  const [attachedImage, setAttachedImage] = useState<{ mimeType: string; base64: string; preview: string } | null>(null);

  const [archives, setArchives] = useState<SavedSession[]>([]);
  const [showArchives, setShowArchives] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [currentUser, setCurrentUser] = useState<{ id: number; username: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Load user-scoped archives from storage
  useEffect(() => {
    const active = getActiveUser();
    if (active) {
      setCurrentUser(active);
      const userArchives = getUserScopedData<SavedSession[]>(active.id, 'chat_archives', []);
      setArchives(userArchives);
    }
  }, []);

  const saveArchivesToStorage = (updated: SavedSession[]) => {
    setArchives(updated);
    if (currentUser) {
      setUserScopedData(currentUser.id, 'chat_archives', updated);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid image file (PNG, JPG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      setAttachedImage({
        mimeType: file.type,
        base64,
        preview: result,
      });
      setSelectedProvider('gemini');
      toast.success('Image attached! Switched engine to Google Gemini Vision 👁️');
    };
    reader.readAsDataURL(file);
  };

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if ((!query && !attachedImage) || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: query || 'Analyze this image and give actionable habit/routine advice.',
      imagePreview: attachedImage?.preview,
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    const imagePayload = attachedImage ? { mimeType: attachedImage.mimeType, base64: attachedImage.base64 } : undefined;
    setAttachedImage(null);
    setLoading(true);

    const assistantMsgId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, { id: assistantMsgId, role: 'assistant', content: '' }]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.filter((m) => m.role !== 'system').map((m) => ({ role: m.role, content: m.content })),
          provider: selectedProvider,
          image: imagePayload,
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
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? {
                ...m,
                content:
                  `⚠️ *Engine note*: Make sure your \`${selectedProvider === 'gemini' ? 'GEMINI_API_KEY' : 'GROQ_API_KEY'}\` is set in \`.env.local\` or Vercel settings.`,
              }
            : m
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = () => {
    if (messages.length > 2) {
      const firstUserMsg = messages.find((m) => m.role === 'user')?.content || 'Session';
      const sessionTitle = firstUserMsg.slice(0, 35) + (firstUserMsg.length > 35 ? '...' : '');

      const newArchive: SavedSession = {
        id: Date.now().toString(),
        title: sessionTitle,
        timestamp: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        messages: [...messages],
      };

      const updated = [newArchive, ...archives];
      saveArchivesToStorage(updated);
      toast.success('Current chat saved to Vault 📦');
    }

    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: "👋 Ready for a fresh start! What habit or routine are we tackling?",
      },
    ]);
  };

  const handleResumeChat = (session: SavedSession) => {
    // If current conversation has substance, archive it before resuming
    if (messages.length > 2) {
      const firstUserMsg = messages.find((m) => m.role === 'user')?.content || 'Session';
      const currentArchive: SavedSession = {
        id: Date.now().toString(),
        title: firstUserMsg.slice(0, 35) + '...',
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
    toast.info('Archived session deleted from vault.');
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Copied message to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto space-y-3">
      {/* Top Header & Engine Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-white/5">
        <div>
          <h1 className="text-xl font-bold gradient-text flex items-center gap-2">
            <Bot className="w-5 h-5 text-purple-400" /> AI Habit Coach
          </h1>
          <p className="text-[11px] text-slate-400">Atomic Habits science with dual Groq & Gemini Vision engines</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Engine Selector Toggle */}
          <div className="flex items-center bg-slate-900/80 p-0.5 rounded-lg border border-white/5 text-[11px]">
            <button
              onClick={() => setSelectedProvider('groq')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
                selectedProvider === 'groq' ? 'bg-purple-600/30 text-purple-200 border border-purple-500/30' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Cpu className="w-3 h-3 text-purple-400" /> Groq (Fast)
            </button>
            <button
              onClick={() => setSelectedProvider('gemini')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
                selectedProvider === 'gemini' ? 'bg-cyan-600/30 text-cyan-200 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3 h-3 text-cyan-400" /> Gemini Vision
            </button>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowArchives(true)}
            className="h-8 text-xs bg-slate-900/60 hover:bg-slate-800 border-white/10 text-slate-200 gap-1.5 rounded-lg shadow-sm"
          >
            <Archive className="w-3.5 h-3.5 text-purple-400" />
            <span>Vault ({archives.length})</span>
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

      {/* Spacious Glass Vault Dialog Modal */}
      <Dialog open={showArchives} onOpenChange={setShowArchives}>
        <DialogContent className="max-w-4xl w-[92vw] bg-slate-950/95 border border-white/10 text-white rounded-2xl p-6 sm:p-7 shadow-2xl backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold gradient-text flex items-center gap-2">
              <Archive className="w-5 h-5 text-purple-400" />
              <span>Previous Coaching Sessions Vault</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Review and resume your saved conversation history anytime with one click.
            </DialogDescription>
          </DialogHeader>

          {archives.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Archive className="w-10 h-10 text-slate-600 mx-auto" />
              <div className="text-sm font-semibold text-slate-300">Your Vault is Empty</div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Whenever you finish a coaching session and click <b>+ New Chat</b>, your conversation will be safely saved here!
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[480px] overflow-y-auto py-2 pr-1 custom-scrollbar">
              {archives.map((arch) => (
                <div
                  key={arch.id}
                  className="p-4 bg-slate-900/80 hover:bg-slate-900 border border-white/5 hover:border-purple-500/30 rounded-xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group shadow-sm"
                >
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-semibold text-white group-hover:text-purple-200 transition-colors leading-snug">
                        {arch.title}
                      </h4>
                      <span className="text-[10px] font-semibold text-purple-300 bg-purple-950/70 border border-purple-500/30 px-2 py-0.5 rounded-full shrink-0">
                        {arch.messages.length} messages
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                      <Clock className="w-3.5 h-3.5 text-purple-400" />
                      <span>{arch.timestamp}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <Button
                      size="sm"
                      onClick={() => handleResumeChat(arch)}
                      className="h-8 px-4 text-xs gradient-button gap-1.5 rounded-lg shadow-sm"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Resume Chat</span>
                    </Button>

                    <button
                      onClick={(e) => handleDeleteArchive(arch.id, e)}
                      className="p-2 text-slate-500 hover:text-red-400 rounded-lg hover:bg-red-950/20 transition-colors"
                      title="Delete session"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Quick Prompt Chips */}
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

      {/* Message History */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar min-h-[340px]">
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
              {m.imagePreview && (
                <div className="mb-2.5 rounded-lg overflow-hidden border border-white/20 max-w-xs">
                  <img src={m.imagePreview} alt="Attached context" className="w-full h-auto object-cover" />
                </div>
              )}

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
              <span>HabitBot ({selectedProvider === 'gemini' ? 'Gemini Vision' : 'Groq'}) is formulating advice...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Image Preview Floating Pill */}
      {attachedImage && (
        <div className="flex items-center gap-2 p-2 bg-slate-900/90 border border-purple-500/30 rounded-xl max-w-fit shadow-lg">
          <ImageIcon className="w-4 h-4 text-cyan-400" />
          <span className="text-xs text-slate-200">Image attached for Gemini Vision</span>
          <button onClick={() => setAttachedImage(null)} className="text-slate-400 hover:text-red-400 p-0.5">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Input Form with Attachment Button */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="relative flex items-center gap-2 p-2 bg-slate-900/90 rounded-2xl border border-white/10 backdrop-blur-2xl shadow-xl"
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageUpload}
          accept="image/*"
          className="hidden"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title="Upload habit chart / schedule image for Gemini Vision"
          className="p-2 rounded-xl text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        <Input
          type="text"
          placeholder="Ask HabitBot anything about your habits, routines, or focus..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          className="flex-1 bg-transparent border-0 text-white placeholder:text-slate-500 focus-visible:ring-0 text-xs sm:text-sm pl-1"
        />

        <Button
          type="submit"
          size="sm"
          disabled={(!input.trim() && !attachedImage) || loading}
          className="gradient-button h-10 px-4 rounded-xl shadow-lg shadow-purple-500/20 flex items-center gap-1.5"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">Send</span>
        </Button>
      </form>
    </div>
  );
}
