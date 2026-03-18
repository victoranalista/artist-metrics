"use client";

import { useRef, useEffect, useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { InlineChart, parseChartsFromContent } from "@/components/chat/inline-charts";
import {
  Bot,
  Send,
  Trash2,
  Loader2,
  MessageSquare,
  Sparkles,
  ExternalLink,
  Music,
  TrendingUp,
  Target,
  Lightbulb,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { sendChatMessage, clearChatHistory } from "@/lib/actions";
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
}

interface ChatClientProps {
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
];

// ── Markdown renderer ──

function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // Headings
        h1: ({ children }) => (
          <h3 className="mb-3 mt-5 border-b border-stone-300/10 pb-2 text-[15px] font-semibold tracking-tight text-stone-200 first:mt-0">
            {children}
          </h3>
        ),
        h2: ({ children }) => (
          <h4 className="mb-2 mt-4 text-[13px] font-semibold text-stone-300 first:mt-0">
            {children}
          </h4>
        ),
        h3: ({ children }) => (
          <h5 className="mb-1.5 mt-3 text-[13px] font-medium text-stone-400 first:mt-0">
            {children}
          </h5>
        ),
        p: ({ children }) => (
          <p className="mb-2.5 text-[13px] leading-relaxed text-stone-400 last:mb-0">
            {children}
          </p>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-stone-200">{children}</strong>
        ),
        em: ({ children }) => (
          <em className="text-stone-300 not-italic">{children}</em>
        ),
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-stone-300 underline decoration-stone-500/40 underline-offset-2 transition hover:text-stone-200"
          >
            {children}
            <ExternalLink className="inline size-2.5" />
          </a>
        ),
        ul: ({ children }) => (
          <ul className="mb-3 ml-1 space-y-1">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="mb-3 ml-1 space-y-1 [counter-reset:item]">
            {children}
          </ol>
        ),
        li: ({ children, ...props }) => {
          const isOrdered = (props as { node?: { parentNode?: { tagName?: string } } }).node?.parentNode?.tagName === "ol";
          return (
            <li className="flex gap-2.5 text-[13px] leading-relaxed text-stone-400">
              {isOrdered ? (
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md bg-stone-300/10 text-[10px] font-semibold text-stone-400 [counter-increment:item] before:content-[counter(item)]" />
              ) : (
                <span className="mt-[9px] size-1 shrink-0 rounded-full bg-stone-500" />
              )}
              <span className="flex-1">{children}</span>
            </li>
          );
        },
        code: ({ className, children }) => {
          const isBlock = className?.includes("language-");
          if (isBlock) {
            return (
              <div className="my-3 overflow-x-auto rounded-xl border border-stone-300/5 bg-stone-900/40 p-3">
                <code className="text-xs text-stone-400">{children}</code>
              </div>
            );
          }
          return (
            <code className="rounded-md bg-stone-300/10 px-1.5 py-0.5 text-xs font-medium text-stone-300">
              {children}
            </code>
          );
        },
        pre: ({ children }) => <>{children}</>,
        blockquote: ({ children }) => (
          <blockquote className="my-3 border-l-2 border-stone-500/30 bg-stone-300/[0.03] py-2 pl-4 pr-3">
            {children}
          </blockquote>
        ),
        hr: () => <hr className="my-4 border-stone-300/10" />,
        table: ({ children }) => (
          <div className="my-3 overflow-x-auto rounded-xl border border-stone-300/10">
            <table className="w-full text-[13px]">{children}</table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-stone-300/[0.04] text-[11px] font-medium uppercase tracking-wider text-stone-500">
            {children}
          </thead>
        ),
        th: ({ children }) => (
          <th className="px-3 py-2.5 text-left font-semibold">{children}</th>
        ),
        tbody: ({ children }) => (
          <tbody className="divide-y divide-stone-300/5">{children}</tbody>
        ),
        tr: ({ children }) => (
          <tr className="transition hover:bg-stone-300/[0.03]">{children}</tr>
        ),
        td: ({ children }) => (
          <td className="px-3 py-2 text-stone-400">{children}</td>
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

// ── Main component ──

export function ChatClient({ initialMessages }: ChatClientProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isSending, startSending] = useTransition();
  const [isClearing, startClearing] = useTransition();
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  function handleSend(content?: string) {
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

    startSending(async () => {
      try {
        const response = await sendChatMessage(text);
        setMessages((prev) => [...prev, response as ChatMessage]);
      } catch {
        setMessages((prev) =>
          prev.filter((m) => m.id !== tempUserMsg.id)
        );
      }
    });
  }

  function handleClear() {
    startClearing(async () => {
      await clearChatHistory();
      setMessages([]);
      setClearDialogOpen(false);
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-[calc(100vh-10rem)] flex-col pb-safe md:h-[calc(100vh-6.5rem)]">
      {/* Header — compacto */}
      <div className="flex items-center justify-between pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-zinc-800">
            <MessageSquare className="size-4 text-zinc-400" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold text-zinc-100 sm:text-base">
              Sua Equipe de Marketing
            </h1>
            <div className="flex items-center gap-1.5">
              <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
              <p className="truncate text-[10px] text-zinc-500 sm:text-xs">Online — Dedicada à Débora Kailany</p>
            </div>
          </div>
        </div>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setClearDialogOpen(true)}
            className="shrink-0 text-zinc-500 hover:text-red-400"
          >
            <Trash2 className="size-4" />
            <span className="ml-1.5 hidden sm:inline">Limpar</span>
          </Button>
        )}
      </div>

      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overscroll-contain rounded-xl border border-zinc-800 bg-zinc-950/50 p-3 sm:rounded-2xl sm:p-4"
      >
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-2 sm:gap-6">
            {/* Welcome */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="flex size-14 items-center justify-center rounded-2xl bg-zinc-800 sm:size-20 sm:rounded-3xl"
            >
              <Sparkles className="size-7 text-zinc-400 sm:size-10" />
            </motion.div>
            <div className="max-w-lg space-y-1.5 text-center sm:space-y-2">
              <h2 className="text-base font-semibold text-zinc-100 sm:text-xl">
                Débora, sua equipe está pronta
              </h2>
              <p className="text-xs leading-relaxed text-zinc-400 sm:text-sm">
                Diretor de marketing, social media, analista de dados e especialista em Spotify. Pesquisamos dados reais e montamos planos de ação sob medida.
              </p>
            </div>

            {/* Suggested prompts */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="grid w-full max-w-lg grid-cols-1 gap-2 sm:grid-cols-2"
            >
              {suggestedPrompts.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    onClick={() => handleSend(item.prompt)}
                    disabled={isSending}
                    className="group flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3 text-left transition hover:border-violet-500/30 hover:bg-violet-500/5"
                  >
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 transition group-hover:bg-violet-500/20">
                      <Icon className="size-4 text-violet-400" />
                    </div>
                    <span className="text-xs font-medium text-zinc-400 transition group-hover:text-zinc-200">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </motion.div>
          </div>
        ) : (
          <div className="space-y-5">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className={`flex gap-2 sm:gap-3 ${
                    msg.role === "USER" ? "justify-end" : "justify-start"
                  }`}
                >
                  {/* Assistant avatar — hidden on very small screens */}
                  {msg.role === "ASSISTANT" && (
                    <div className="mt-1 hidden size-7 shrink-0 items-center justify-center rounded-lg bg-zinc-800 sm:flex sm:size-8 sm:rounded-xl">
                      <Bot className="size-3.5 text-zinc-400 sm:size-4" />
                    </div>
                  )}

                  {/* Message bubble */}
                  <div
                    className={`min-w-0 text-sm leading-relaxed ${
                      msg.role === "USER"
                        ? "max-w-[85%] rounded-2xl rounded-br-md bg-zinc-800 px-3 py-2 text-zinc-100 sm:max-w-[75%] sm:px-4 sm:py-2.5"
                        : "max-w-[95%] rounded-2xl rounded-bl-md border border-zinc-800 bg-zinc-900/80 px-3 py-3 sm:max-w-[85%] sm:px-5 sm:py-4"
                    }`}
                  >
                    {msg.role === "USER" ? (
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <RichMessage content={msg.content} />
                      </div>
                    )}
                  </div>

                  {/* User avatar — hidden on very small screens */}
                  {msg.role === "USER" && (
                    <div className="mt-1 hidden size-7 shrink-0 items-center justify-center rounded-lg bg-zinc-800 sm:flex sm:size-8 sm:rounded-xl">
                      <User className="size-3.5 text-zinc-400 sm:size-4" />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Typing indicator */}
            {isSending && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 sm:gap-3"
              >
                <div className="hidden size-7 shrink-0 items-center justify-center rounded-lg bg-zinc-800 sm:flex sm:size-8 sm:rounded-xl">
                  <Bot className="size-3.5 text-zinc-400 sm:size-4" />
                </div>
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-zinc-800 bg-zinc-900/80 px-4 py-2.5 sm:px-5 sm:py-3">
                  <Loader2 className="size-3.5 animate-spin text-zinc-400" />
                  <span className="text-xs text-zinc-500">Analisando...</span>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="flex items-end gap-2 pt-2 sm:pt-3">
        <div className="relative flex-1">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pergunte sobre métricas, estratégias..."
            disabled={isSending}
            className="min-h-[44px] max-h-28 resize-none rounded-xl border-zinc-800 bg-zinc-900 text-sm text-zinc-100 placeholder:text-zinc-600 sm:min-h-[48px] sm:max-h-32"
            rows={1}
          />
        </div>
        <Button
          onClick={() => handleSend()}
          disabled={!input.trim() || isSending}
          className="h-[44px] shrink-0 rounded-xl bg-zinc-100 px-3 text-zinc-900 transition hover:bg-white sm:h-12 sm:px-4"
        >
          {isSending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
        </Button>
      </div>

      {/* Clear confirmation dialog */}
      <Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Limpar conversa</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja apagar todo o histórico? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setClearDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleClear}
              disabled={isClearing}
            >
              {isClearing ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 size-4" />
              )}
              Apagar tudo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
