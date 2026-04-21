/**
 * llm.ts — Manus Forge API (OpenAI-compatible)
 *
 * يستخدم Manus Forge API بدلاً من Google Gemini SDK مباشرة
 * لأن GOOGLE_AI_KEY لا يعمل خارج بيئة Manus (API_KEY_SERVICE_BLOCKED)
 *
 * Forge API متوافق مع OpenAI API format — نفس الواجهة الخارجية (invokeLLM)
 * النموذج الافتراضي: gemini-2.5-flash عبر Forge proxy
 */
import { ENV } from "./env";
import { trackLLM } from "../costTracker";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Types — نفس الواجهة الأصلية
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?: "audio/mpeg" | "audio/wav" | "application/pdf" | "audio/mp4" | "video/mp4";
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type ToolChoicePrimitive = "none" | "auto" | "required";
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = {
  type: "function";
  function: { name: string };
};
export type ToolChoice = ToolChoicePrimitive | ToolChoiceByName | ToolChoiceExplicit;

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};
export type OutputSchema = JsonSchema;
export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

export type ToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: Role;
      content: string | Array<TextContent | ImageContent | FileContent>;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Main invokeLLM — Manus Forge API (OpenAI-compatible)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  const forgeUrl = ENV.forgeApiUrl;
  const forgeKey = ENV.forgeApiKey;

  if (!forgeUrl || !forgeKey) {
    throw new Error("BUILT_IN_FORGE_API_URL or BUILT_IN_FORGE_API_KEY is not configured");
  }

  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format,
    maxTokens,
    max_tokens,
  } = params;

  const modelName = "gemini-2.5-flash";

  // تحويل المحتوى إلى OpenAI format
  const openAiMessages = messages.map((msg) => {
    const role = msg.role === "function" ? "tool" : msg.role;
    if (Array.isArray(msg.content)) {
      const parts = msg.content.map((part) => {
        if (typeof part === "string") return { type: "text", text: part };
        if (part.type === "file_url") return { type: "text", text: `[File: ${(part as FileContent).file_url.url}]` };
        return part;
      });
      return { role, content: parts };
    }
    return { role, content: msg.content };
  });

  // بناء الـ request body
  const body: Record<string, unknown> = {
    model: modelName,
    messages: openAiMessages,
    max_tokens: maxTokens || max_tokens || 8192,
  };

  // Tools
  if (tools && tools.length > 0) {
    body.tools = tools;
    const tc = toolChoice || tool_choice;
    if (tc) {
      if (typeof tc === "string") {
        body.tool_choice = tc;
      } else if ("name" in tc) {
        body.tool_choice = { type: "function", function: { name: (tc as ToolChoiceByName).name } };
      } else {
        body.tool_choice = tc;
      }
    }
  }

  // Response format
  const rf = responseFormat || response_format;
  const os = outputSchema || output_schema;

  if (rf?.type === "json_schema" || os) {
    const schema = rf?.type === "json_schema"
      ? (rf as { type: "json_schema"; json_schema: JsonSchema }).json_schema
      : os!;
    body.response_format = { type: "json_schema", json_schema: schema };
  } else if (rf?.type === "json_object") {
    body.response_format = { type: "json_object" };
  }

  // استدعاء Forge API
  const res = await fetch(`${forgeUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${forgeKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120_000),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Forge API HTTP ${res.status}: ${errBody.substring(0, 200)}`);
  }

  const data = await res.json() as InvokeResult;

  // تسجيل التكلفة
  const inputTokens = data.usage?.prompt_tokens ?? 0;
  const outputTokens = data.usage?.completion_tokens ?? 0;

  trackLLM({
    operation: "invokeLLM",
    inputTokens,
    outputTokens,
    model: modelName,
  }).catch(() => {});

  return data;
}
