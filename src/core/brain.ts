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
  questions?: string[];
  risk?: "low" | "medium" | "high";
  action?: "NONE" | "ASK" | "RUN_SKILL" | "RUN_PLAN";
  plan?: Array<{ skill: string; args: Record<string, string | number | boolean | null> }>;
  actions?: Array<{
    type: "create_dir" | "write_file" | "read_file" | "run_script";
    path?: string;
    content?: string;
    script?: string;
    max_bytes?: number;
  }>;
}

export interface DiagnoseResult {
  summary: string;
  probable_cause: string;
  safe_next_steps: Array<{ skill: string; args: Record<string, string | number> }>;
  needs_confirmation: boolean;
}

export interface OrganizerResult {
  digest: {
    summary: string;
    current_goal: string;
    last_action: string;
    next_step: string;
  };
  new_memories: {
    user_facts: Array<{ text: string; keywords?: string[]; weight?: number }>;
    project_facts: Array<{ text: string; keywords?: string[]; weight?: number }>;
    decisions: Array<{ text: string; keywords?: string[]; weight?: number }>;
    running_tasks: Array<{ text: string; keywords?: string[]; weight?: number }>;
    projects: Array<{
      name: string;
      repo_url?: string;
      domains?: string[];
      notes?: string;
      keywords?: string[];
      weight?: number;
    }>;
  };
  updates: Array<{ type: "project"; match: string; patch: Record<string, unknown> }>;
  dedupe: Array<{ drop_text: string; keep_text: string }>;
  keyword_index_updates: Record<string, string[]>;
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

function extractJsonGeneric<T>(text: string): T | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  const snippet = text.slice(start, end + 1);
  try {
    return JSON.parse(snippet) as T;
  } catch {
    return null;
  }
}

export async function interpretStrictJson(input: string): Promise<BrainResult | null> {
  const system = [
    "Seu nome é Tur.",
    "Você é o interpretador do Turion (assistente pessoal).",
    "Fale de forma humana, curta e clara, sem parecer robô.",
    "Estilo padrão: amigável e profissional. Nada de explicação excessiva.",
    "Use no máximo 1 emoji e só se o usuário estiver informal.",
    "Estrutura obrigatória do reply: (1) uma linha curta de reconhecimento, (2) resposta direta, (3) até 3 bullets se ajudar, (4) um exemplo quando explicar sistemas, (5) uma pergunta ou próximo passo.",
    "Retorne APENAS JSON válido e nada mais.",
    "Chaves obrigatórias: reply, intent, args, needs_confirmation, questions, risk, action, plan, missing.",
    "Chave opcional: actions (array).",
    "intent: string UPPERCASE.",
    "args: objeto simples.",
    "needs_confirmation: boolean.",
    "questions: array de strings.",
    "risk: low|medium|high.",
    "action: NONE|ASK|RUN_SKILL|RUN_PLAN.",
    "plan: array de {skill, args}.",
    "missing: array de strings.",
    "reply: resposta curta e natural em português.",
    "actions: itens com type (create_dir|write_file|read_file|run_script) e campos correspondentes.",
    "read_file: use apenas paths dentro de logs/ ou state/ e limite max_bytes.",
    "run_script: informe o nome do script no diretorio scripts (ex: update_self.sh).",
    "Para lembretes: use intent CRON_CREATE com args {action:'create', name:'reminder_<timestamp>', jobType:'reminder', schedule:'ISO-8601', payload:'{\"to\":\"<jid>\",\"message\":\"...\"}', runOnce:true}.",
    "Para emails: use intents EMAIL_CONNECT, EMAIL_LIST, EMAIL_READ, EMAIL_REPLY, EMAIL_DELETE, EMAIL_EXPLAIN, EMAIL_DRAFT.",
    "EMAIL_CONNECT args: action:'connect', provider, user, password. EMAIL_LIST args: action:'list', limit, unreadOnly. EMAIL_READ args: action:'read', id. EMAIL_REPLY args: action:'reply', id, body. EMAIL_DELETE args: action:'delete', id.",
    "EMAIL_EXPLAIN args: action:'explain', id. EMAIL_DRAFT args: action:'draft_reply', id, instruction.",
    "Para monitoramento de email: use intent CRON_CREATE com jobType 'email_monitor' e payload JSON {to, unreadOnly, limit}.",
  ].join(" ");

  const content = await callXai(system, input);
  return extractJson(content);
}

