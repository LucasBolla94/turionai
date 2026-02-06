/**
 * Test Gateway - V1.1.1 STEP-01
 * Script de teste para validar o MessageGateway
 *
 * Como rodar:
 * npx tsx src/test-gateway.ts
 */

import { MessageGateway } from "./gateway/messageGateway";
import { WhatsAppAdapter } from "./gateway/adapters/whatsappAdapter";

console.log("🧪 Teste do Message Gateway - STEP-01\n");

// Mock de WASocket (apenas para teste)
const mockSocket = {
  sendMessage: async (to: string, message: any) => {
    console.log(`[MockSocket] Enviando para ${to}:`, message.text);
  },
} as any;

// Criar gateway
const gateway = new MessageGateway({
  deduplication: true,
  deduplicationTTL: 5000, // 5 segundos para teste
});

// Criar adapter WhatsApp
const whatsappAdapter = new WhatsAppAdapter(mockSocket);

// Registrar adapter
gateway.registerAdapter(whatsappAdapter);

// Escutar mensagens
gateway.on("message", (msg) => {
  console.log("\n✅ Mensagem normalizada recebida:");
  console.log("  ID:", msg.id);
  console.log("  Canal:", msg.channel);
  console.log("  De:", msg.from);
  console.log("  Usuário:", msg.userId);
  console.log("  Thread:", msg.threadId);
  console.log("  Texto:", msg.text);
  console.log("  Timestamp:", new Date(msg.timestamp).toISOString());
  console.log("  Metadata:", JSON.stringify(msg.metadata, null, 2));
});

gateway.on("error", (error) => {
  console.error("\n❌ Erro:", error);
});

async function runTests() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // TESTE 1: Processar mensagem normal
  console.log("📝 TESTE 1: Processar mensagem normal\n");

  const mockMessage1 = {
    key: {
      id: "msg_test_001",
      remoteJid: "5511999999999@s.whatsapp.net",
      fromMe: false,
    },
    message: {
      conversation: "Olá, testando o gateway!",
    },
    messageTimestamp: Math.floor(Date.now() / 1000),
    pushName: "Usuario Teste",
  };

  await gateway.processRawMessage("whatsapp", mockMessage1);

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // TESTE 2: Deduplicação (mesma mensagem)
  console.log("📝 TESTE 2: Deduplicação (mesma mensagem)\n");

  await gateway.processRawMessage("whatsapp", mockMessage1);

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // TESTE 3: Mensagem de grupo
  console.log("📝 TESTE 3: Mensagem de grupo\n");

  const mockMessage2 = {
    key: {
      id: "msg_test_002",
      remoteJid: "120363123456789012@g.us",
      participant: "5511888888888@s.whatsapp.net",
      fromMe: false,
    },
    message: {
      conversation: "Mensagem em grupo!",
    },
    messageTimestamp: Math.floor(Date.now() / 1000),
    pushName: "Usuario Grupo",
  };

  await gateway.processRawMessage("whatsapp", mockMessage2);

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // TESTE 4: Mensagem com mídia (imagem com caption)
  console.log("📝 TESTE 4: Mensagem com imagem\n");

  const mockMessage3 = {
    key: {
      id: "msg_test_003",
      remoteJid: "5511999999999@s.whatsapp.net",
      fromMe: false,
    },
    message: {
      imageMessage: {
        caption: "Legenda da imagem",
        url: "https://example.com/image.jpg",
      },
    },
    messageTimestamp: Math.floor(Date.now() / 1000),
    pushName: "Usuario Teste",
  };

  await gateway.processRawMessage("whatsapp", mockMessage3);

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // TESTE 5: Enviar mensagem
  console.log("📝 TESTE 5: Enviar mensagem\n");

  await gateway.sendMessage("whatsapp", "5511999999999@s.whatsapp.net", "Resposta do gateway!");

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // TESTE 6: Estatísticas
  console.log("📝 TESTE 6: Estatísticas do gateway\n");

  const stats = gateway.getStats();
  console.log("Estatísticas:", JSON.stringify(stats, null, 2));

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  console.log("✅ Todos os testes concluídos!\n");
  console.log("Próximos passos:");
  console.log("1. Testar com WhatsApp real");
  console.log("2. Verificar deduplicação com mensagens reais");
  console.log("3. Integrar com sistema legado\n");

  // Cleanup
  gateway.destroy();
}

// Executar testes
runTests().catch(console.error);
