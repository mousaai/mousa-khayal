/**
 * manusLLM.ts — استدعاء Manus Built-in LLM مباشرة
 *
 * يُستخدم من قِبل HybridRouter كـ provider أول (مجاني)
 * قبل الانتقال لـ OpenAI عند الفشل
 */

import { ENV } from "./env";
import type { InvokeParams, InvokeResult } from "./llm";

export async function invokeLLMWithManus(params: InvokeParams): Promise<InvokeResult> {
  if (!ENV.forgeApiKey || !ENV.forgeApiUrl) {
    throw new Error("Manus LLM not configured: BUILT_IN_FORGE_API_KEY or BUILT_IN_FORGE_API_URL missing");
  }

  const baseUrl = ENV.forgeApiUrl.endsWith("/") ? ENV.forgeApiUrl : `${ENV.forgeApiUrl}/`;
  const url = new URL("llm.v1.LLMService/Chat", baseUrl).toString();

  // تحويل الرسائل لصيغة Manus
  const messages = params.messages.map((msg) => {
    const content = Array.isArray(msg.content)
      ? msg.content
          .map((c) => {
            if (typeof c === "string") return c;
            if (c.type === "text") return c.text;
            if (c.type === "image_url") return `[Image: ${c.image_url.url}]`;
            if (c.type === "file_url") return `[File: ${c.file_url.url}]`;
            return "";
          })
          .join("\n")
      : typeof msg.content === "string"
      ? msg.content
      : JSON.stringify(msg.content);

    return { role: msg.role, content };
  });

  // إعداد response_format
  const responseFormat = params.responseFormat || params.response_format;
  const outputSchema = params.outputSchema || params.output_schema;

  const body: Record<string, unknown> = { messages };

  if (responseFormat) {
    body.response_format = responseFormat;
  } else if (outputSchema) {
    body.response_format = {
      type: "json_schema",
      json_schema: outputSchema,
    };
  }

  if (params.tools && params.tools.length > 0) {
    body.tools = params.tools;
  }

  const maxTokens = params.maxTokens || params.max_tokens;
  if (maxTokens) body.max_tokens = maxTokens;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "connect-protocol-version": "1",
      authorization: `Bearer ${ENV.forgeApiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Manus LLM failed (${response.status}): ${detail}`);
  }

  const raw = await response.json() as {
    id?: string;
    choices?: Array<{
      message: { role: string; content: string };
      finish_reason?: string;
    }>;
    usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  };

  // تحويل استجابة Manus لصيغة OpenAI المتوافقة مع InvokeResult
  return {
    id: raw.id ?? `manus-${Date.now()}`,
    created: Math.floor(Date.now() / 1000),
    model: "manus-built-in",
    choices: (raw.choices ?? []).map((c, i) => ({
      index: i,
      message: {
        role: (c.message.role as "assistant"),
        content: c.message.content,
      },
      finish_reason: c.finish_reason ?? "stop",
    })),
    usage: raw.usage,
  };
}
