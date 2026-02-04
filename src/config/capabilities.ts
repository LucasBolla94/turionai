export interface CapabilityCategory {
  title: string;
  items: string[];
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
