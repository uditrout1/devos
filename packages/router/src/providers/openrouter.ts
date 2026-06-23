import type { Message, MessageContent, ModelCapability, ModelResponse, ProviderType } from "@loopforge/core"

// Model tiers on OpenRouter — cheapest capable model per tier
const TIER_MODELS: Record<ModelCapability, string> = {
  small: "qwen/qwen-2.5-7b-instruct",
  medium: "anthropic/claude-haiku-4-5-20251001",
  frontier: "anthropic/claude-sonnet-4-6",
}

// Approximate cost per 1M tokens (input/output average) in USD
const MODEL_COST_PER_1M: Record<string, number> = {
  "qwen/qwen-2.5-7b-instruct": 0.1,
  "anthropic/claude-haiku-4-5-20251001": 0.8,
  "anthropic/claude-sonnet-4-6": 3.0,
}

interface OpenRouterResponse {
  choices: Array<{
    message: { content: string }
  }>
  model: string
  usage: {
    prompt_tokens: number
    completion_tokens: number
  }
}

function serializeContent(content: MessageContent): string | Array<{ type: string; [key: string]: unknown }> {
  if (typeof content === "string") return content
  return content.map((part) => {
    if (part.type === "text") return { type: "text", text: part.text }
    // ImagePart
    if (part.source.type === "base64") {
      return {
        type: "image",
        source: { type: "base64", media_type: part.source.mediaType, data: part.source.data },
      }
    }
    return { type: "image", source: { type: "url", url: part.source.url } }
  })
}

export async function callOpenRouter(
  messages: Message[],
  capability: ModelCapability,
  apiKey: string,
  modelOverride?: string,
): Promise<ModelResponse> {
  const model = modelOverride ?? TIER_MODELS[capability]
  const costPer1M = MODEL_COST_PER_1M[model] ?? 1.0

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://loopforge.dev",
      "X-Title": "LoopForge",
    },
    body: JSON.stringify({
      model,
      messages: messages.map((m) => ({ role: m.role, content: serializeContent(m.content) })),
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`OpenRouter error ${res.status}: ${body}`)
  }

  const data = (await res.json()) as OpenRouterResponse
  const choice = data.choices[0]
  if (!choice) throw new Error("OpenRouter returned no choices")

  const inputTokens = data.usage.prompt_tokens
  const outputTokens = data.usage.completion_tokens
  const costUsd = ((inputTokens + outputTokens) / 1_000_000) * costPer1M

  return {
    content: choice.message.content,
    model,
    provider: "openrouter" as ProviderType,
    inputTokens,
    outputTokens,
    costUsd,
    routingDecision: {
      model,
      provider: "openrouter",
      complexityScore: 0,
      reason: "OpenRouter cloud routing",
      estimatedCostUsd: costUsd,
    },
  }
}
