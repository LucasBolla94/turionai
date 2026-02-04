export interface BrainResult {
  intent: string;
  args: Record<string, string | number | boolean | null>;
  missing: string[];
  needs_confirmation: boolean;
}

const DEFAULT_MODEL = "grok-4-1-fast-reasoning";
const XAI_ENDPOINT = "https://api.x.ai/v1/chat/completions";

function extractJson(text: string): BrainResult | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  const snippet = text.slice(start, end + 1);
  try {
    return JSON.parse(snippet) as BrainResult;
  } catch {
    return null;
  }
}

export async function interpretWithXai(input: string): Promise<BrainResult | null> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.TURION_XAI_MODEL || DEFAULT_MODEL;
  const system = [
    "You are an intent parser for a DevOps assistant.",
    "Return only valid JSON with keys: intent, args, missing, needs_confirmation.",
    "intent must be an uppercase string.",
    "args must be an object.",
    "missing must be an array of strings.",
    "needs_confirmation must be boolean.",
  ].join(" ");

  const body = {
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: input },
    ],
    temperature: 0,
  };

  const response = await fetch(XAI_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`xAI error ${response.status}: ${text}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content ?? "";
  return extractJson(content);
}
