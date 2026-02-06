/**
 * Long-Term Memory - V1.1.1 STEP-03
 * Armazena fatos/preferências com busca por keywords
 * (Futuramente: embeddings + semantic search)
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

export interface LongTermEntry {
  id: string;
  text: string;
  timestamp: string;
  userId: string;
  category: "fact" | "task" | "conversation" | "preference";
  keywords: string[];
}

export class LongTermMemory {
  private entries: LongTermEntry[] = [];
  private persistPath = resolve("state", "memory", "longterm.json");

  /**
   * Carrega memórias do disco
   */
  async load(): Promise<void> {
    try {
      const data = await readFile(this.persistPath, "utf8");
      this.entries = JSON.parse(data);
      console.log(`[LongTermMemory] Carregado: ${this.entries.length} entradas`);
    } catch {
      console.log("[LongTermMemory] Nenhuma memória de longo prazo encontrada");
    }
  }

  /**
   * Salva memórias no disco
   */
  async save(): Promise<void> {
    try {
      await mkdir(resolve("state", "memory"), { recursive: true });
      await writeFile(this.persistPath, JSON.stringify(this.entries, null, 2));
    } catch (error) {
      console.error("[LongTermMemory] Erro ao salvar:", error);
    }
  }

  /**
   * Adiciona nova entrada à memória de longo prazo
   */
  async add(entry: Omit<LongTermEntry, "id">): Promise<void> {
    const newEntry: LongTermEntry = {
      id: `ltm_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      ...entry,
    };

    this.entries.push(newEntry);

    // Limita a 1000 entradas (por enquanto)
    if (this.entries.length > 1000) {
      this.entries.shift();
    }

    await this.save();
  }

  /**
   * Busca simples por keywords (substituir por embeddings no futuro)
   * @param query - Texto de busca
   * @param limit - Número máximo de resultados
   * @returns Entradas ordenadas por relevância
   */
  search(query: string, limit: number = 5): LongTermEntry[] {
    const queryLower = query.toLowerCase();

    const scored = this.entries.map((entry) => {
      let score = 0;

      // Score por texto
      if (entry.text.toLowerCase().includes(queryLower)) {
        score += 10;
      }

      // Score por keywords
      entry.keywords.forEach((kw) => {
        if (queryLower.includes(kw.toLowerCase())) {
          score += 5;
        }
      });

      return { entry, score };
    });

    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s) => s.entry);
  }

  /**
   * Retorna número de entradas
   */
  count(): number {
    return this.entries.length;
  }

  /**
   * Retorna todas as entradas (para debug)
   */
  getAll(): LongTermEntry[] {
    return [...this.entries];
  }
}
