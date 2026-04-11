/**
 * llm.ts — Google Gemini SDK مباشرة (مستقل عن مانوس)
 *
 * يحافظ على نفس الواجهة الخارجية (invokeLLM) حتى لا يحتاج أي ملف آخر للتغيير.
 * النموذج الافتراضي: gemini-2.5-flash (أسرع + أرخص + جودة عالية)
 * Fallback: gemini-2.0-flash
 */
import { GoogleGenAI, Type } from "@google/genai";
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
// Helpers
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function getClient(): GoogleGenAI {
  const key = ENV.googleAiKey;
  if (!key) throw new Error("GOOGLE_AI_KEY is not configured");
  return new GoogleGenAI({ apiKey: key });
}

/** تحويل رسائل OpenAI format إلى Gemini format */
function convertMessages(messages: Message[]): {
  systemInstruction?: string;
  contents: Array<{ role: "user" | "model"; parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> }>;
} {
  let systemInstruction: string | undefined;
  const contents: Array<{ role: "user" | "model"; parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> }> = [];

  for (const msg of messages) {
    const contentArray = Array.isArray(msg.content) ? msg.content : [msg.content];

    // system → systemInstruction
    if (msg.role === "system") {
      systemInstruction = contentArray
        .map(c => (typeof c === "string" ? c : (c as TextContent).text ?? ""))
        .join("\n");
      continue;
    }

    // tool/function responses → user
    const geminiRole = msg.role === "assistant" ? "model" : "user";

    const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

    for (const part of contentArray) {
      if (typeof part === "string") {
        parts.push({ text: part });
      } else if (part.type === "text") {
        parts.push({ text: (part as TextContent).text });
      } else if (part.type === "image_url") {
        const url = (part as ImageContent).image_url.url;
        // data URL → inlineData
        if (url.startsWith("data:")) {
          const [meta, data] = url.split(",");
          const mimeType = meta.split(":")[1].split(";")[0];
          parts.push({ inlineData: { mimeType, data } });
        } else {
          // URL مباشر → نمرره كنص مع تعليمات
          parts.push({ text: `[Image: ${url}]` });
        }
      } else {
        // file_url → نص
        parts.push({ text: `[File: ${(part as FileContent).file_url.url}]` });
      }
    }

    if (parts.length === 0) parts.push({ text: "" });
    contents.push({ role: geminiRole, parts });
  }

  // Gemini يتطلب أن يبدأ بـ user وينتهي بـ user
  // إذا كان آخر message هو model، نضيف user فارغ
  if (contents.length > 0 && contents[contents.length - 1].role === "model") {
    contents.push({ role: "user", parts: [{ text: "Continue." }] });
  }

  return { systemInstruction, contents };
}

/** تحويل JSON Schema إلى Gemini Schema format */
function convertJsonSchemaToGemini(schema: Record<string, unknown>): Record<string, unknown> {
  if (!schema || typeof schema !== "object") return schema;

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(schema)) {
    if (key === "type" && typeof value === "string") {
      result[key] = value.toUpperCase();
    } else if (key === "properties" && typeof value === "object" && value !== null) {
      result[key] = Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([k, v]) => [
          k,
          convertJsonSchemaToGemini(v as Record<string, unknown>),
        ])
      );
    } else if (key === "items" && typeof value === "object" && value !== null) {
      result[key] = convertJsonSchemaToGemini(value as Record<string, unknown>);
    } else if (key === "additionalProperties") {
      // Gemini لا يدعم هذا الخاصية — نتجاهلها
      continue;
    } else {
      result[key] = value;
    }
  }

  return result;
}

/** تحويل Tools إلى Gemini function declarations */
function convertTools(tools: Tool[]) {
  return tools.map(t => ({
    name: t.function.name,
    description: t.function.description ?? "",
    parameters: t.function.parameters
      ? convertJsonSchemaToGemini(t.function.parameters)
      : undefined,
  }));
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Main invokeLLM — drop-in replacement
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  const client = getClient();
  const modelName = "gemini-2.5-flash"; // النموذج الأحدث والأسرع من Google

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

  const { systemInstruction, contents } = convertMessages(messages);

  // بناء config
  const config: Record<string, unknown> = {
    maxOutputTokens: maxTokens || max_tokens || 8192,
  };

  if (systemInstruction) {
    config.systemInstruction = systemInstruction;
  }

  // Tools
  if (tools && tools.length > 0) {
    config.tools = [{ functionDeclarations: convertTools(tools) }];

    const tc = toolChoice || tool_choice;
    if (tc === "none") {
      config.toolConfig = { functionCallingConfig: { mode: "NONE" } };
    } else if (tc === "required") {
      config.toolConfig = { functionCallingConfig: { mode: "ANY" } };
    } else if (tc && typeof tc === "object" && "name" in tc) {
      config.toolConfig = {
        functionCallingConfig: {
          mode: "ANY",
          allowedFunctionNames: [(tc as ToolChoiceByName).name],
        },
      };
    } else if (tc && typeof tc === "object" && "function" in tc) {
      config.toolConfig = {
        functionCallingConfig: {
          mode: "ANY",
          allowedFunctionNames: [(tc as ToolChoiceExplicit).function.name],
        },
      };
    }
  }

  // JSON Schema response format
  const rf = responseFormat || response_format;
  const os = outputSchema || output_schema;

  if (rf?.type === "json_schema" || os) {
    const schema = rf?.type === "json_schema"
      ? (rf as { type: "json_schema"; json_schema: JsonSchema }).json_schema.schema
      : os!.schema;

    config.responseMimeType = "application/json";
    config.responseSchema = convertJsonSchemaToGemini(schema);
  } else if (rf?.type === "json_object") {
    config.responseMimeType = "application/json";
  }

  // استدعاء Gemini
  const response = await client.models.generateContent({
    model: modelName,
    contents,
    config: config as Parameters<typeof client.models.generateContent>[0]["config"],
  });

  const candidate = response.candidates?.[0];
  const finishReason = candidate?.finishReason ?? null;
  const usageMetadata = response.usageMetadata;

  // استخراج المحتوى
  let textContent = "";
  const toolCalls: ToolCall[] = [];

  for (const part of candidate?.content?.parts ?? []) {
    if (part.text) {
      textContent += part.text;
    } else if (part.functionCall) {
      toolCalls.push({
        id: `call_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        type: "function",
        function: {
          name: part.functionCall.name ?? "",
          arguments: JSON.stringify(part.functionCall.args ?? {}),
        },
      });
    }
  }

  const inputTokens = usageMetadata?.promptTokenCount ?? 0;
  const outputTokens = usageMetadata?.candidatesTokenCount ?? 0;

  // تسجيل التكلفة
  trackLLM({
    operation: "invokeLLM",
    inputTokens,
    outputTokens,
    model: modelName,
  }).catch(() => {});

  // بناء InvokeResult بنفس شكل OpenAI
  const result: InvokeResult = {
    id: `gemini-${Date.now()}`,
    created: Math.floor(Date.now() / 1000),
    model: modelName,
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: textContent,
          ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
        },
        finish_reason: finishReason?.toString().toLowerCase() ?? "stop",
      },
    ],
    usage: {
      prompt_tokens: inputTokens,
      completion_tokens: outputTokens,
      total_tokens: inputTokens + outputTokens,
    },
  };

  return result;
}
