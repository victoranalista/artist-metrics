"use client";

import { useRef, useEffect, useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { InlineChart, parseChartsFromContent } from "@/components/chat/inline-charts";
import {
  Bot,
  Send,
  Trash2,
  Loader2,
  Sparkles,
  ExternalLink,
  Music,
  TrendingUp,
  Target,
  Lightbulb,
  UserCog,
  Briefcase,
  Plus,
  History,
  X,
  ChevronRight,
  ArrowDown,
  PanelLeftOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  createChatSession,
  deleteChatSession,
} from "@/lib/actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface ChatMessage {
  id: string;
  role: "USER" | "ASSISTANT" | "SYSTEM";
  content: string;
  createdAt: Date | string;
  metadata?: unknown;
}

interface ChatSession {
  id: string;
  title: string | null;
  updatedAt: Date | string;
}

interface ChatClientProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  initialMessages: ChatMessage[];
}

// ── Suggested prompts ──

const suggestedPrompts = [
  {
    icon: Music,
    label: "Analise minha presença digital",
    prompt: "Pesquise sobre a presença digital da Débora Kailany em todas as plataformas e me dê um diagnóstico completo",
  },
  {
    icon: TrendingUp,
    label: "Plano de crescimento",
    prompt: "Monte um plano de crescimento para a Débora Kailany nos próximos 30 dias com ações semanais",
  },
  {
    icon: Target,
    label: "Estratégia de lançamento",
    prompt: "Crie uma estratégia completa de lançamento de música para a Débora Kailany com cronograma de pré-save até pós-lançamento",
  },
  {
    icon: Lightbulb,
    label: "Ideias de conteúdo",
    prompt: "Me dê 10 ideias de conteúdo para os Reels e TikTok da Débora Kailany que podem viralizar no nicho gospel",
  },
  {
    icon: UserCog,
    label: "Configurar preferências",
    prompt: "/artist-preferences",
  },
  {
    icon: Briefcase,
    label: "Planejar carreira",
    prompt: "/production-artist",
  },
];

const slashCommands = [
  { command: "/artist-preferences", description: "Definir suas preferências e estilo artístico" },
  { command: "/production-artist", description: "Planejar e acompanhar sua carreira musical" },
];

// ── Markdown renderer ──

