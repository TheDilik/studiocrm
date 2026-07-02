export type ChatMessage = {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  createdAt?: string;
  pending?: boolean;
  toolCalls?: { name: string; input: unknown }[];
};
