const DEFAULT_MODEL = "grok-4-1-fast-reasoning";
const XAI_ENDPOINT = "https://api.x.ai/v1/chat/completions";

function getApiKey(): string | null {
  const apiKey = process.env.XAI_API_KEY;
  return apiKey || null;
}

function getModel(): string {
  return process.env.TURION_XAI_MODEL || DEFAULT_MODEL;
}

async function callXai(system: string, input: string): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("XAI_API_KEY não configurada.");
  }

  const model = getModel();
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
  return data?.choices?.[0]?.message?.content ?? "";
}

export async function chatWithXai(input: string): Promise<string> {
  const system = [
    "You are Turion, a DevOps assistant for servers and automation.",
    "Respond concisely in Portuguese.",
    "If the user greets you, greet back briefly.",
  ].join(" ");

  return callXai(system, input);
}
