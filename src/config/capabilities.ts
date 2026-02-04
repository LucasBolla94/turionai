export interface CapabilityCategory {
  title: string;
  items: string[];
}

export interface HelpSection {
  key: string;
  title: string;
  description: string;
  steps: string[];
  examples: string[];
}

export const CAPABILITIES: CapabilityCategory[] = [
  {
    title: "Rotina",
    items: [
      "Cria um lembrete pra pagar uma conta",
      "Me lembra de algo amanha de manha",
    ],
  },
  {
    title: "Organizacao",
    items: [
      "Resume minhas ultimas conversas e salva pontos importantes",
      "Organiza minhas memorias de hoje e cria keywords",
    ],
  },
  {
    title: "Servidor/Dev",
    items: [
      "Checa meus logs e me diz o que ta quebrando",
      "Faz deploy do repo X com Docker Compose",
    ],
  },
  {
    title: "Pesquisa",
    items: [
      "Procura no Google e me traz 3 fontes confiaveis sobre X",
      "Explica rapidamente o que e Y",
    ],
  },
];

export const HELP_SECTIONS: HelpSection[] = [
  {
    key: "geral",
    title: "Como eu posso te ajudar",
    description: "Sou seu assistente pessoal no WhatsApp. Posso organizar rotina, lembrar coisas e ajudar com servidor quando voce quiser.",
    steps: [
      "Fala comigo em linguagem natural (ex: \"me lembra amanha\").",
      "Se a acao for sensivel, eu confirmo antes.",
      "Tudo fica registrado em memoria e auditoria.",
    ],
    examples: [
      "Me lembra de pagar a conta do carro todo dia 10",
      "Resume minhas ultimas conversas e salva os pontos importantes",
      "Checa meus logs e me diz o que ta quebrando",
    ],
  },
  {
    key: "email",
    title: "Email (iCloud e Gmail)",
    description: "Posso listar, ler, explicar e responder emails com seguranca.",
    steps: [
      "Diga: \"conectar email\".",
      "Escolha iCloud ou Gmail.",
      "Informe seu email e a senha correta.",
      "Depois diga: \"ver emails\" ou \"explica o email 123\".",
    ],
    examples: [
      "Conectar email iCloud",
      "Ver emails nao lidos",
      "Explica o email 53011",
    ],
  },
  {
    key: "icloud",
    title: "iCloud (senha de app)",
    description: "No iCloud, voce precisa gerar uma senha de app (mais segura).",
    steps: [
      "Acesse appleid.apple.com",
      "Login > Sign-In and Security > App-Specific Passwords",
      "Gerar senha para \"Turion\"",
      "Use essa senha comigo no passo de email",
    ],
    examples: [
      "Conectar email iCloud",
    ],
  },
  {
    key: "lembretes",
    title: "Lembretes e cron",
    description: "Crio lembretes com linguagem natural.",
    steps: [
      "Me diga o que lembrar e quando",
      "Eu transformo em cron automaticamente",
    ],
    examples: [
      "Me lembra amanha de buscar o carro",
      "Me lembra toda segunda as 9",
    ],
  },
  {
    key: "update",
    title: "Atualizacoes do Tur",
    description: "Eu verifico updates automaticamente e atualizo quando necessario.",
    steps: [
      "Se eu detectar update, aviso e atualizo",
      "Voce tambem pode pedir: \"--update\"",
    ],
    examples: [
      "--update",
      "Tem update novo?",
    ],
  },
];
