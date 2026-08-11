'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Send,
  Plus,
  Sparkles,
  User,
  RefreshCw,
  Trash2,
  Archive,
  Copy,
  Check,
  Paperclip,
  X,
  Image as ImageIcon,
  Cpu,
  Clock,
  HelpCircle,
  BookOpen,
  CheckCircle2,
  Headphones,
  CheckSquare,
  FileSpreadsheet,
  FileText,
  FileUp,
  KeyRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getActiveUser, getUserScopedData, setUserScopedData } from '@/lib/auth-storage';
import { extractTextFromFile, extractTextFromImage } from '@/lib/document-parser';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  fullPrompt?: string;
  imagePreview?: string;
  imagePayload?: { mimeType: string; base64: string };
  documentInfo?: { name: string; size: string };
}

interface AttachedFile {
  name: string;
  type: 'image' | 'document';
  mimeType: string;
  size: string;
  preview?: string;
  textData?: string;
  base64?: string;
}

interface SavedSession {
  id: string;
  title: string;
  timestamp: string;
  messages: Message[];
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: 'welcome',
    role: 'assistant',
    content:
      '👋 **Greetings! I am HabitBot**, your adaptive behavioral coach.\n\nI can help you build atomic habits, overcome procrastination, design routines, and audit your daily schedule. What goal are we conquering today?',
  },
];

const QUICK_PROMPTS = [
  { label: '⚡ Plan My Day', prompt: 'Help me design an optimal daily plan using time-blocking and habit stacking.' },
  { label: '🧠 Beat Procrastination', prompt: 'I am struggling to start a difficult task. Guide me through the 2-Minute Rule to build momentum.' },
  { label: '🎯 Habit Audit', prompt: 'Conduct a quick audit of my daily habits. Ask me 3 questions to identify friction points.' },
];

