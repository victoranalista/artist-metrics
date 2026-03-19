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
  Home,
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

interface AgentMetadata {
  agentId?: string;
  agentName?: string;
  agentEmoji?: string;
  agentColor?: string;
  agentRole?: string;
  isConclusion?: boolean;
  mode?: string;
  status?: string;
}

interface ChatMessage {
  id: string;
  role: "USER" | "ASSISTANT" | "SYSTEM" | string;
  content: string;
  createdAt: Date | string;
  metadata?: AgentMetadata | Record<string, unknown> | unknown;
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

// ── Agent color map ──

const agentColorMap: Record<string, { bg: string; text: string; border: string }> = {
  violet: { bg: "bg-violet-500/15", text: "text-violet-400", border: "border-violet-500/20" },
  blue: { bg: "bg-blue-500/15", text: "text-blue-400", border: "border-blue-500/20" },
  rose: { bg: "bg-rose-500/15", text: "text-rose-400", border: "border-rose-500/20" },
  emerald: { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/20" },
  amber: { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/20" },
  cyan: { bg: "bg-cyan-500/15", text: "text-cyan-400", border: "border-cyan-500/20" },
};

// ── Suggested prompts ──

const suggestedPrompts = [
  {
    icon: Music,
    label: "Presença digital",
    prompt: "Analisem minha presença digital em todas as plataformas e me deem um diagnóstico completo com plano de ação",
  },
  {
    icon: TrendingUp,
    label: "Crescimento",
    prompt: "Montem um plano de crescimento para os próximos 30 dias com ações semanais detalhadas",
  },
  {
    icon: Target,
    label: "Lançamento",
    prompt: "Criem uma estratégia completa de lançamento de música com cronograma de pré-save até pós-lançamento",
  },
  {
    icon: Lightbulb,
    label: "Conteúdo",
    prompt: "Me deem 10 ideias de conteúdo para Reels e TikTok que podem viralizar no meu nicho",
  },
  {
    icon: UserCog,
    label: "Preferências",
    prompt: "/artist-preferences",
  },
  {
    icon: Briefcase,
    label: "Carreira",
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

// ── Team gathering animation ──

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

const teamArrivalSets = [
  [
    { emoji: "📱", name: "Ana", color: "text-violet-400", message: "Oi Déb! Cheguei, tava deixando o Miguel na creche e quase esqueci a bolsa lá kkk" },
    { emoji: "📊", name: "Lucas", color: "text-blue-400", message: "Já puxei os números de ontem, vem coisa boa aí hein" },
    { emoji: "🎯", name: "Marina", color: "text-rose-400", message: "Presente! Cronograma aberto, café na mesa. Bora!" },
    { emoji: "🎵", name: "Rafael", color: "text-emerald-400", message: "Aee desculpa o atraso galera... o despertador traiu de novo 😅" },
    { emoji: "💡", name: "Júlia", color: "text-amber-400", message: "Genteee cheguei!! Tô CHEIA de ideias pra hoje!" },
    { emoji: "💼", name: "Pedro", color: "text-cyan-400", message: "Café na mão, experiência no currículo. Vamos trabalhar" },
  ],
  [
    { emoji: "📊", name: "Lucas", color: "text-blue-400", message: "Cheguei primeiro hoje hein! Tô vendo umas métricas interessantes..." },
    { emoji: "💼", name: "Pedro", color: "text-cyan-400", message: "Estou aqui, só terminando de ler umas notícias do mercado" },
    { emoji: "📱", name: "Ana", color: "text-violet-400", message: "Opa! Desculpa, o trânsito tava impossível. Mas já vi umas trends novas no caminho!" },
    { emoji: "🎯", name: "Marina", color: "text-rose-400", message: "To aqui! Já atualizei o quadro de tarefas. Alguém viu o Rafael?" },
    { emoji: "🎵", name: "Rafael", color: "text-emerald-400", message: "Mano eu tava ouvindo umas playlists e perdi a hora... mas confia que trouxe insights bons" },
    { emoji: "💡", name: "Júlia", color: "text-amber-400", message: "Cheguei cheguei! Gente, vocês viram aquele TikTok que viralizou ontem??" },
  ],
  [
    { emoji: "💡", name: "Júlia", color: "text-amber-400", message: "Oii Déb!! Gente eu já tô com 3 ideias de Reels prontas na cabeça" },
    { emoji: "📱", name: "Ana", color: "text-violet-400", message: "Calma Jú kk deixa a gente sentar primeiro! Oi Déb!" },
    { emoji: "📊", name: "Lucas", color: "text-blue-400", message: "Eae pessoal! Trouxe os dados fresquinhos pra discussão" },
    { emoji: "🎵", name: "Rafael", color: "text-emerald-400", message: "Perdão a demora, tava analisando umas playlists novas que saíram hoje" },
    { emoji: "💼", name: "Pedro", color: "text-cyan-400", message: "Bom, já que estamos todos aqui... alguém quer café?" },
    { emoji: "🎯", name: "Marina", color: "text-rose-400", message: "Eu aceito! Já organizei a pauta de hoje. Tá tudo anotado aqui" },
  ],
];

function getTeamArrival() {
  const idx = Math.floor(Math.random() * teamArrivalSets.length);
  return teamArrivalSets[idx];
}

function TeamGatheringAnimation() {
  const [visibleCount, setVisibleCount] = useState(0);
  const [teamMessages] = useState(() => getTeamArrival());
  const [greeting] = useState(() => getGreeting());

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    for (let i = 0; i < teamMessages.length; i++) {
      timers.push(
        setTimeout(() => setVisibleCount(i + 1), 400 + i * 450)
      );
    }
    return () => timers.forEach(clearTimeout);
  }, [teamMessages.length]);

  return (
    <div className="space-y-2.5 pt-3">
      {/* Greeting */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-zinc-900/80 to-zinc-900/40 px-4 py-3"
      >
        <motion.span
          animate={{ rotate: [0, 14, -8, 14, -4, 10, 0] }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
          className="text-xl"
        >
          👋
        </motion.span>
        <div>
          <p className="text-[13px] font-medium text-zinc-200">
            {greeting}, Débora Kailany!
          </p>
          <p className="text-[11px] text-zinc-500">
            Que bom ter você aqui! A galera já tá chegando...
          </p>
        </div>
      </motion.div>

      {/* Agents arriving one by one */}
      <AnimatePresence>
        {teamMessages.slice(0, visibleCount).map((agent) => (
          <motion.div
            key={agent.name}
            initial={{ opacity: 0, x: -16, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="flex items-start gap-2.5 pl-1"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 20, delay: 0.05 }}
              className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-zinc-800/80"
            >
              <span className="text-[11px]">{agent.emoji}</span>
            </motion.div>
            <div className="min-w-0 flex-1">
              <span className={`text-[11px] font-semibold ${agent.color}`}>{agent.name}</span>
              <p className="text-[12px] leading-relaxed text-zinc-500">{agent.message}</p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Loading state after all arrive */}
      {visibleCount >= teamMessages.length && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex items-center gap-2 py-1 pl-9"
        >
          <span className="size-1.5 animate-bounce rounded-full bg-zinc-600 [animation-delay:0ms]" />
          <span className="size-1.5 animate-bounce rounded-full bg-zinc-600 [animation-delay:150ms]" />
          <span className="size-1.5 animate-bounce rounded-full bg-zinc-600 [animation-delay:300ms]" />
          <span className="ml-1 text-[11px] italic text-zinc-600">
            organizando as ideias...
          </span>
        </motion.div>
      )}
    </div>
  );
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
  // Keep sessions in sync when server data changes
  useEffect(() => { setSessions(initialSessions); }, [initialSessions]);
  const [sessionId, setSessionId] = useState<string | null>(currentSessionId);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isDeleting, startDeleting] = useTransition();
  const [showCommandHint, setShowCommandHint] = useState(false);
  const [activeAgentName, setActiveAgentName] = useState<string | null>(null);
  const [showGathering, setShowGathering] = useState(false);
  const showGatheringRef = useRef(false);
  const gatheringTimerRef = useRef<NodeJS.Timeout | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const isStreamingRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync state when navigating between sessions (e.g. "Nova conversa" button)
  useEffect(() => {
    setSessionId(currentSessionId);
    setMessages(initialMessages);
    setInput("");
    setIsSending(false);
    setShowGathering(false);
    showGatheringRef.current = false;
    setActiveAgentName(null);
    if (gatheringTimerRef.current) {
      clearTimeout(gatheringTimerRef.current);
      gatheringTimerRef.current = null;
    }
  }, [currentSessionId, initialMessages]);

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
    setShowGathering(true);
    showGatheringRef.current = true;
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
      isStreamingRef.current = true;

      // Track current streaming agent
      let currentStreamId: string | null = null;
      const accumulatedByAgent: Record<string, string> = {};

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
              | { type: "agent_start"; agentId: string; name: string; emoji: string; role: string; color: string; isConclusion?: boolean }
              | { type: "delta"; content: string; agentId?: string }
              | { type: "agent_done"; agentId: string }
              | { type: "done"; messages: ChatMessage[] }
              | { type: "error"; error: string };

            if (event.type === "agent_start") {
              const streamId = `stream-${event.agentId}-${Date.now()}`;
              currentStreamId = streamId;
              accumulatedByAgent[streamId] = "";

              // If gathering animation is still showing, wait for all agents to arrive + reading time
              if (showGatheringRef.current) {
                await new Promise<void>((resolve) => {
                  // 6 agents arrive over ~3s (400ms + 5*450ms), then 5s to read = ~8s total
                  const waitTime = 8000;
                  gatheringTimerRef.current = setTimeout(() => {
                    setShowGathering(false);
                    showGatheringRef.current = false;
                    // Wait for exit animation to finish
                    setTimeout(resolve, 400);
                  }, waitTime);
                });
              }

              setActiveAgentName(`${event.emoji} ${event.name}${event.isConclusion ? " (Conclusão)" : ""}`);
              setMessages((prev) => [
                ...prev,
                {
                  id: streamId,
                  role: "ASSISTANT",
                  content: "",
                  createdAt: new Date().toISOString(),
                  metadata: {
                    agentId: event.agentId,
                    agentName: event.name,
                    agentEmoji: event.emoji,
                    agentColor: event.color,
                    agentRole: event.role,
                    isConclusion: event.isConclusion,
                  },
                },
              ]);
            } else if (event.type === "delta" && currentStreamId) {
              accumulatedByAgent[currentStreamId] = (accumulatedByAgent[currentStreamId] ?? "") + event.content;
              const accumulated = accumulatedByAgent[currentStreamId];
              const sid = currentStreamId;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === sid ? { ...m, content: accumulated } : m
                )
              );
            } else if (event.type === "agent_done") {
              setActiveAgentName(null);
            } else if (event.type === "done") {
              // Replace all stream messages with saved DB messages
              const savedMessages = event.messages as ChatMessage[];
              setMessages((prev) => {
                const nonStream = prev.filter((m) => !m.id.startsWith("stream-"));
                return [...nonStream, ...savedMessages];
              });
              setActiveAgentName(null);
            } else if (event.type === "error") {
              setMessages((prev) => prev.filter((m) => !m.id.startsWith("stream-")));
              setActiveAgentName(null);
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
      setActiveAgentName(null);
    } finally {
      setIsSending(false);
      isStreamingRef.current = false;
      setActiveAgentName(null);
      setShowGathering(false);
      showGatheringRef.current = false;
      if (gatheringTimerRef.current) {
        clearTimeout(gatheringTimerRef.current);
        gatheringTimerRef.current = null;
      }
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
            <div className="flex items-center gap-1.5">
              {/* Mobile: home button */}
              <button
                onClick={() => router.push("/dashboard")}
                className="flex size-9 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-800 md:hidden"
              >
                <Home className="size-5" />
              </button>
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
                <div className="flex h-full flex-col items-center justify-center gap-4 px-3 sm:gap-5 sm:px-5">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="flex size-16 items-center justify-center rounded-2xl bg-zinc-800/80"
                  >
                    <Sparkles className="size-8 text-zinc-400" />
                  </motion.div>
                  <div className="max-w-md space-y-2 text-center sm:space-y-2.5">
                    <h2 className="text-base font-semibold text-zinc-100 sm:text-lg">
                      E aí, Débs! 👋
                    </h2>
                    <div className="flex items-center justify-center gap-1.5">
                      {[
                        { emoji: "📱", label: "Ana" },
                        { emoji: "📊", label: "Lucas" },
                        { emoji: "🎯", label: "Marina" },
                        { emoji: "🎵", label: "Rafael" },
                        { emoji: "💡", label: "Júlia" },
                        { emoji: "💼", label: "Pedro" },
                      ].map((agent, i) => (
                        <motion.div
                          key={agent.label}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.3 + i * 0.08, type: "spring", stiffness: 400, damping: 15 }}
                          className="flex flex-col items-center gap-0.5"
                          title={agent.label}
                        >
                          <span className="text-base sm:text-lg">{agent.emoji}</span>
                          <span className="text-[8px] text-zinc-600 sm:text-[9px]">{agent.label}</span>
                        </motion.div>
                      ))}
                    </div>
                    <p className="text-[11px] leading-relaxed text-zinc-500 sm:text-[12px]">
                      Sua equipe de marketing tá online e pronta pra trabalhar. É só mandar que a gente se organiza!
                    </p>
                  </div>

                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.4 }}
                    className="grid w-full max-w-md grid-cols-2 gap-1.5 sm:gap-2"
                  >
                    {suggestedPrompts.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.label}
                          onClick={() => handleSend(item.prompt)}
                          disabled={isSending}
                          className="group flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 p-2 text-left transition active:scale-[0.98] hover:border-zinc-700 hover:bg-zinc-800/50 sm:gap-3 sm:p-3"
                        >
                          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 transition group-hover:bg-violet-500/20 sm:size-8">
                            <Icon className="size-3.5 text-violet-400 sm:size-4" />
                          </div>
                          <span className="text-[11px] font-medium leading-tight text-zinc-400 transition group-hover:text-zinc-200 sm:text-[13px]">
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
                  {messages.map((msg) => {
                    const meta = msg.metadata as AgentMetadata | null;
                    const agentColor = meta?.agentColor ? agentColorMap[meta.agentColor] : null;

                    return (
                      <motion.div
                        key={msg.id}
                        initial={msg.id.startsWith("stream-") || msg.id.startsWith("temp-") ? { opacity: 0, y: 8 } : false}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className="mb-5 last:mb-0"
                      >
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
                          /* Agent message */
                          <div className="flex gap-3">
                            {/* Agent avatar */}
                            <div className={`mt-1 flex size-7 shrink-0 items-center justify-center rounded-full ${agentColor ? agentColor.bg : "bg-zinc-800"}`}>
                              {meta?.agentEmoji ? (
                                <span className="text-sm leading-none">{meta.agentEmoji}</span>
                              ) : (
                                <Bot className="size-4 text-zinc-400" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1 overflow-hidden pt-0.5">
                              {/* Agent name & role */}
                              {meta?.agentName && (
                                <div className="mb-1 flex items-center gap-2">
                                  <span className={`text-[12px] font-semibold ${agentColor ? agentColor.text : "text-zinc-400"}`}>
                                    {meta.agentName}
                                  </span>
                                  <span className="text-[10px] text-zinc-600">
                                    {meta.agentRole}
                                  </span>
                                  {meta.isConclusion && (
                                    <Badge variant="secondary" className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[9px] px-1.5 py-0">
                                      Conclusão
                                    </Badge>
                                  )}
                                </div>
                              )}
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
                      </motion.div>
                    );
                  })}

                  {/* Team gathering animation — shows agents "arriving" */}
                  <AnimatePresence>
                    {showGathering && (
                      <motion.div
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.4 }}
                      >
                        <TeamGatheringAnimation />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Active agent typing indicator */}
                  {isSending && activeAgentName && messages.some((m) => m.id.startsWith("stream-")) && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex gap-3 pt-2"
                    >
                      <div className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-zinc-800">
                        <span className="text-sm leading-none">{activeAgentName.split(" ")[0]}</span>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <span className="size-2 animate-bounce rounded-full bg-zinc-600 [animation-delay:0ms]" />
                        <span className="size-2 animate-bounce rounded-full bg-zinc-600 [animation-delay:150ms]" />
                        <span className="size-2 animate-bounce rounded-full bg-zinc-600 [animation-delay:300ms]" />
                        <span className="ml-1 text-[12px] text-zinc-600">
                          {activeAgentName} digitando...
                        </span>
                      </div>
                    </motion.div>
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