export async function diagnoseLogs(input: string): Promise<DiagnoseResult | null> {
  const system = [
    "Você é Tur, assistente pessoal.",
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

export async function summarizeConversation(input: string): Promise<{
  summary: string;
  current_goal: string;
  last_action: string;
  next_step: string;
} | null> {
  const system = [
    "Você é Tur, assistente pessoal.",
    "Resuma a conversa em JSON estrito.",
    "Campos obrigatórios: summary, current_goal, last_action, next_step.",
    "summary: até 5 linhas, curto.",
    "current_goal: o objetivo atual do usuário.",
    "last_action: a última ação feita.",
    "next_step: o próximo passo lógico (ou vazio).",
  ].join(" ");

  const content = await callXai(system, input);
  return extractJsonGeneric<{
    summary: string;
    current_goal: string;
    last_action: string;
    next_step: string;
  }>(content);
}

export async function organizeMemory(input: string): Promise<OrganizerResult | null> {
  const system = [
    "Você é Tur, assistente pessoal.",
    "Tarefa: organizar memória útil a partir de conversas recentes.",
    "Responda APENAS JSON válido.",
    "Não invente dados. Seja conservador.",
    "Memória útil: user_facts, project_facts, decisions, running_tasks e projetos.",
    "Evite duplicatas (use dedupe quando necessário).",
    "Formato obrigatório:",
    "{",
    '"digest":{"summary":"...","current_goal":"...","last_action":"...","next_step":"..."},',
    '"new_memories":{"user_facts":[{text,keywords?,weight?}],"project_facts":[{text,keywords?,weight?}],"decisions":[...],"running_tasks":[...],"projects":[{name,repo_url?,domains?,notes?,keywords?,weight?}]},',
    '"updates":[{type:"project",match:"name",patch:{...}}],',
    '"dedupe":[{drop_text:"...",keep_text:"..."}],',
    '"keyword_index_updates":{"keyword":["id_or_hint"]}',
    "}",
  ].join(" ");

  const content = await callXai(system, input);
  return extractJsonGeneric<OrganizerResult>(content);
}

export async function explainEmail(input: string): Promise<string | null> {
  const system = [
    "Você é Tur, assistente pessoal.",
    "Explique o email em linguagem simples e direta.",
    "Responda em português, até 5 frases.",
  ].join(" ");
  const content = await callXai(system, input);
  return content?.trim() || null;
}

export async function draftEmailReply(input: string): Promise<string | null> {
  const system = [
    "Você é Tur, assistente pessoal.",
    "Crie uma resposta de email profissional, clara e objetiva.",
    "Não invente fatos. Use o contexto fornecido.",
    "Responda apenas com o corpo do email (sem assunto).",
  ].join(" ");
  const content = await callXai(system, input);
  return content?.trim() || null;
}

export async function explainEmailSecurity(input: string): Promise<string | null> {
  const system = [
    "VocÃª Ã© Tur, assistente pessoal.",
    "Explique com calma e paciÃªncia como funciona a conexÃ£o de email.",
    "Inclua por que usamos App Password no Gmail e no iCloud.",
    "Reforce que nÃ£o pedimos a senha principal da conta.",
    "DÃª um passo a passo simples se a pessoa quiser conectar.",
    "Responda em portuguÃªs, atÃ© 8 frases.",
  ].join(" ");
  const content = await callXai(system, input);
  return content?.trim() || null;
}

export async function checkXaiHealth(): Promise<{ ok: boolean; message: string }> {
  if (!process.env.XAI_API_KEY) {
    return { ok: false, message: "XAI_API_KEY nÃ£o configurada." };
  }
  try {
    await callXai("Voce eh um verificador.", "ping");
    return { ok: true, message: "OK" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha desconhecida na API.";
    return { ok: false, message };
  }
}

export async function humanizeReply(input: {
  text: string;
  profile: { formality: string; verbosity: string; emoji_level: number };
  templates: { acknowledgements: string[]; closings: string[]; guidance: string[] } | null;
  seed: number;
  last_hash?: string;
}): Promise<string | null> {
  if (!process.env.XAI_API_KEY) return null;
  const system = [
    "Voce eh Tur, assistente pessoal.",
    "Reescreva a resposta mantendo o mesmo significado.",
    "Use as frases de exemplo como base de estilo, sem copiar literalmente.",
    "Evite repetir exatamente a ultima resposta (use a seed).",
    "Nao invente fatos. Nao remova informacoes importantes.",
    "Responda em portugues com tom humano.",
    "Seja consistente com formality/verbosity/emoji_level do perfil.",
    "Retorne apenas a resposta final, sem explicacoes.",
  ].join(" ");
  const payload = {
    text: input.text,
    profile: input.profile,
    templates: input.templates,
    seed: input.seed,
    last_hash: input.last_hash,
  };
  const content = await callXai(system, JSON.stringify(payload));
  return content?.trim() || null;
}

export interface OnboardingAnswer {
  value: string;
  timezone?: string;
  verbosity?: "short" | "medium" | "long";
  formality?: "formal" | "casual";
  language?: string;
}

export async function interpretOnboardingAnswer(
  step: "name" | "role" | "tone" | "timezone" | "language" | "goals",
  input: string,
): Promise<OnboardingAnswer | null> {
  const system = [
    "Voce eh Tur, assistente pessoal.",
    "Interprete a resposta do usuario para onboarding e devolva JSON valido.",
    "Retorne apenas JSON.",
    "Campos: value (string) sempre.",
    "Se step=timezone, retorne timezone em formato Region/City.",
    "Se step=tone, retorne verbosity (short|medium|long) e/ou formality (formal|casual).",
    "Se step=language, retorne language (ex: pt-BR, en-US).",
    "Nao invente informacoes.",
  ].join(" ");
  const content = await callXai(system, JSON.stringify({ step, input }));
  return extractJsonGeneric<OnboardingAnswer>(content);
}
