import { Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { TOOL_LABELS } from "@/lib/ai/tool-labels";
import type { ChatMessage } from "./types";

export function ChatMessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "USER";

  return (
    <div className={cn("flex gap-2", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted"
        )}
      >
        {isUser ? <User className="size-3.5" /> : <Bot className="size-3.5" />}
      </div>
      <div className={cn("min-w-0 max-w-[85%] space-y-1.5", isUser && "items-end")}>
        {!!message.toolCalls?.length && (
          <div className="flex flex-wrap gap-1">
            {message.toolCalls.map((t, i) => (
              <span
                key={i}
                className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
              >
                {TOOL_LABELS[t.name] ?? t.name}
              </span>
            ))}
          </div>
        )}
        <div
          className={cn(
            "whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm",
            isUser
              ? "rounded-tr-sm bg-primary text-primary-foreground"
              : "rounded-tl-sm bg-muted"
          )}
        >
          {message.pending ? (
            <span className="inline-flex items-center gap-1">
              <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-current" />
            </span>
          ) : (
            message.content
          )}
        </div>
      </div>
    </div>
  );
}
