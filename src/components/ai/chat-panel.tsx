"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcw, Send, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessageBubble } from "./chat-message";
import { QuickActions, type QuickAction } from "./quick-actions";
import type { ChatMessage } from "./types";

export function ChatPanel() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open || loaded) return;
    fetch("/api/ai/chat")
      .then((r) => r.json())
      .then((data) => {
        setMessages(data.messages ?? []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [open, loaded]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setError(null);
    setInput("");
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "USER", content: trimmed };
    const pendingMsg: ChatMessage = {
      id: `pending-${Date.now()}`,
      role: "ASSISTANT",
      content: "",
      pending: true,
    };
    setMessages((prev) => [...prev, userMsg, pendingMsg]);
    setSending(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка запроса");

      setMessages((prev) =>
        prev.map((m) =>
          m.id === pendingMsg.id
            ? { ...m, content: data.reply, pending: false, toolCalls: data.toolCalls }
            : m
        )
      );
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m.id !== pendingMsg.id));
      setError(e instanceof Error ? e.message : "Ошибка запроса");
    } finally {
      setSending(false);
    }
  }

  async function handleReset() {
    await fetch("/api/ai/chat", { method: "DELETE" });
    setMessages([]);
    setError(null);
  }

  function handleQuickAction(action: QuickAction) {
    if (action.autoSend) {
      send(action.prompt);
    } else {
      setInput(action.prompt);
      textareaRef.current?.focus();
    }
  }

  return (
    <>
      {/* Плавающая кнопка вызова */}
      <Button
        size="icon"
        className="fixed bottom-5 right-5 z-40 size-12 rounded-full shadow-lg"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Закрыть AI-помощника" : "Открыть AI-помощника"}
      >
        {open ? <X className="size-5" /> : <Sparkles className="size-5" />}
      </Button>

      {/* Панель */}
      {open && (
        <div className="fixed bottom-20 right-5 z-40 flex h-[32rem] w-[24rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-xl border bg-card shadow-2xl">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <span className="text-sm font-semibold">AI-помощник</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={handleReset}
              aria-label="Новый диалог"
              title="Новый диалог"
            >
              <RotateCcw className="size-3.5" />
            </Button>
          </div>

          <ScrollArea className="flex-1 px-4 py-3">
            <div className="space-y-4">
              {messages.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Спросите про просроченные задачи, рентабельность проекта, сводку
                  недели — или попросите составить письмо клиенту.
                </p>
              )}
              {messages.map((m) => (
                <ChatMessageBubble key={m.id} message={m} />
              ))}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>

          {error && (
            <p className="border-t bg-destructive/5 px-4 py-2 text-xs text-destructive">
              {error}
            </p>
          )}

          <div className="space-y-2 border-t p-3">
            <QuickActions onPick={handleQuickAction} />
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex items-end gap-2"
            >
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                placeholder="Спросите что-нибудь..."
                rows={1}
                className="max-h-24 min-h-9 resize-none py-2"
              />
              <Button type="submit" size="icon" className="shrink-0" disabled={sending}>
                <Send className="size-4" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
