/**
 * Memory System - V1.1.1 STEP-03
 * Sistema unificado de memória de 3 camadas
 */

import { ShortTermMemory } from "./shortTermMemory";
import { SessionMemory } from "./sessionMemory";
import { LongTermMemory } from "./longTermMemory";

export class MemorySystem {
  private shortTerm: ShortTermMemory;
  private session: SessionMemory;
  private longTerm: LongTermMemory;

  constructor() {
    this.shortTerm = new ShortTermMemory(10);
    this.session = new SessionMemory();
    this.longTerm = new LongTermMemory();
  }

  /**
   * Inicializa sistema (carrega memórias persistidas)
   */
  async initialize(): Promise<void> {
    await this.session.load();
    await this.longTerm.load();
    console.log("[MemorySystem] Inicializado");
  }

  /**
   * Adiciona mensagem em todas as camadas relevantes
   * @param threadId - ID da thread/conversa
   * @param message - Mensagem a armazenar
   * @param isImportant - Se deve salvar em long-term
   */
  addMessage(threadId: string, message: string, isImportant: boolean = false): void {
    // Short-term (sempre)
    this.shortTerm.add(message);

    // Session (sempre)
    this.session.add(threadId, message);

    // Long-term (só se importante)
    if (isImportant) {
      this.longTerm.add({
        text: message,
        timestamp: new Date().toISOString(),
        userId: threadId,
        category: "conversation",
        keywords: this.extractKeywords(message),
      }).catch(console.error);
    }
  }

  /**
   * Monta contexto unificado para o orchestrator
   * @param threadId - ID da thread
   * @param currentMessage - Mensagem atual do usuário
   * @returns Contexto formatado
   */
  async buildContext(threadId: string, currentMessage: string): Promise<string> {
    const parts: string[] = [];

    // Short-term
    const shortTermMsgs = this.shortTerm.get();
    if (shortTermMsgs.length > 0) {
      parts.push(`CONTEXTO RECENTE:\n${shortTermMsgs.join("\n")}`);
    }

    // Session (últimas 20)
    const sessionMsgs = this.session.get(threadId, 20);
    if (sessionMsgs.length > 0) {
      parts.push(`CONVERSA ATUAL:\n${sessionMsgs.join("\n")}`);
    }

    // Long-term (busca por relevância)
    const relevant = this.longTerm.search(currentMessage, 3);
    if (relevant.length > 0) {
      const formatted = relevant.map((entry, i) =>
        `${i + 1}. [${entry.category}] ${entry.text} (${entry.timestamp.slice(0, 10)})`
      ).join("\n");
      parts.push(`MEMÓRIAS RELEVANTES:\n${formatted}`);
    }

    return parts.join("\n\n");
  }

  /**
   * Extrai keywords simples (substituir por NLP no futuro)
   */
  private extractKeywords(text: string): string[] {
    // Extração simples por enquanto
    const words = text.toLowerCase().split(/\s+/);
    const stopWords = new Set([
      "de", "a", "o", "que", "e", "do", "da", "em", "um", "para", "é", "com",
      "não", "uma", "os", "no", "se", "na", "por", "mais", "as", "dos", "como",
      "mas", "foi", "ao", "ele", "das", "tem", "à", "seu", "sua", "ou", "ser",
      "quando", "muito", "há", "nos", "já", "está", "eu", "também", "só", "pelo",
      "pela", "até", "isso", "ela", "entre", "era", "depois", "sem", "mesmo", "aos",
      "ter", "seus", "quem", "nas", "me", "esse", "eles", "estão", "você", "tinha",
      "foram", "essa", "num", "nem", "suas", "meu", "às", "minha", "têm", "numa",
      "pelos", "elas", "havia", "seja", "qual", "será", "nós", "tenho", "lhe",
      "deles", "essas", "esses", "pelas", "este", "fosse", "dele"
    ]);

    return words
      .filter((w) => w.length > 3 && !stopWords.has(w))
      .slice(0, 10);
  }

  /**
   * Retorna estatísticas do sistema de memória
   */
  getStats() {
    return {
      shortTerm: {
        size: this.shortTerm.size(),
        maxSize: 10,
      },
      session: {
        sessions: this.session.count(),
      },
      longTerm: {
        entries: this.longTerm.count(),
      },
    };
  }

  /**
   * Acesso direto às camadas (para testes e debug)
   */
  get layers() {
    return {
      shortTerm: this.shortTerm,
      session: this.session,
      longTerm: this.longTerm,
    };
  }
}
