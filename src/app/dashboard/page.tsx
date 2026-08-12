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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#1e1e1e] p-3 px-4 rounded-2xl border border-[#dadce0] dark:border-[#3c4043] transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#1a73e8] flex items-center justify-center text-white shrink-0">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-[#202124] dark:text-[#e8eaed]">
              AI Habit Coach
            </h1>
            <p className="text-[11px] text-[#5f6368] dark:text-[#9aa0a6]">Behavioral routines, deep work coaching & document drills</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Dual AI Engine Toggle */}
          <div className="flex items-center bg-[#f1f3f4] dark:bg-[#2d2e30] p-1 rounded-full text-xs">
            <button
              onClick={() => setSelectedProvider('groq')}
              className={`px-3 py-1 rounded-full font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                selectedProvider === 'groq'
                  ? 'bg-[#e8f0fe] text-[#1a73e8] dark:bg-[#394457] dark:text-[#8ab4f8] font-semibold'
                  : 'text-[#5f6368] dark:text-[#9aa0a6] hover:text-[#202124]'
              }`}
            >
              <Cpu className="w-3 h-3" /> Groq (Fast)
            </button>
            <button
              onClick={() => setSelectedProvider('gemini')}
              className={`px-3 py-1 rounded-full font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                selectedProvider === 'gemini'
                  ? 'bg-[#e8f0fe] text-[#1a73e8] dark:bg-[#394457] dark:text-[#8ab4f8] font-semibold'
                  : 'text-[#5f6368] dark:text-[#9aa0a6] hover:text-[#202124]'
              }`}
            >
              <Sparkles className="w-3 h-3" /> Gemini Vision
            </button>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowArchives(true)}
            className="h-8 text-xs bg-white hover:bg-[#f1f3f4] dark:bg-[#1e1e1e] dark:hover:bg-[#2d2e30] border-[#dadce0] dark:border-[#3c4043] text-[#202124] dark:text-[#e8eaed] gap-1.5 rounded-full font-medium cursor-pointer"
          >
            <Archive className="w-3.5 h-3.5 text-[#1a73e8]" />
            <span>Vault ({archives.length})</span>
          </Button>

          <Button
            size="sm"
            onClick={handleNewChat}
            className="h-8 text-xs bg-[#1a73e8] hover:bg-[#1557b0] text-white gap-1.5 rounded-full font-medium cursor-pointer shadow-none"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </Button>
        </div>
      </div>

      {/* Interactive Onboarding Tour Modal */}
      <Dialog open={showOnboardingModal} onOpenChange={setShowOnboardingModal}>
        <DialogContent className="max-w-2xl bg-white dark:bg-[#1e1e1e] border border-[#dadce0] dark:border-[#3c4043] text-[#202124] dark:text-[#e8eaed] rounded-3xl p-6 sm:p-7 shadow-2xl max-h-[85vh] overflow-y-auto custom-scrollbar space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#202124] dark:text-[#e8eaed] flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#1a73e8]" />
              <span>Welcome to HabitBot! 👋</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-[#5f6368] dark:text-[#9aa0a6]">
              Here is everything you can do with your HabitBot account in 60 seconds:
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 bg-[#f8f9fa] dark:bg-[#2d2e30] rounded-2xl border border-[#dadce0] dark:border-[#3c4043] space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#202124] dark:text-[#e8eaed]">
                <div className="p-1.5 rounded-full bg-[#e8f0fe] text-[#1a73e8]">
                  <FileText className="w-4 h-4" />
                </div>
                <span>1. PDF & Document Habit Coach</span>
              </div>
              <p className="text-[11px] text-[#5f6368] dark:text-[#9aa0a6] leading-relaxed">
                Click 📎 Paperclip to attach any PDF book, handout, or notes. HabitBot parses full multi-page chapters and extracts custom actionable drills.
              </p>
            </div>

            <div className="p-3.5 bg-[#f8f9fa] dark:bg-[#2d2e30] rounded-2xl border border-[#dadce0] dark:border-[#3c4043] space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#202124] dark:text-[#e8eaed]">
                <div className="p-1.5 rounded-full bg-[#e8f0fe] text-[#1a73e8]">
                  <Bot className="w-4 h-4" />
                </div>
                <span>2. Image OCR & Gemini Vision</span>
              </div>
              <p className="text-[11px] text-[#5f6368] dark:text-[#9aa0a6] leading-relaxed">
                Attach quote posters, workout charts, or notes. In-browser OCR extracts text instantly while Gemini Vision analyzes visual layouts.
              </p>
            </div>

            <div className="p-3.5 bg-[#f8f9fa] dark:bg-[#2d2e30] rounded-2xl border border-[#dadce0] dark:border-[#3c4043] space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#202124] dark:text-[#e8eaed]">
                <div className="p-1.5 rounded-full bg-[#fef7e0] text-[#b06000]">
                  <Headphones className="w-4 h-4" />
                </div>
                <span>3. Ambient Media & Device Audio</span>
              </div>
              <p className="text-[11px] text-[#5f6368] dark:text-[#9aa0a6] leading-relaxed">
                Listen to curated lofi presets, paste any YouTube link, or upload your own local audio/video files from your device.
              </p>
            </div>

            <div className="p-3.5 bg-[#f8f9fa] dark:bg-[#2d2e30] rounded-2xl border border-[#dadce0] dark:border-[#3c4043] space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#202124] dark:text-[#e8eaed]">
                <div className="p-1.5 rounded-full bg-[#e8f0fe] text-[#1a73e8]">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <span>4. Task Sprints & Swap Order</span>
              </div>
              <p className="text-[11px] text-[#5f6368] dark:text-[#9aa0a6] leading-relaxed">
                Generate 4 micro-tasks with AI. Reorder tasks with ⬆️/⬇️ swap buttons, sort High-to-Low, and earn +5 XP per checkmark.
              </p>
            </div>

            <div className="p-3.5 bg-[#f8f9fa] dark:bg-[#2d2e30] rounded-2xl border border-[#dadce0] dark:border-[#3c4043] space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#202124] dark:text-[#e8eaed]">
                <div className="p-1.5 rounded-full bg-[#e6f4ea] text-[#137333]">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <span>5. Habit Matrix & Streak Freeze</span>
              </div>
              <p className="text-[11px] text-[#5f6368] dark:text-[#9aa0a6] leading-relaxed">
                Check off daily habits in the sidebar (+10 XP). Toggle "Freeze Day" ❄️ during rest or travel days to shield your streak without penalties!
              </p>
            </div>

            <div className="p-3.5 bg-[#f8f9fa] dark:bg-[#2d2e30] rounded-2xl border border-[#dadce0] dark:border-[#3c4043] space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#202124] dark:text-[#e8eaed]">
                <div className="p-1.5 rounded-full bg-[#fce8e6] text-[#c5221f]">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <span>6. Logbook & 5-Sheet Excel Audit</span>
              </div>
              <p className="text-[11px] text-[#5f6368] dark:text-[#9aa0a6] leading-relaxed">
                Log daily wins & friction points (+15 XP) and export your full lifetime habits, tasks, media history, and streaks into an organized Excel (.xlsx) file!
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end pt-2">
            <Button
              size="sm"
              onClick={() => setShowOnboardingModal(false)}
              className="bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs px-5 py-2 rounded-full font-medium shadow-none cursor-pointer"
            >
              Get Started
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Conversation Vault Archive Modal */}
      <Dialog open={showArchives} onOpenChange={setShowArchives}>
        <DialogContent className="max-w-md bg-white dark:bg-[#1e1e1e] border border-[#dadce0] dark:border-[#3c4043] text-[#202124] dark:text-[#e8eaed] rounded-3xl p-6 shadow-2xl space-y-3">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#202124] dark:text-[#e8eaed] flex items-center gap-2">
              <Archive className="w-5 h-5 text-[#1a73e8]" />
              <span>Coaching Conversation Vault</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-[#5f6368] dark:text-[#9aa0a6]">
              All your previous coaching conversations are securely preserved. Click to resume anytime.
            </DialogDescription>
          </DialogHeader>

          {archives.length === 0 ? (
            <div className="p-6 text-center text-xs text-[#5f6368] dark:text-[#9aa0a6] bg-[#f8f9fa] dark:bg-[#2d2e30] rounded-2xl">
              No archived conversations yet. Start chatting to create history!
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
              {archives.map((arch) => (
                <div
                  key={arch.id}
                  className="p-3 bg-[#f8f9fa] hover:bg-[#f1f3f4] dark:bg-[#2d2e30] dark:hover:bg-[#3c4043] rounded-2xl border border-[#dadce0] dark:border-[#3c4043] flex items-center justify-between group transition-colors"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="text-xs font-semibold text-[#202124] dark:text-[#e8eaed] truncate">{arch.title}</div>
                    <div className="text-[10px] text-[#5f6368] dark:text-[#9aa0a6] mt-0.5 font-mono">
                      {arch.timestamp} • {arch.messages.length} messages
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleResumeChat(arch)}
                      className="h-7 text-xs text-[#1a73e8] hover:bg-[#e8f0fe] dark:text-[#8ab4f8] dark:hover:bg-[#394457] px-3 rounded-full cursor-pointer font-medium"
                    >
                      Resume
                    </Button>

                    <button
                      onClick={(e) => handleDeleteArchive(arch.id, e)}
                      className="p-1.5 text-[#5f6368] hover:text-[#d93025] dark:text-[#9aa0a6] dark:hover:text-[#f28b82] rounded-full hover:bg-[#fce8e6] dark:hover:bg-[#3c2020] transition-colors cursor-pointer"
                      title="Delete session"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
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
              className="p-3 bg-white hover:bg-[#f8f9fa] dark:bg-[#1e1e1e] dark:hover:bg-[#2d2e30] border border-[#dadce0] dark:border-[#3c4043] rounded-2xl text-left transition-colors cursor-pointer"
            >
              <div className="text-xs font-medium text-[#202124] dark:text-[#e8eaed]">{p.label}</div>
              <div className="text-[11px] text-[#5f6368] dark:text-[#9aa0a6] line-clamp-2 mt-0.5">{p.prompt}</div>
            </button>
          ))}
        </div>
      )}

      {/* Message History */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar min-h-[340px]">
        {messages.map((m) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-start gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {m.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-[#1a73e8] text-white flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`relative group max-w-[80%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed transition-colors ${
                m.role === 'user'
                  ? 'bg-[#1a73e8] dark:bg-[#8ab4f8] text-white dark:text-[#202124] rounded-tr-sm'
                  : 'bg-white dark:bg-[#1e1e1e] border border-[#dadce0] dark:border-[#3c4043] text-[#202124] dark:text-[#e8eaed] rounded-tl-sm'
              }`}
            >
              {m.imagePreview && (
                <div className="mb-2.5 rounded-xl overflow-hidden border border-[#dadce0] dark:border-[#3c4043] max-w-xs">
                  <img src={m.imagePreview} alt="Attached context" className="w-full h-auto object-cover" />
                </div>
              )}

              {m.documentInfo && (
                <div className="mb-2.5 p-2.5 bg-[#f8f9fa] dark:bg-[#2d2e30] border border-[#dadce0] dark:border-[#3c4043] rounded-xl flex items-center gap-2 max-w-sm">
                  <div className="w-8 h-8 rounded-lg bg-[#e8f0fe] dark:bg-[#394457] flex items-center justify-center text-[#1a73e8] dark:text-[#8ab4f8] shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-[#202124] dark:text-[#e8eaed] truncate">{m.documentInfo.name}</div>
                    <div className="text-[10px] text-[#5f6368] dark:text-[#9aa0a6] font-mono">{m.documentInfo.size} Document</div>
                  </div>
                </div>
              )}

              <div className="text-xs sm:text-sm break-words">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({ children }) => <p className="mb-3 leading-relaxed last:mb-0">{children}</p>,
                    h1: ({ children }) => (
                      <h1 className="text-base font-bold text-[#202124] dark:text-[#e8eaed] mt-4 mb-2 flex items-center gap-2 border-b border-[#dadce0] dark:border-[#3c4043] pb-1">
                        {children}
                      </h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-sm font-bold text-[#202124] dark:text-[#e8eaed] mt-4 mb-2 flex items-center gap-2">
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-xs font-bold text-[#1a73e8] dark:text-[#8ab4f8] mt-3 mb-1 uppercase tracking-wider flex items-center gap-1.5">
                        {children}
                      </h3>
                    ),
                    ul: ({ children }) => <ul className="my-2.5 space-y-1.5 pl-4 list-disc marker:text-[#1a73e8]">{children}</ul>,
                    ol: ({ children }) => <ol className="my-2.5 space-y-1.5 pl-4 list-decimal marker:text-[#1a73e8]">{children}</ol>,
                    li: ({ children }) => <li className="leading-relaxed pl-0.5">{children}</li>,
                    strong: ({ children }) => (
                      <strong className="font-semibold">
                        {children}
                      </strong>
                    ),
                    blockquote: ({ children }) => (
                      <blockquote className="my-3 pl-3 border-l-2 border-[#1a73e8] bg-[#f8f9fa] dark:bg-[#2d2e30] py-2 pr-3 rounded-r-xl italic">
                        {children}
                      </blockquote>
                    ),
                    code: ({ inline, children }: any) =>
                      inline ? (
                        <code className="bg-[#f1f3f4] dark:bg-[#2d2e30] text-[#1a73e8] dark:text-[#8ab4f8] px-1.5 py-0.5 rounded text-[11px] font-mono">
                          {children}
                        </code>
                      ) : (
                        <pre className="my-3 p-3 bg-[#202124] dark:bg-[#121212] rounded-xl overflow-x-auto text-[11px] font-mono text-white">
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
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 rounded-full bg-white hover:bg-[#f1f3f4] dark:bg-[#2d2e30] dark:hover:bg-[#3c4043] text-[#5f6368] hover:text-[#202124] dark:text-[#9aa0a6] dark:hover:text-white transition-opacity text-[10px] flex items-center gap-1 cursor-pointer border border-[#dadce0] dark:border-[#3c4043]"
                >
                  {copiedId === m.id ? <Check className="w-3 h-3 text-[#1e8e3e]" /> : <Copy className="w-3 h-3" />}
                </button>
              )}
            </div>

            {m.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-[#f1f3f4] dark:bg-[#2d2e30] flex items-center justify-center shrink-0 text-[#5f6368] dark:text-[#9aa0a6] overflow-hidden">
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
            <div className="w-8 h-8 rounded-full bg-[#1a73e8] text-white flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-3.5 bg-white dark:bg-[#1e1e1e] rounded-2xl border border-[#dadce0] dark:border-[#3c4043] text-xs text-[#5f6368] dark:text-[#9aa0a6] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#1a73e8] animate-pulse" />
              <span>HabitBot ({selectedProvider === 'gemini' ? 'Gemini Vision' : 'Groq'}) is formulating advice...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* File / Document Preview Floating Pill */}
      {attachedFile && (
        <div className="flex items-center gap-2 p-2 px-3 bg-white dark:bg-[#1e1e1e] border border-[#dadce0] dark:border-[#3c4043] rounded-full max-w-fit shadow-sm">
          {attachedFile.type === 'image' ? (
            <ImageIcon className="w-4 h-4 text-[#1a73e8]" />
          ) : (
            <FileText className="w-4 h-4 text-[#1a73e8]" />
          )}
          <div className="text-xs text-[#202124] dark:text-[#e8eaed]">
            <span className="font-medium">{attachedFile.name}</span>{' '}
            <span className="text-[#5f6368] dark:text-[#9aa0a6] font-mono">({attachedFile.size})</span>
          </div>
          <button onClick={() => setAttachedFile(null)} className="text-[#5f6368] hover:text-[#d93025] p-0.5 ml-1 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Google Search Style Prompt Input Bar */}
      <div className="relative">
        {/* Floating Attachment Menu Popup */}
        <AnimatePresence>
          {showAttachmentMenu && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute bottom-16 left-2 z-30 p-2 bg-white dark:bg-[#1e1e1e] border border-[#dadce0] dark:border-[#3c4043] rounded-2xl shadow-xl flex flex-col gap-1 w-52"
            >
              <div className="text-[10px] font-medium text-[#5f6368] dark:text-[#9aa0a6] px-2 py-1 uppercase tracking-wider">
                Attach File
              </div>

              {/* Option 1: Image / Photo */}
              <button
                type="button"
                onClick={() => {
                  imageInputRef.current?.click();
                  setShowAttachmentMenu(false);
                }}
                className="flex items-center gap-2.5 p-2 rounded-xl text-xs font-medium text-[#202124] dark:text-[#e8eaed] hover:bg-[#f1f3f4] dark:hover:bg-[#2d2e30] transition-colors text-left group cursor-pointer"
              >
                <div className="w-7 h-7 rounded-full bg-[#e8f0fe] dark:bg-[#394457] flex items-center justify-center text-[#1a73e8] dark:text-[#8ab4f8]">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-medium text-xs">Image / Photo</div>
                  <div className="text-[10px] text-[#5f6368] dark:text-[#9aa0a6] font-mono">PNG, JPG, WebP</div>
                </div>
              </button>

              {/* Option 2: Document / PDF */}
              <button
                type="button"
                onClick={() => {
                  docInputRef.current?.click();
                  setShowAttachmentMenu(false);
                }}
                className="flex items-center gap-2.5 p-2 rounded-xl text-xs font-medium text-[#202124] dark:text-[#e8eaed] hover:bg-[#f1f3f4] dark:hover:bg-[#2d2e30] transition-colors text-left group cursor-pointer"
              >
                <div className="w-7 h-7 rounded-full bg-[#e8f0fe] dark:bg-[#394457] flex items-center justify-center text-[#1a73e8] dark:text-[#8ab4f8]">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-medium text-xs">Document / Notes</div>
                  <div className="text-[10px] text-[#5f6368] dark:text-[#9aa0a6] font-mono">PDF, TXT, CSV, MD</div>
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
          className="relative flex items-center gap-2 p-2 bg-white dark:bg-[#1e1e1e] rounded-full border border-[#dadce0] dark:border-[#3c4043] shadow-sm hover:shadow-md focus-within:shadow-md focus-within:border-[#1a73e8] transition-all"
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
            className={`p-2 rounded-full transition-colors cursor-pointer ${
              showAttachmentMenu
                ? 'bg-[#e8f0fe] text-[#1a73e8]'
                : 'text-[#5f6368] hover:text-[#202124] hover:bg-[#f1f3f4] dark:text-[#9aa0a6] dark:hover:text-[#e8eaed] dark:hover:bg-[#2d2e30]'
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
            className="flex-1 bg-transparent border-0 text-[#202124] dark:text-[#e8eaed] placeholder:text-[#5f6368] dark:placeholder:text-[#9aa0a6] focus-visible:ring-0 text-xs sm:text-sm pl-1 shadow-none"
          />

          <Button
            type="submit"
            size="sm"
            disabled={(!input.trim() && !attachedFile) || loading}
            className="bg-[#1a73e8] hover:bg-[#1557b0] text-white h-9 px-4 rounded-full shadow-none flex items-center gap-1.5 cursor-pointer font-medium"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Send</span>
          </Button>
        </form>
      </div>
    </div>
  );
}