export default function DashboardPage() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<'groq' | 'gemini'>('groq');
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);

  const [archives, setArchives] = useState<SavedSession[]>([]);
  const [showArchives, setShowArchives] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [currentUser, setCurrentUser] = useState<{ id: number; username: string; avatar?: string } | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Load user-scoped archives, active chat state, and profile from storage
  const loadUserData = () => {
    const active = getActiveUser();
    if (active) {
      setCurrentUser(active);
      const userArchives = getUserScopedData<SavedSession[]>(active.id, 'chat_archives', []);
      setArchives(userArchives);

      const savedSessionId = getUserScopedData<string>(active.id, 'active_session_id', `session_${Date.now()}`);
      setCurrentSessionId(savedSessionId);

      // Restore active ongoing chat if user refreshes page or switches tabs
      const savedActiveMessages = getUserScopedData<Message[]>(active.id, 'active_chat_messages', []);
      if (savedActiveMessages && savedActiveMessages.length > 1) {
        setMessages(savedActiveMessages);
      }

      // Check if user has seen onboarding tour
      const onboardedKey = `habitbot_onboarded_user_${active.id}`;
      const hasSeen = localStorage.getItem(onboardedKey);
      if (!hasSeen) {
        setShowOnboardingModal(true);
      }
    }
  };

  useEffect(() => {
    loadUserData();
    window.addEventListener('habitbot_user_profile_updated', loadUserData);
    return () => window.removeEventListener('habitbot_user_profile_updated', loadUserData);
  }, []);

  const saveArchivesToStorage = (updated: SavedSession[]) => {
    setArchives(updated);
    if (currentUser) {
      setUserScopedData(currentUser.id, 'chat_archives', updated);
    }
  };

  // Sync active chat session into Vault (updates existing session in-place with latest timestamp)
  const syncSessionToVault = (msgs: Message[], sessId: string, user: { id: number } | null) => {
    if (!user || msgs.length <= 1) return;

    setUserScopedData(user.id, 'active_chat_messages', msgs);
    setUserScopedData(user.id, 'active_session_id', sessId);

    const firstUserMsg = msgs.find((m) => m.role === 'user')?.content || 'Coaching Session';
    const sessionTitle = firstUserMsg.slice(0, 38) + (firstUserMsg.length > 38 ? '...' : '');
    const nowStr = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    setArchives((prevArchives) => {
      const existingIndex = prevArchives.findIndex((a) => a.id === sessId);
      let updated: SavedSession[];
      if (existingIndex >= 0) {
        updated = [...prevArchives];
        updated[existingIndex] = {
          ...updated[existingIndex],
          title: sessionTitle,
          timestamp: nowStr,
          messages: msgs,
        };
      } else {
        const newSession: SavedSession = {
          id: sessId,
          title: sessionTitle,
          timestamp: nowStr,
          messages: msgs,
        };
        updated = [newSession, ...prevArchives];
      }
      setUserScopedData(user.id, 'chat_archives', updated);
      return updated;
    });
  };

  // Dedicated Image Upload Handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setShowAttachmentMenu(false);

    const fileSizeKb = Math.round(file.size / 1024);
    const sizeStr = fileSizeKb > 1024 ? `${(fileSizeKb / 1024).toFixed(1)} MB` : `${fileSizeKb} KB`;

    const reader = new FileReader();
    reader.onload = async () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      setAttachedFile({
        name: file.name,
        type: 'image',
        mimeType: file.type || 'image/png',
        size: sizeStr,
        preview: result,
        base64,
      });
      setSelectedProvider('gemini');
      toast.success(`Image attached: "${file.name}" (Auto-switched to Gemini Vision 👁️)`);

      // Run background OCR to extract quote/text from image
      try {
        const ocrText = await extractTextFromImage(file);
        if (ocrText && ocrText.trim().length > 2) {
          setAttachedFile((prev) => (prev ? { ...prev, textData: ocrText.trim() } : prev));
        }
      } catch (ocrErr) {
        console.warn('OCR notice:', ocrErr);
      }
    };
    reader.readAsDataURL(file);
  };

  // Dedicated Document Upload Handler (PDF, TXT, CSV, MD, JSON, DOCX)
  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setShowAttachmentMenu(false);

    const fileSizeKb = Math.round(file.size / 1024);
    const sizeStr = fileSizeKb > 1024 ? `${(fileSizeKb / 1024).toFixed(1)} MB` : `${fileSizeKb} KB`;

    try {
      const { text, isPdf } = await extractTextFromFile(file);

      if (isPdf) {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          setAttachedFile({
            name: file.name,
            type: 'document',
            mimeType: 'application/pdf',
            size: sizeStr,
            textData: text,
            base64,
          });
          toast.success(`PDF attached: "${file.name}" (${sizeStr}) 📄`);
        };
        reader.readAsDataURL(file);
      } else {
        setAttachedFile({
          name: file.name,
          type: 'document',
          mimeType: file.type || 'text/plain',
          size: sizeStr,
          textData: text,
        });
        toast.success(`Document attached: "${file.name}" (${sizeStr}) 📄`);
      }
    } catch {
      toast.error('Could not process document file.');
    }
  };

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if ((!query && !attachedFile) || loading) return;

    let displayPrompt = query;
    let payloadPrompt = query;

    if (attachedFile?.type === 'document') {
      displayPrompt = query || `Summarize and analyze this document (${attachedFile.name}) and provide actionable habit takeaways.`;
      
      const docText = attachedFile.textData && attachedFile.textData.length > 20
        ? `\n\n--- Document Text (${attachedFile.name}) ---\n${attachedFile.textData}\n--- End Document Content ---`
        : `\n\n[Attached Document: ${attachedFile.name}]`;

      payloadPrompt = `${displayPrompt}${docText}`;
    } else if (attachedFile?.type === 'image') {
      displayPrompt = query || 'Please analyze this attached image/quote and provide actionable habit coaching advice.';
      
      const imageOcr = attachedFile.textData && attachedFile.textData.length > 2
        ? `\n\n[Text / Quote Extracted From Attached Image]: "${attachedFile.textData}"`
        : '';

      payloadPrompt = `${displayPrompt}${imageOcr}`;
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: displayPrompt,
      fullPrompt: payloadPrompt,
      imagePreview: attachedFile?.type === 'image' ? attachedFile.preview : undefined,
      imagePayload:
        attachedFile?.type === 'image' && attachedFile.base64
          ? { mimeType: attachedFile.mimeType, base64: attachedFile.base64 }
          : undefined,
      documentInfo: attachedFile?.type === 'document' ? { name: attachedFile.name, size: attachedFile.size } : undefined,
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');

    const activeSessId = currentSessionId || `session_${Date.now()}`;
    if (!currentSessionId) setCurrentSessionId(activeSessId);
    syncSessionToVault(newMessages, activeSessId, currentUser);

    // Multimodal payload for Gemini (Image or PDF document)
    const attachmentPayload =
      attachedFile?.base64
        ? { mimeType: attachedFile.mimeType, base64: attachedFile.base64 }
        : undefined;

    setAttachedFile(null);
    setShowAttachmentMenu(false);
    setLoading(true);

    const assistantMsgId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, { id: assistantMsgId, role: 'assistant', content: '' }]);

    try {
      // Use payloadPrompt / fullPrompt to preserve document and question context across turns, and carry imagePayload across turns
      const apiMessages = newMessages
        .filter((m) => m.role !== 'system')
        .map((m, idx, arr) => {
          const isLast = idx === arr.length - 1;
          return {
            role: m.role,
            content: isLast ? payloadPrompt : (m.fullPrompt || m.content),
            imagePayload: m.imagePayload,
          };
        });

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: apiMessages,
          provider: selectedProvider,
          attachment: attachmentPayload,
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

          setMessages((prev) => {
            const updated = prev.map((m) => (m.id === assistantMsgId ? { ...m, content: streamedAnswer } : m));
            syncSessionToVault(updated, activeSessId, currentUser);
            return updated;
          });
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
    const newSessId = `session_${Date.now()}`;
    setCurrentSessionId(newSessId);
    setMessages(INITIAL_MESSAGES);
    setAttachedFile(null);
    setShowAttachmentMenu(false);

    if (currentUser) {
      setUserScopedData(currentUser.id, 'active_chat_messages', INITIAL_MESSAGES);
      setUserScopedData(currentUser.id, 'active_session_id', newSessId);
    }
    toast.success('Started a fresh coaching chat! Previous sessions are preserved in Vault.');
  };

  const handleResumeChat = (session: SavedSession) => {
    setCurrentSessionId(session.id);
    setMessages(session.messages);
    setShowArchives(false);

    if (currentUser) {
      setUserScopedData(currentUser.id, 'active_chat_messages', session.messages);
      setUserScopedData(currentUser.id, 'active_session_id', session.id);
      syncSessionToVault(session.messages, session.id, currentUser);
    }
    toast.info(`Resumed session: "${session.title}"`);
  };

  const handleDeleteArchive = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = archives.filter((a) => a.id !== id);
    saveArchivesToStorage(updated);
    toast.info('Session removed from Vault.');
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Copied coaching advice to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5.5rem)] max-w-5xl mx-auto gap-3">
      {/* Dynamic Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-white/5 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 p-0.5 shadow-lg shadow-purple-500/20 shrink-0">
            <div className="w-full h-full bg-slate-950 rounded-xl flex items-center justify-center">
              <Bot className="w-5 h-5 text-purple-400" />
            </div>
          </div>
          <div>
            <h1 className="text-base font-bold text-white flex items-center gap-2">
              <span>AI Habit Coach</span>
            </h1>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Dual AI Engine Toggle */}
          <div className="flex items-center bg-slate-900/80 p-1 rounded-xl border border-white/10 text-xs">
            <button
              onClick={() => setSelectedProvider('groq')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
                selectedProvider === 'groq' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Cpu className="w-3 h-3" /> Groq (Fast)
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

      {/* Interactive Onboarding Tour Modal */}
      <Dialog open={showOnboardingModal} onOpenChange={setShowOnboardingModal}>
        <DialogContent className="max-w-2xl bg-slate-950/95 border border-white/10 text-white rounded-2xl p-6 sm:p-7 shadow-2xl backdrop-blur-2xl max-h-[85vh] overflow-y-auto custom-scrollbar space-y-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold gradient-text flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <span>Welcome to HabitBot v5.0 Pro! 👋</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Here is everything you can do with your HabitBot account in 60 seconds:
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 bg-slate-900/60 rounded-xl border border-white/5 space-y-1.5 hover:border-purple-500/20 transition-colors">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <div className="p-1.5 rounded-lg bg-slate-950 border border-white/10">
                  <FileText className="w-4 h-4 text-cyan-400" />
                </div>
                <span>1. PDF & Document Habit Coach</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Click 📎 Paperclip to attach any PDF book, handout, or notes. HabitBot parses full multi-page chapters and extracts custom actionable drills.
              </p>
            </div>

            <div className="p-3.5 bg-slate-900/60 rounded-xl border border-white/5 space-y-1.5 hover:border-purple-500/20 transition-colors">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <div className="p-1.5 rounded-lg bg-slate-950 border border-white/10">
                  <Bot className="w-4 h-4 text-purple-400" />
                </div>
                <span>2. Image OCR & Gemini Vision</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Attach quote posters, workout charts, or handwritten notes. In-browser OCR reads quotes instantly while Gemini Vision analyzes image layout.
              </p>
            </div>

            <div className="p-3.5 bg-slate-900/60 rounded-xl border border-white/5 space-y-1.5 hover:border-purple-500/20 transition-colors">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <div className="p-1.5 rounded-lg bg-slate-950 border border-white/10">
                  <Headphones className="w-4 h-4 text-amber-400" />
                </div>
                <span>3. Ambient Media & Device Audio</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Listen to curated lofi presets (Lofi Nasheed & Heavy Rain), paste any YouTube link, or upload your own local audio/video files from your device.
              </p>
            </div>

            <div className="p-3.5 bg-slate-900/60 rounded-xl border border-white/5 space-y-1.5 hover:border-purple-500/20 transition-colors">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <div className="p-1.5 rounded-lg bg-slate-950 border border-white/10">
                  <CheckSquare className="w-4 h-4 text-indigo-400" />
                </div>
                <span>4. Task Sprints & Swap Order</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Generate 4 micro-tasks with AI. Reorder tasks with ⬆️/⬇️ swap buttons, sort High-to-Low, and earn +5 XP per checkmark with fair uncheck balance.
              </p>
            </div>

            <div className="p-3.5 bg-slate-900/60 rounded-xl border border-white/5 space-y-1.5 hover:border-purple-500/20 transition-colors">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <div className="p-1.5 rounded-lg bg-slate-950 border border-white/10">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <span>5. Habit Matrix & Streak Freeze</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Check off daily habits in the sidebar (+10 XP). Toggle "Freeze Day" ❄️ during rest or travel days to shield your streak without penalties!
              </p>
            </div>

            <div className="p-3.5 bg-slate-900/60 rounded-xl border border-white/5 space-y-1.5 hover:border-purple-500/20 transition-colors">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <div className="p-1.5 rounded-lg bg-slate-950 border border-white/10">
                  <FileSpreadsheet className="w-4 h-4 text-pink-400" />
                </div>
                <span>6. Logbook & 5-Sheet Excel Audit</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Log daily wins & friction points (+15 XP) and export your full lifetime habits, tasks, media history, and streaks into an organized Excel (.xlsx) file!
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-white/10">
            <div>
              <div className="font-semibold text-white text-xs">You're all set to begin! 🚀</div>
              <div className="text-[10px] text-slate-400">You can re-open this guide anytime from the top bar.</div>
            </div>
            <Button
              size="sm"
              onClick={() => {
                if (currentUser) {
                  localStorage.setItem(`habitbot_onboarded_user_${currentUser.id}`, 'true');
                }
                setShowOnboardingModal(false);
              }}
              className="gradient-button text-xs px-5 py-2 rounded-lg shrink-0 shadow-md shadow-purple-500/20"
            >
              Let's Start Building Habits!
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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

              {m.documentInfo && (
                <div className="mb-2.5 p-2.5 bg-purple-950/80 border border-purple-500/30 rounded-xl flex items-center gap-2 max-w-sm shadow-sm">
                  <div className="w-8 h-8 rounded-lg bg-purple-900/60 border border-purple-500/20 flex items-center justify-center text-purple-300 shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-white truncate">{m.documentInfo.name}</div>
                    <div className="text-[10px] text-purple-300 font-mono">{m.documentInfo.size} Document Attached</div>
                  </div>
                </div>
              )}

              <div className="text-xs sm:text-sm text-slate-200 break-words">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({ children }) => <p className="mb-3.5 leading-relaxed text-slate-200 last:mb-0">{children}</p>,
                    h1: ({ children }) => (
                      <h1 className="text-base font-bold text-white mt-4 mb-2.5 flex items-center gap-2 border-b border-white/10 pb-1.5">
                        {children}
                      </h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-sm font-bold text-purple-300 mt-4 mb-2 flex items-center gap-2">
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-xs font-bold text-cyan-300 mt-3.5 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                        {children}
                      </h3>
                    ),
                    ul: ({ children }) => <ul className="my-3 space-y-2 pl-4 list-disc marker:text-purple-400">{children}</ul>,
                    ol: ({ children }) => <ol className="my-3 space-y-2 pl-4 list-decimal marker:text-cyan-400">{children}</ol>,
                    li: ({ children }) => <li className="leading-relaxed text-slate-200 pl-0.5">{children}</li>,
                    strong: ({ children }) => (
                      <strong className="font-semibold text-white bg-purple-950/50 px-1.5 py-0.5 rounded border border-purple-500/20 text-[12px] sm:text-[13px]">
                        {children}
                      </strong>
                    ),
                    blockquote: ({ children }) => (
                      <blockquote className="my-3.5 pl-3.5 border-l-2 border-purple-400 bg-purple-950/30 py-2 pr-3 rounded-r-xl text-slate-300 italic shadow-sm">
                        {children}
                      </blockquote>
                    ),
                    code: ({ inline, children }: any) =>
                      inline ? (
                        <code className="bg-slate-950/80 text-cyan-300 px-1.5 py-0.5 rounded text-[11px] font-mono border border-white/10">
                          {children}
                        </code>
                      ) : (
                        <pre className="my-3.5 p-3.5 bg-slate-950 rounded-xl overflow-x-auto text-[11px] font-mono border border-white/10 text-cyan-200">
                          {children}
                        </pre>
                      ),
                  }}
                >
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
              <div className="w-8 h-8 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center shrink-0 text-slate-300 overflow-hidden shadow-sm">
                {currentUser?.avatar ? (
                  <img src={currentUser.avatar} alt="User avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-4 h-4" />
                )}
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

      {/* File / Document Preview Floating Pill */}
      {attachedFile && (
        <div className="flex items-center gap-2 p-2 bg-slate-900/90 border border-purple-500/30 rounded-xl max-w-fit shadow-lg">
          {attachedFile.type === 'image' ? (
            <ImageIcon className="w-4 h-4 text-cyan-400" />
          ) : (
            <FileText className="w-4 h-4 text-purple-400" />
          )}
          <div className="text-xs text-slate-200">
            <span className="font-semibold text-white">{attachedFile.name}</span>{' '}
            <span className="text-slate-400 font-mono">({attachedFile.size})</span>
          </div>
          <button onClick={() => setAttachedFile(null)} className="text-slate-400 hover:text-red-400 p-0.5 ml-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Input Form with Separate Image and Document Selectors */}
      <div className="relative">
        {/* Floating Attachment Menu Popup */}
        <AnimatePresence>
          {showAttachmentMenu && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute bottom-16 left-2 z-30 p-2 bg-slate-950/95 border border-white/15 rounded-2xl shadow-2xl backdrop-blur-2xl flex flex-col gap-1 w-52"
            >
              <div className="text-[10px] font-semibold text-slate-400 px-2 py-1 uppercase tracking-wider">
                Attach File
              </div>

              {/* Option 1: Image / Photo */}
              <button
                type="button"
                onClick={() => {
                  imageInputRef.current?.click();
                  setShowAttachmentMenu(false);
                }}
                className="flex items-center gap-2.5 p-2 rounded-xl text-xs font-medium text-slate-200 hover:text-white hover:bg-purple-950/60 border border-transparent hover:border-purple-500/30 transition-all text-left group"
              >
                <div className="w-7 h-7 rounded-lg bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-300 group-hover:scale-105 transition-transform">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-white font-semibold text-xs">Image / Photo</div>
                  <div className="text-[10px] text-slate-400 font-mono">PNG, JPG, WebP</div>
                </div>
              </button>

              {/* Option 2: Document / PDF */}
              <button
                type="button"
                onClick={() => {
                  docInputRef.current?.click();
                  setShowAttachmentMenu(false);
                }}
                className="flex items-center gap-2.5 p-2 rounded-xl text-xs font-medium text-slate-200 hover:text-white hover:bg-purple-950/60 border border-transparent hover:border-purple-500/30 transition-all text-left group"
              >
                <div className="w-7 h-7 rounded-lg bg-purple-950/60 border border-purple-500/30 flex items-center justify-center text-purple-300 group-hover:scale-105 transition-transform">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-white font-semibold text-xs">Document / Notes</div>
                  <div className="text-[10px] text-slate-400 font-mono">PDF, TXT, CSV, MD</div>
                </div>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="relative flex items-center gap-2 p-2 bg-slate-900/90 rounded-2xl border border-white/10 backdrop-blur-2xl shadow-xl"
        >
          {/* Hidden Image Input */}
          <input
            type="file"
            ref={imageInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            className="hidden"
          />

          {/* Hidden Document Input */}
          <input
            type="file"
            ref={docInputRef}
            onChange={handleDocUpload}
            accept=".pdf,.txt,.csv,.json,.md,.doc,.docx"
            className="hidden"
          />

          {/* Pin/Paperclip Button with Popup Toggle */}
          <button
            type="button"
            onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
            title="Attach an Image or Document"
            className={`p-2 rounded-xl transition-all ${
              showAttachmentMenu
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-cyan-400 hover:bg-slate-800'
            }`}
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
            disabled={(!input.trim() && !attachedFile) || loading}
            className="gradient-button h-10 px-4 rounded-xl shadow-lg shadow-purple-500/20 flex items-center gap-1.5"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Send</span>
          </Button>
        </form>
      </div>
    </div>
  );
}