function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h3 className="mb-3 mt-5 border-b border-zinc-700/50 pb-2 text-[15px] font-semibold tracking-tight text-zinc-100 first:mt-0">
            {children}
          </h3>
        ),
        h2: ({ children }) => (
          <h4 className="mb-2 mt-4 text-[14px] font-semibold text-zinc-200 first:mt-0">
            {children}
          </h4>
        ),
        h3: ({ children }) => (
          <h5 className="mb-1.5 mt-3 text-[13px] font-medium text-zinc-300 first:mt-0">
            {children}
          </h5>
        ),
        p: ({ children }) => (
          <p className="mb-2.5 text-[13px] leading-[1.75] text-zinc-300 last:mb-0 sm:text-[14px]">
            {children}
          </p>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-zinc-100">{children}</strong>
        ),
        em: ({ children }) => (
          <em className="text-zinc-200 not-italic">{children}</em>
        ),
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-zinc-200 underline decoration-zinc-500/40 underline-offset-2 transition hover:text-zinc-100"
          >
            {children}
            <ExternalLink className="inline size-2.5" />
          </a>
        ),
        ul: ({ children }) => (
          <ul className="mb-3 ml-1 space-y-1.5">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="mb-3 ml-1 space-y-1.5 [counter-reset:item]">
            {children}
          </ol>
        ),
        li: ({ children, ...props }) => {
          const isOrdered = (props as { node?: { parentNode?: { tagName?: string } } }).node?.parentNode?.tagName === "ol";
          return (
            <li className="flex gap-2.5 text-[13px] leading-[1.75] text-zinc-300 sm:text-[14px]">
              {isOrdered ? (
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md bg-zinc-800 text-[10px] font-semibold text-zinc-400 [counter-increment:item] before:content-[counter(item)]" />
              ) : (
                <span className="mt-[9px] size-1 shrink-0 rounded-full bg-zinc-500" />
              )}
              <span className="flex-1">{children}</span>
            </li>
          );
        },
        code: ({ className, children }) => {
          const isBlock = className?.includes("language-");
          if (isBlock) {
            return (
              <div className="my-3 overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900 p-3">
                <code className="text-xs text-zinc-400">{children}</code>
              </div>
            );
          }
          return (
            <code className="rounded-md bg-zinc-800 px-1.5 py-0.5 text-xs font-medium text-zinc-300">
              {children}
            </code>
          );
        },
        pre: ({ children }) => <>{children}</>,
        blockquote: ({ children }) => (
          <blockquote className="my-3 border-l-2 border-zinc-600 bg-zinc-900/50 py-2 pl-4 pr-3">
            {children}
          </blockquote>
        ),
        hr: () => <hr className="my-4 border-zinc-800" />,
        table: ({ children }) => (
          <div className="my-3 overflow-x-auto rounded-xl border border-zinc-800">
            <table className="w-full text-[12px] sm:text-[13px]">{children}</table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-zinc-800/50 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
            {children}
          </thead>
        ),
        th: ({ children }) => (
          <th className="px-3 py-2.5 text-left font-semibold">{children}</th>
        ),
        tbody: ({ children }) => (
          <tbody className="divide-y divide-zinc-800">{children}</tbody>
        ),
        tr: ({ children }) => (
          <tr className="transition hover:bg-zinc-800/30">{children}</tr>
        ),
        td: ({ children }) => (
          <td className="px-3 py-2 text-zinc-300">{children}</td>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

// ── Rich message with charts ──

function RichMessage({ content }: { content: string }) {
  const { segments } = parseChartsFromContent(content);

  return (
    <div>
      {segments.map((segment, i) =>
        segment.type === "chart" && segment.chartData ? (
          <InlineChart key={i} chartData={segment.chartData} />
        ) : (
          <MarkdownContent key={i} content={segment.content} />
        )
      )}
    </div>
  );
}

// ── Relative time ──

function timeAgo(date: Date | string): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diff = now - then;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  if (days < 30) return `${Math.floor(days / 7)}sem`;
  return `${Math.floor(days / 30)}m`;
}

// ── Main component ──

