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

export interface BrainResult {
  intent: string;
  args: Record<string, string | number | boolean | null>;
  missing: string[];
  needs_confirmation: boolean;
  reply?: string;
  actions?: Array<{
    type: "create_dir" | "write_file" | "run_script";
    path?: string;
    content?: string;
    script?: string;
  }>;
}

export interface DiagnoseResult {
  summary: string;
  probable_cause: string;
  safe_next_steps: Array<{ skill: string; args: Record<string, string | number> }>;
  needs_confirmation: boolean;
}

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

export async function interpretStrictJson(input: string): Promise<BrainResult | null> {
  const system = [
    "Seu nome é Tur.",
    "Você é o interpretador do Turion (assistente DevOps).",
    "Personalidade: positiva, amigável e solidária; calma, paciente e respeitosa; fala natural e próxima; explica com clareza; adapta o tom ao contexto.",
    "Retorne APENAS JSON válido e nada mais.",
    "Chaves obrigatórias: intent, args, missing, needs_confirmation.",
    "Chave opcional: reply (string com resposta ao usuário).",
    "Chave opcional: actions (array).",
    "intent: string UPPERCASE.",
    "args: objeto simples.",
    "missing: array de strings.",
    "needs_confirmation: boolean.",
    "reply: resposta curta e natural em português (ex: saudar quando o usuário diz oi).",
    "actions: itens com type (create_dir|write_file|run_script) e campos correspondentes.",
  ].join(" ");

  const content = await callXai(system, input);
  return extractJson(content);
}

export async function diagnoseLogs(input: string): Promise<DiagnoseResult | null> {
  const system = [
    "Você é Tur, assistente DevOps.",
    "Receberá logs curtos e deve responder APENAS JSON válido.",
    "Chaves obrigatórias: summary, probable_cause, safe_next_steps, needs_confirmation.",
    "summary: string curta.",
    "probable_cause: string curta.",
    "safe_next_steps: array de objetos {skill, args}.",
    "needs_confirmation: boolean.",
  ].join(" ");

  const content = await callXai(system, input);
  return extractJson(content) as DiagnoseResult | null;
}
