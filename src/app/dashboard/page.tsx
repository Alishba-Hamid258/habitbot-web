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
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-3 px-4 rounded-xl border border-border transition-colors">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center text-primary-foreground shrink-0">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-foreground">
              Habit Coach
            </h1>
            <p className="text-[11px] text-muted-foreground">Ask routine questions, paste study notes, or attach documents</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* AI Engine Switch */}
          <div className="flex items-center bg-muted/60 p-0.5 rounded-lg text-xs border border-border/50">
            <button
              onClick={() => setSelectedProvider('groq')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                selectedProvider === 'groq'
                  ? 'bg-background text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Cpu className="w-3 h-3" /> Groq
            </button>
            <button
              onClick={() => setSelectedProvider('gemini')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                selectedProvider === 'gemini'
                  ? 'bg-background text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Sparkles className="w-3 h-3 text-primary" /> Gemini Vision
            </button>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowArchives(true)}
            className="h-7 text-xs bg-card hover:bg-muted border-border text-foreground gap-1.5 rounded-md font-medium cursor-pointer"
          >
            <Archive className="w-3.5 h-3.5 text-primary" />
            <span>History ({archives.length})</span>
          </Button>

          <Button
            size="sm"
            onClick={handleNewChat}
            className="h-7 text-xs bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 rounded-md font-medium cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </Button>
        </div>
      </div>

      {/* Onboarding Tour Modal */}
      <Dialog open={showOnboardingModal} onOpenChange={setShowOnboardingModal}>
        <DialogContent className="max-w-2xl bg-card border border-border text-foreground rounded-xl p-6 shadow-xl max-h-[85vh] overflow-y-auto custom-scrollbar space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Bot className="w-4 h-4 text-primary" />
              <span>Welcome to HabitBot</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Quick 30-second overview of what you can accomplish:
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3 bg-muted/40 rounded-lg border border-border/80 space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <FileText className="w-3.5 h-3.5 text-primary" />
                <span>1. Documents & Coach</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Attach PDFs or text files to generate customized routines, study drills, or habit stacks.
              </p>
            </div>

            <div className="p-3 bg-muted/40 rounded-lg border border-border/80 space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <Bot className="w-3.5 h-3.5 text-purple-500" />
                <span>2. OCR & Vision</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Upload image notes or schedules. In-browser OCR reads text directly while Vision parses diagrams.
              </p>
            </div>

            <div className="p-3 bg-muted/40 rounded-lg border border-border/80 space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <Headphones className="w-3.5 h-3.5 text-amber-500" />
                <span>3. Focus Audio</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Play background lofi audio, stream YouTube soundtracks, or load files from your computer.
              </p>
            </div>

            <div className="p-3 bg-muted/40 rounded-lg border border-border/80 space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <CheckSquare className="w-3.5 h-3.5 text-blue-500" />
                <span>4. Task Sprints</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Break large goals into 4 micro-tasks with AI and reorder priority using ⬆️/⬇️ buttons.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end pt-1">
            <Button
              size="sm"
              onClick={() => setShowOnboardingModal(false)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs px-4 h-8 rounded-md font-medium cursor-pointer"
            >
              Get Started
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* History Archive Modal */}
      <Dialog open={showArchives} onOpenChange={setShowArchives}>
        <DialogContent className="max-w-md bg-card border border-border text-foreground rounded-xl p-6 shadow-xl space-y-3">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Archive className="w-4 h-4 text-primary" />
              <span>Conversation History</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Previous coaching sessions are saved automatically. Click to resume anytime.
            </DialogDescription>
          </DialogHeader>

          {archives.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground bg-muted/40 rounded-lg border border-border/60">
              No saved conversations yet.
            </div>
          ) : (
            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
              {archives.map((arch) => (
                <div
                  key={arch.id}
                  className="p-2.5 bg-muted/40 hover:bg-muted/70 rounded-lg border border-border/80 flex items-center justify-between group transition-colors"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="text-xs font-medium text-foreground truncate">{arch.title}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                      {arch.timestamp} • {arch.messages.length} msgs
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleResumeChat(arch)}
                      className="h-7 text-xs text-primary hover:bg-primary/10 px-2.5 rounded-md cursor-pointer font-medium"
                    >
                      Resume
                    </Button>

                    <button
                      onClick={(e) => handleDeleteArchive(arch.id, e)}
                      className="p-1 text-muted-foreground hover:text-destructive rounded hover:bg-destructive/10 transition-colors cursor-pointer"
                      title="Delete session"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Quick Prompt Suggestions */}
      {messages.length <= 2 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {QUICK_PROMPTS.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(p.prompt)}
              className="p-3 bg-card hover:bg-muted/50 border border-border rounded-lg text-left transition-colors cursor-pointer group"
            >
              <div className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">{p.label}</div>
              <div className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{p.prompt}</div>
            </button>
          ))}
        </div>
      )}

      {/* Message History */}
      <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 custom-scrollbar min-h-[300px]">
        {messages.map((m) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-start gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {m.role === 'assistant' && (
              <div className="w-7 h-7 rounded-md bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-xs">
                <Bot className="w-3.5 h-3.5" />
              </div>
            )}

            <div
              className={`relative group max-w-[82%] rounded-xl p-3.5 text-xs sm:text-sm leading-relaxed transition-colors ${
                m.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-tr-xs'
                  : 'bg-card border border-border text-foreground rounded-tl-xs shadow-xs'
              }`}
            >
              {m.imagePreview && (
                <div className="mb-2.5 rounded-lg overflow-hidden border border-border max-w-xs">
                  <img src={m.imagePreview} alt="Attached context" className="w-full h-auto object-cover" />
                </div>
              )}

              {m.documentInfo && (
                <div className="mb-2.5 p-2 bg-muted/60 border border-border/80 rounded-lg flex items-center gap-2 max-w-sm">
                  <div className="w-7 h-7 rounded bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-foreground truncate">{m.documentInfo.name}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">{m.documentInfo.size} Document</div>
                  </div>
                </div>
              )}

              <div className="text-xs sm:text-sm break-words">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({ children }) => <p className="mb-2.5 leading-relaxed last:mb-0">{children}</p>,
                    h1: ({ children }) => (
                      <h1 className="text-sm font-bold text-foreground mt-3 mb-1.5 border-b border-border pb-1">
                        {children}
                      </h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-xs font-bold text-foreground mt-3 mb-1">
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-xs font-semibold text-primary mt-2 mb-1">
                        {children}
                      </h3>
                    ),
                    ul: ({ children }) => <ul className="my-2 space-y-1 pl-4 list-disc marker:text-primary">{children}</ul>,
                    ol: ({ children }) => <ol className="my-2 space-y-1 pl-4 list-decimal marker:text-primary">{children}</ol>,
                    li: ({ children }) => <li className="leading-relaxed pl-0.5">{children}</li>,
                    strong: ({ children }) => (
                      <strong className="font-semibold">
                        {children}
                      </strong>
                    ),
                    blockquote: ({ children }) => (
                      <blockquote className="my-2 pl-3 border-l-2 border-primary bg-muted/40 py-1.5 pr-2 rounded-r-md italic">
                        {children}
                      </blockquote>
                    ),
                    code: ({ inline, children }: any) =>
                      inline ? (
                        <code className="bg-muted text-primary px-1.5 py-0.5 rounded text-[11px] font-mono">
                          {children}
                        </code>
                      ) : (
                        <pre className="my-2.5 p-3 bg-zinc-950 rounded-lg overflow-x-auto text-[11px] font-mono text-zinc-100 border border-border">
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
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-opacity text-[10px] flex items-center gap-1 cursor-pointer border border-border"
                  title="Copy response"
                >
                  {copiedId === m.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                </button>
              )}
            </div>

            {m.role === 'user' && (
              <div className="w-7 h-7 rounded-md bg-muted border border-border flex items-center justify-center shrink-0 text-muted-foreground overflow-hidden text-xs">
                {currentUser?.avatar ? (
                  <img src={currentUser.avatar} alt="User avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-3.5 h-3.5" />
                )}
              </div>
            )}
          </motion.div>
        ))}

        {loading && (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-primary text-primary-foreground flex items-center justify-center shrink-0">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div className="p-3 bg-card rounded-xl border border-border text-xs text-muted-foreground flex items-center gap-2 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span>Thinking ({selectedProvider === 'gemini' ? 'Gemini Vision' : 'Groq'})...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* File Preview Floating Pill */}
      {attachedFile && (
        <div className="flex items-center gap-2 p-1.5 px-3 bg-card border border-border rounded-lg max-w-fit shadow-xs">
          {attachedFile.type === 'image' ? (
            <ImageIcon className="w-3.5 h-3.5 text-primary" />
          ) : (
            <FileText className="w-3.5 h-3.5 text-primary" />
          )}
          <div className="text-xs text-foreground">
            <span className="font-medium">{attachedFile.name}</span>{' '}
            <span className="text-muted-foreground font-mono text-[10px]">({attachedFile.size})</span>
          </div>
          <button onClick={() => setAttachedFile(null)} className="text-muted-foreground hover:text-destructive p-0.5 ml-1 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Clean Prompt Input Bar */}
      <div className="relative">
        {/* Floating Attachment Menu Popup */}
        <AnimatePresence>
          {showAttachmentMenu && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              className="absolute bottom-14 left-2 z-30 p-1.5 bg-card border border-border rounded-xl shadow-lg flex flex-col gap-1 w-48"
            >
              <div className="text-[10px] font-medium text-muted-foreground px-2 py-0.5">
                Attach File
              </div>

              {/* Option 1: Image / Photo */}
              <button
                type="button"
                onClick={() => {
                  imageInputRef.current?.click();
                  setShowAttachmentMenu(false);
                }}
                className="flex items-center gap-2 p-1.5 rounded-md text-xs font-medium text-foreground hover:bg-muted transition-colors text-left cursor-pointer"
              >
                <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-primary">
                  <ImageIcon className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-medium text-xs">Image / Photo</div>
                  <div className="text-[10px] text-muted-foreground font-mono">PNG, JPG, WebP</div>
                </div>
              </button>

              {/* Option 2: Document / PDF */}
              <button
                type="button"
                onClick={() => {
                  docInputRef.current?.click();
                  setShowAttachmentMenu(false);
                }}
                className="flex items-center gap-2 p-1.5 rounded-md text-xs font-medium text-foreground hover:bg-muted transition-colors text-left cursor-pointer"
              >
                <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-primary">
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-medium text-xs">Document / Notes</div>
                  <div className="text-[10px] text-muted-foreground font-mono">PDF, TXT, MD</div>
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
          className="relative flex items-center gap-2 p-1.5 bg-card rounded-xl border border-border shadow-xs hover:border-border/90 focus-within:border-primary/70 focus-within:ring-1 focus-within:ring-primary/20 transition-all"
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

          {/* Pin/Paperclip Button */}
          <button
            type="button"
            onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
            title="Attach an Image or Document"
            className={`p-2 rounded-md transition-colors cursor-pointer ${
              showAttachmentMenu
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Paperclip className="w-4 h-4" />
          </button>

          <Input
            type="text"
            placeholder="Ask about routines, habits, or productivity..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            className="flex-1 bg-transparent border-0 text-foreground placeholder:text-muted-foreground focus-visible:ring-0 text-xs sm:text-sm pl-1 shadow-none h-8"
          />

          <Button
            type="submit"
            size="sm"
            disabled={(!input.trim() && !attachedFile) || loading}
            className="bg-primary hover:bg-primary/90 text-primary-foreground h-8 px-3.5 rounded-lg shadow-none flex items-center gap-1.5 cursor-pointer font-medium"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Send</span>
          </Button>
        </form>
      </div>
    </div>
  );
}