export function ChatClient({
  sessions: initialSessions,
  currentSessionId,
  initialMessages,
}: ChatClientProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [sessions, setSessions] = useState<ChatSession[]>(initialSessions);
  const [sessionId, setSessionId] = useState<string | null>(currentSessionId);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isDeleting, startDeleting] = useTransition();
  const [showCommandHint, setShowCommandHint] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const isStreamingRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Detect active mode
  const activeMode = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const meta = messages[i].metadata as Record<string, unknown> | null;
      if (!meta?.mode) continue;
      if (meta.status === "completed") return null;
      return meta.mode as string;
    }
    return null;
  })();

  // ── Smart scroll (ChatGPT-style) ──
  const checkIfNearBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const threshold = 150;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    isNearBottomRef.current = nearBottom;
    setShowScrollButton(!nearBottom && messages.length > 0);
  }, [messages.length]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handler = () => checkIfNearBottom();
    el.addEventListener("scroll", handler, { passive: true });
    return () => el.removeEventListener("scroll", handler);
  }, [checkIfNearBottom]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (isNearBottomRef.current) {
      el.scrollTo({
        top: el.scrollHeight,
        behavior: isStreamingRef.current ? "smooth" : "instant",
      });
    }
  }, [messages]);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    isNearBottomRef.current = true;
    setShowScrollButton(false);
  }, []);

  async function handleSend(content?: string) {
    const text = (content ?? input).trim();
    if (!text || isSending) return;

    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: "USER",
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setInput("");
    setIsSending(true);
    isStreamingRef.current = false;
    isNearBottomRef.current = true;

    try {
      let activeSessionId = sessionId;
      if (!activeSessionId) {
        activeSessionId = await createChatSession();
        setSessionId(activeSessionId);

        const title = text.startsWith("/")
          ? text === "/artist-preferences"
            ? "Preferências do Artista"
            : text === "/production-artist"
              ? "Planejamento de Carreira"
              : text.slice(0, 50)
          : text.length > 50
            ? text.slice(0, 50) + "..."
            : text;

        setSessions((prev) => [
          { id: activeSessionId!, title, updatedAt: new Date().toISOString() },
          ...prev,
        ]);

        window.history.replaceState(null, "", `/chat/${activeSessionId}`);
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text, sessionId: activeSessionId }),
      });

      if (!response.ok) throw new Error("Chat request failed");

      const contentType = response.headers.get("content-type") ?? "";

      if (contentType.includes("application/json")) {
        const data = await response.json();
        setMessages((prev) => [...prev, data as ChatMessage]);
        setIsSending(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let accumulated = "";
      isStreamingRef.current = true;

      const streamMsgId = `stream-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        { id: streamMsgId, role: "ASSISTANT", content: "", createdAt: new Date().toISOString() },
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          try {
            const event = JSON.parse(jsonStr) as
              | { type: "delta"; content: string }
              | { type: "done"; message: ChatMessage }
              | { type: "error"; error: string };

            if (event.type === "delta") {
              accumulated += event.content;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === streamMsgId ? { ...m, content: accumulated } : m
                )
              );
            } else if (event.type === "done") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === streamMsgId ? (event.message as ChatMessage) : m
                )
              );
            } else if (event.type === "error") {
              setMessages((prev) => prev.filter((m) => m.id !== streamMsgId));
            }
          } catch {
            // skip
          }
        }
      }
    } catch {
      setMessages((prev) =>
        prev.filter((m) => !m.id.startsWith("temp-") && !m.id.startsWith("stream-"))
      );
    } finally {
      setIsSending(false);
      isStreamingRef.current = false;
    }
  }

  function handleDelete(id: string) {
    startDeleting(async () => {
      await deleteChatSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      setDeleteTarget(null);
      if (id === sessionId) router.push("/chat");
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const isEmpty = messages.length === 0;
  const hasStreamContent = messages.some((m) => m.id.startsWith("stream-") && m.content);

  // ── Sessions sidebar content ──
  const sessionsPanel = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between p-3 pb-2">
        <h3 className="text-sm font-semibold text-zinc-200">Conversas</h3>
        <button
          onClick={() => setShowSidebar(false)}
          className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-300 md:hidden"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="px-3 pb-2">
        <button
          onClick={() => {
            router.push("/chat");
            setShowSidebar(false);
          }}
          className="flex w-full items-center gap-2 rounded-lg border border-dashed border-zinc-700 px-3 py-2 text-sm text-zinc-400 transition hover:border-zinc-600 hover:bg-zinc-800 hover:text-zinc-200"
        >
          <Plus className="size-4" />
          Nova conversa
        </button>
      </div>

      <div className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
        {sessions.length === 0 ? (
          <p className="px-2 py-8 text-center text-xs text-zinc-600">
            Nenhuma conversa ainda
          </p>
        ) : (
          sessions.map((s) => (
            <div
              key={s.id}
              className={`group flex items-center gap-2 rounded-lg px-3 py-2.5 transition ${
                s.id === sessionId
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
              }`}
            >
              <button
                onClick={() => {
                  router.push(`/chat/${s.id}`);
                  setShowSidebar(false);
                }}
                className="flex min-w-0 flex-1 flex-col text-left"
              >
                <span className="truncate text-[13px] font-medium">
                  {s.title || "Nova conversa"}
                </span>
                <span className="text-[10px] text-zinc-600">
                  {timeAgo(s.updatedAt)}
                </span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteTarget(s.id);
                }}
                className="shrink-0 rounded p-1 text-zinc-600 opacity-0 transition hover:bg-zinc-700 hover:text-red-400 group-hover:opacity-100"
              >
                <Trash2 className="size-3" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <>
      {/*
        Mobile: full-screen (100dvh), no external chrome
        Desktop: fits within the layout shell with sidebar
      */}
      <div className="flex h-[100dvh] bg-zinc-950 md:h-[calc(100dvh-6.5rem)] md:gap-3">

        {/* ── Desktop sessions sidebar ── */}
        <div className="hidden w-64 shrink-0 flex-col rounded-xl border border-zinc-800 bg-zinc-950/50 md:flex">
          {sessionsPanel}
        </div>

        {/* ── Mobile sessions drawer (overlay) ── */}
        <AnimatePresence>
          {showSidebar && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-black/60 md:hidden"
                onClick={() => setShowSidebar(false)}
              />
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 350 }}
                className="fixed inset-y-0 left-0 z-50 w-[280px] border-r border-zinc-800 bg-zinc-950 md:hidden"
              >
                {sessionsPanel}
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* ── Chat area (full screen on mobile) ── */}
        <div className="flex min-w-0 flex-1 flex-col">

          {/* ── Top bar ── */}
          <div className="flex shrink-0 items-center justify-between border-b border-zinc-800/60 px-3 py-2.5 md:border-0 md:px-0 md:pb-2 md:pt-0">
            <div className="flex items-center gap-2.5">
              {/* Mobile: sidebar toggle */}
              <button
                onClick={() => setShowSidebar(true)}
                className="flex size-9 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-800 md:hidden"
              >
                <PanelLeftOpen className="size-5" />
              </button>
              <div className="min-w-0">
                <h1 className="truncate text-[15px] font-semibold text-zinc-100">
                  Equipe de Marketing
                </h1>
                <div className="flex items-center gap-1.5">
                  <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
                  <p className="text-[11px] text-zinc-500">Online</p>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/chat")}
              className="size-9 shrink-0 p-0 text-zinc-500 hover:text-zinc-300 md:h-auto md:w-auto md:px-3"
            >
              <Plus className="size-5 md:size-4" />
              <span className="ml-1.5 hidden md:inline text-sm">Nova</span>
            </Button>
          </div>

          {/* ── Messages scroll area ── */}
          <div className="relative flex-1 overflow-hidden">
            <div
              ref={scrollRef}
              className="absolute inset-0 overflow-y-auto overflow-x-hidden overscroll-contain"
            >
              {isEmpty ? (
                /* ── Empty state ── */
                <div className="flex h-full flex-col items-center justify-center gap-5 px-5">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="flex size-16 items-center justify-center rounded-2xl bg-zinc-800/80"
                  >
                    <Sparkles className="size-8 text-zinc-400" />
                  </motion.div>
                  <div className="max-w-md space-y-2 text-center">
                    <h2 className="text-lg font-semibold text-zinc-100">
                      Sua equipe está pronta
                    </h2>
                    <p className="text-[13px] leading-relaxed text-zinc-500">
                      Marketing, social media, analista de dados e especialista em Spotify. Tudo sob medida para você.
                    </p>
                  </div>

                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.4 }}
                    className="grid w-full max-w-md grid-cols-1 gap-2 sm:grid-cols-2"
                  >
                    {suggestedPrompts.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.label}
                          onClick={() => handleSend(item.prompt)}
                          disabled={isSending}
                          className="group flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 text-left transition active:scale-[0.98] hover:border-zinc-700 hover:bg-zinc-800/50"
                        >
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 transition group-hover:bg-violet-500/20">
                            <Icon className="size-4 text-violet-400" />
                          </div>
                          <span className="text-[13px] font-medium text-zinc-400 transition group-hover:text-zinc-200">
                            {item.label}
                          </span>
                        </button>
                      );
                    })}
                  </motion.div>

                  {sessions.length > 0 && (
                    <button
                      onClick={() => setShowSidebar(true)}
                      className="flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] text-zinc-500 transition hover:text-zinc-300 md:hidden"
                    >
                      <History className="size-3.5" />
                      {sessions.length} conversa{sessions.length !== 1 ? "s" : ""} anterior{sessions.length !== 1 ? "es" : ""}
                      <ChevronRight className="size-3" />
                    </button>
                  )}
                </div>
              ) : (
                /* ── Messages list ── */
                <div className="mx-auto max-w-3xl px-4 py-5 sm:px-6">
                  {messages.map((msg) => (
                    <div key={msg.id} className="mb-5 last:mb-0">
                      {msg.role === "USER" ? (
                        /* User message */
                        <div className="flex justify-end">
                          <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-zinc-800 px-4 py-2.5 sm:max-w-[70%]">
                            <p className="whitespace-pre-wrap break-words text-[14px] leading-[1.6] text-zinc-100">
                              {msg.content}
                            </p>
                          </div>
                        </div>
                      ) : (
                        /* Assistant message — no bubble, like ChatGPT */
                        <div className="flex gap-3">
                          <div className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-zinc-800">
                            <Bot className="size-4 text-zinc-400" />
                          </div>
                          <div className="min-w-0 flex-1 overflow-hidden pt-0.5">
                            {msg.content ? (
                              <RichMessage content={msg.content} />
                            ) : (
                              <div className="flex items-center gap-1.5 py-3">
                                <span className="size-2 animate-bounce rounded-full bg-zinc-600 [animation-delay:0ms]" />
                                <span className="size-2 animate-bounce rounded-full bg-zinc-600 [animation-delay:150ms]" />
                                <span className="size-2 animate-bounce rounded-full bg-zinc-600 [animation-delay:300ms]" />
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Typing indicator */}
                  {isSending && !hasStreamContent && !messages.some((m) => m.id.startsWith("stream-")) && (
                    <div className="flex gap-3 pt-2">
                      <div className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-zinc-800">
                        <Bot className="size-4 text-zinc-400" />
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <Loader2 className="size-4 animate-spin text-zinc-500" />
                        <span className="text-[13px] text-zinc-500">Analisando...</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Scroll to bottom */}
            <AnimatePresence>
              {showScrollButton && (
                <motion.button
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  onClick={scrollToBottom}
                  className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-900/95 px-3 py-1.5 text-xs font-medium text-zinc-300 shadow-lg backdrop-blur-sm transition active:scale-95 hover:bg-zinc-800"
                >
                  <ArrowDown className="size-3.5" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* ── Mode indicator ── */}
          {activeMode && (
            <div className="flex shrink-0 items-center gap-2 border-t border-zinc-800/40 px-4 py-1.5">
              <Badge variant="secondary" className="bg-violet-500/15 text-violet-300 border-violet-500/20 text-[11px]">
                {activeMode === "artist-preferences" ? "Preferências" : "Produção"}
              </Badge>
              <span className="text-[11px] text-zinc-600">Modo especial ativo</span>
            </div>
          )}

          {/* ── Input area — pinned at bottom, full width ── */}
          <div className="shrink-0 border-t border-zinc-800/60 bg-zinc-950 px-3 pb-[env(safe-area-inset-bottom)] md:border-0 md:bg-transparent md:px-0">
            <div className="mx-auto flex max-w-3xl items-end gap-2 py-2.5 md:py-2">
              <div className="relative flex-1">
                {/* Slash command hints */}
                <AnimatePresence>
                  {showCommandHint && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className="absolute bottom-full left-0 z-10 mb-2 w-full overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl"
                    >
                      {slashCommands
                        .filter((cmd) => cmd.command.startsWith(input.trim()) || input.trim() === "/")
                        .map((cmd) => (
                          <button
                            key={cmd.command}
                            onClick={() => {
                              setInput(cmd.command);
                              setShowCommandHint(false);
                            }}
                            className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-zinc-800"
                          >
                            <span className="text-sm font-medium text-violet-400">{cmd.command}</span>
                            <span className="text-xs text-zinc-500">{cmd.description}</span>
                          </button>
                        ))}
                    </motion.div>
                  )}
                </AnimatePresence>
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    setShowCommandHint(e.target.value.startsWith("/") && e.target.value.length < 25);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder={activeMode ? "Continue a conversa..." : "Mensagem..."}
                  disabled={isSending}
                  className="min-h-[44px] max-h-32 resize-none rounded-2xl border-zinc-800 bg-zinc-900 pr-12 text-[16px] leading-6 text-zinc-100 placeholder:text-zinc-600 md:text-sm"
                  rows={1}
                />
                {/* Send button inside textarea on mobile (ChatGPT style) */}
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isSending}
                  className="absolute bottom-1.5 right-1.5 flex size-9 items-center justify-center rounded-xl bg-zinc-100 text-zinc-900 transition disabled:opacity-30 hover:bg-white active:scale-95 md:hidden"
                >
                  {isSending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                </button>
              </div>
              {/* Desktop send button (outside) */}
              <Button
                onClick={() => handleSend()}
                disabled={!input.trim() || isSending}
                className="hidden h-[44px] shrink-0 rounded-xl bg-zinc-100 px-4 text-zinc-900 transition hover:bg-white md:flex"
              >
                {isSending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="border-zinc-800 bg-zinc-900">
          <DialogHeader>
            <DialogTitle className="text-white">Excluir conversa</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Tem certeza que deseja excluir esta conversa? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              className="border-zinc-800 text-zinc-400 hover:bg-zinc-800"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 size-4" />
              )}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
