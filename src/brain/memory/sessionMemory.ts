/**
 * Session Memory - V1.1.1 STEP-03
 * Persiste conversas por thread em JSON
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

export class SessionMemory {
  private sessions: Map<string, string[]> = new Map();
  private persistPath = resolve("state", "memory", "sessions.json");

  /**
   * Carrega sessões do disco
   */
  async load(): Promise<void> {
    try {
      const data = await readFile(this.persistPath, "utf8");
      const parsed = JSON.parse(data);
      this.sessions = new Map(Object.entries(parsed));
      console.log(`[SessionMemory] Carregado: ${this.sessions.size} sessões`);
    } catch {
      console.log("[SessionMemory] Nenhuma sessão anterior encontrada");
    }
  }

  /**
   * Salva sessões no disco
   */
  async save(): Promise<void> {
    try {
      await mkdir(resolve("state", "memory"), { recursive: true });
      const obj = Object.fromEntries(this.sessions);
      await writeFile(this.persistPath, JSON.stringify(obj, null, 2));
    } catch (error) {
      console.error("[SessionMemory] Erro ao salvar:", error);
    }
  }

  /**
   * Adiciona mensagem à sessão (auto-save assíncrono)
   */
  add(threadId: string, message: string): void {
    if (!this.sessions.has(threadId)) {
      this.sessions.set(threadId, []);
    }
    this.sessions.get(threadId)!.push(message);

    // Auto-save assíncrono (não bloqueia)
    this.save().catch(console.error);
  }

  /**
   * Retorna mensagens da sessão
   * @param last - Número de últimas mensagens (opcional)
   */
  get(threadId: string, last?: number): string[] {
    const messages = this.sessions.get(threadId) || [];
    return last ? messages.slice(-last) : messages;
  }

  /**
   * Limpa sessão específica
   */
  clear(threadId: string): void {
    this.sessions.delete(threadId);
    this.save().catch(console.error);
  }

  /**
   * Retorna número total de sessões
   */
  count(): number {
    return this.sessions.size;
  }

  /**
   * Retorna número de mensagens em uma sessão
   */
  size(threadId: string): number {
    return this.sessions.get(threadId)?.length || 0;
  }
}
