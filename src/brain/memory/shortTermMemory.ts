/**
 * Short-Term Memory - V1.1.1 STEP-03
 * Mantém últimas N mensagens em RAM
 */

export class ShortTermMemory {
  private messages: string[] = [];
  private maxSize: number;

  constructor(maxSize: number = 10) {
    this.maxSize = maxSize;
  }

  /**
   * Adiciona mensagem ao buffer
   * Remove a mais antiga se exceder maxSize
   */
  add(message: string): void {
    this.messages.push(message);
    if (this.messages.length > this.maxSize) {
      this.messages.shift();
    }
  }

  /**
   * Retorna todas as mensagens no buffer
   */
  get(): string[] {
    return [...this.messages];
  }

  /**
   * Limpa o buffer
   */
  clear(): void {
    this.messages = [];
  }

  /**
   * Retorna número de mensagens no buffer
   */
  size(): number {
    return this.messages.length;
  }
}
