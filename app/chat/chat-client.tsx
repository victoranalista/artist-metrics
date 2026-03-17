"use client";

import { useRef, useEffect, useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  Send,
  Trash2,
  Loader2,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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

export function ChatClient({ initialMessages }: ChatClientProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isSending, startSending] = useTransition();
  const [isClearing, startClearing] = useTransition();
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  function handleSend() {
    const content = input.trim();
    if (!content || isSending) return;

    // Optimistically add user message
    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: "USER",
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setInput("");

    startSending(async () => {
      try {
        const response = await sendChatMessage(content);
        setMessages((prev) => [...prev, response as ChatMessage]);
      } catch {
        // Remove optimistic message on error
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
    <div className="flex h-[calc(100vh-8rem)] flex-col md:h-[calc(100vh-6rem)]">
      {/* Header */}
      <div className="flex items-center justify-between pb-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-violet-500/20">
            <MessageSquare className="size-5 text-violet-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-zinc-100">
              Consultor IA
            </h1>
            <p className="text-sm text-zinc-400">
              Seu assistente de marketing musical
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setClearDialogOpen(true)}
            className="text-zinc-400 hover:text-red-400"
          >
            <Trash2 className="size-4" />
            <span className="ml-1.5 hidden sm:inline">Limpar conversa</span>
          </Button>
        )}
      </div>

      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950 p-4"
      >
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="flex size-16 items-center justify-center rounded-2xl bg-violet-500/20"
            >
              <Sparkles className="size-8 text-violet-400" />
            </motion.div>
            <div className="max-w-md space-y-2">
              <h2 className="text-lg font-medium text-zinc-100">
                Bem-vindo ao Consultor IA
              </h2>
              <p className="text-sm leading-relaxed text-zinc-400">
                Ola! Sou seu consultor de marketing musical. Pergunte-me sobre
                suas metricas, estrategias de crescimento ou qualquer duvida
                sobre sua carreira.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex gap-3 ${
                    msg.role === "USER" ? "justify-end" : "justify-start"
                  }`}
                >
                  {msg.role === "ASSISTANT" && (
                    <Avatar className="mt-0.5 size-8 shrink-0">
                      <AvatarFallback className="bg-zinc-800 text-violet-400">
                        <Bot className="size-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      msg.role === "USER"
                        ? "bg-violet-500/20 text-zinc-100"
                        : "bg-zinc-800 text-zinc-200"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Typing indicator */}
            {isSending && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3"
              >
                <Avatar className="mt-0.5 size-8 shrink-0">
                  <AvatarFallback className="bg-zinc-800 text-violet-400">
                    <Bot className="size-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex items-center gap-1.5 rounded-2xl bg-zinc-800 px-4 py-3">
                  <span className="size-2 animate-bounce rounded-full bg-zinc-500 [animation-delay:0ms]" />
                  <span className="size-2 animate-bounce rounded-full bg-zinc-500 [animation-delay:150ms]" />
                  <span className="size-2 animate-bounce rounded-full bg-zinc-500 [animation-delay:300ms]" />
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="flex items-end gap-2 pt-4">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Digite sua mensagem..."
          disabled={isSending}
          className="min-h-[44px] max-h-32 resize-none rounded-xl border-zinc-800 bg-zinc-900 text-zinc-100 placeholder:text-zinc-500"
          rows={1}
        />
        <Button
          onClick={handleSend}
          disabled={!input.trim() || isSending}
          size="lg"
          className="shrink-0 bg-violet-600 text-white hover:bg-violet-500"
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
              Tem certeza que deseja apagar todo o historico de mensagens? Esta
              acao nao pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setClearDialogOpen(false)}
            >
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
