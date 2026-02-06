#!/usr/bin/env node

/**
 * Turion Setup Wizard - V1.1.1
 *
 * Wizard interativo e humanizado para configurar o Turion
 * Suporta Linux, macOS e Windows
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ===== CORES E ESTILOS =====
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',

  // Cores de texto
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',

  // Cores de fundo
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',
};

// ===== HELPERS =====
function print(text, color = 'reset') {
  console.log(colors[color] + text + colors.reset);
}

function printBox(text, color = 'cyan') {
  const width = 60;
  const padding = Math.max(0, Math.floor((width - text.length - 2) / 2));
  const line = '═'.repeat(width);

  console.log('');
  print('╔' + line + '╗', color);
  print('║' + ' '.repeat(padding) + text + ' '.repeat(width - padding - text.length) + '║', color);
  print('╚' + line + '╝', color);
  console.log('');
}

function printHeader() {
  console.clear();
  print('', 'reset');
  print('████████╗██╗   ██╗██████╗ ██╗ ██████╗ ███╗   ██╗', 'cyan');
  print('╚══██╔══╝██║   ██║██╔══██╗██║██╔═══██╗████╗  ██║', 'cyan');
  print('   ██║   ██║   ██║██████╔╝██║██║   ██║██╔██╗ ██║', 'cyan');
  print('   ██║   ██║   ██║██╔══██╗██║██║   ██║██║╚██╗██║', 'cyan');
  print('   ██║   ╚██████╔╝██║  ██║██║╚██████╔╝██║ ╚████║', 'cyan');
  print('   ╚═╝    ╚═════╝ ╚═╝  ╚═╝╚═╝ ╚═════╝ ╚═╝  ╚═══╝', 'cyan');
  print('', 'reset');
  print('        🤖 Assistente Pessoal via WhatsApp', 'white');
  print('           Versão 1.1.1 - Brain System V2', 'dim');
  print('', 'reset');
  printBox('ASSISTENTE DE CONFIGURAÇÃO', 'green');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ===== READLINE INTERFACE =====
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt, color = 'yellow') {
  return new Promise(resolve => {
    rl.question(colors[color] + prompt + colors.reset, answer => {
      resolve(answer.trim());
    });
  });
}

// ===== VALIDAÇÕES =====
function validateApiKey(key) {
  if (!key) return { valid: false, error: 'API key não pode estar vazia' };
  if (!key.startsWith('sk-ant-')) {
    return { valid: false, error: 'API key deve começar com "sk-ant-"' };
  }
  if (key.length < 20) {
    return { valid: false, error: 'API key muito curta (mínimo 20 caracteres)' };
  }
  return { valid: true };
}

function validateEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) return { valid: false, error: 'Email não pode estar vazio' };
  if (!regex.test(email)) {
    return { valid: false, error: 'Email inválido' };
  }
  return { valid: true };
}

function validatePassword(password) {
  if (!password) return { valid: false, error: 'Senha não pode estar vazia' };
  if (password.length < 6) {
    return { valid: false, error: 'Senha muito curta (mínimo 6 caracteres)' };
  }
  return { valid: true };
}

// ===== CONFIGURAÇÃO =====
const config = {
  anthropicKey: '',
  supabaseUrl: '',
  supabaseKey: '',
  emailUser: '',
  emailPassword: '',
  emailHost: 'imap.gmail.com',
  emailPort: '993',
  useBrainV2: true,
};

// ===== WIZARD STEPS =====
async function welcomeStep() {
  printHeader();

  print('👋 Olá! Bem-vindo ao assistente de configuração do Turion.', 'white');
  print('', 'reset');
  print('📋 Vou te ajudar a configurar tudo que você precisa:', 'white');
  print('   • Chave da API Anthropic (Claude)', 'dim');
  print('   • Configurações do Supabase (opcional)', 'dim');
  print('   • Configurações de Email (opcional)', 'dim');
  print('   • Ativação do Brain System V2', 'dim');
  print('', 'reset');
  print('⏱️  Leva apenas 2-3 minutos!', 'green');
  print('', 'reset');

  const ready = await question('Pronto para começar? (s/N): ');
  return ready.toLowerCase() === 's' || ready.toLowerCase() === 'sim';
}

async function anthropicStep() {
  printHeader();
  printBox('CONFIGURAÇÃO DA API ANTHROPIC', 'magenta');

  print('🧠 O Turion usa Claude (Anthropic) como seu cérebro principal.', 'white');
  print('', 'reset');
  print('📌 Como obter sua API key:', 'yellow');
  print('   1. Acesse: https://console.anthropic.com/', 'dim');
  print('   2. Faça login ou crie uma conta', 'dim');
  print('   3. Vá em "API Keys"', 'dim');
  print('   4. Clique em "Create Key"', 'dim');
  print('   5. Copie a chave (começa com "sk-ant-...")', 'dim');
  print('', 'reset');

  let attempts = 0;
  while (attempts < 3) {
    const apiKey = await question('🔑 Cole sua ANTHROPIC_API_KEY: ');

    const validation = validateApiKey(apiKey);
    if (validation.valid) {
      config.anthropicKey = apiKey;
      print('✅ API key válida!', 'green');
      await sleep(500);
      return true;
    } else {
      attempts++;
      print(`❌ ${validation.error}`, 'red');
      if (attempts < 3) {
        print(`⚠️  Tentativa ${attempts}/3. Tente novamente.`, 'yellow');
      }
    }
  }

  print('', 'reset');
  print('❌ Número máximo de tentativas excedido.', 'red');
  print('💡 Você pode configurar depois editando o arquivo .env', 'yellow');
  return false;
}

async function supabaseStep() {
  printHeader();
  printBox('CONFIGURAÇÃO DO SUPABASE (OPCIONAL)', 'blue');

  print('💾 O Supabase é usado para armazenar dados persistentes.', 'white');
  print('', 'reset');

  const useSupabase = await question('Deseja configurar Supabase agora? (s/N): ');

  if (useSupabase.toLowerCase() !== 's' && useSupabase.toLowerCase() !== 'sim') {
    print('⏭️  Pulando configuração do Supabase...', 'dim');
    await sleep(1000);
    return true;
  }

  print('', 'reset');
  print('📌 Como obter suas credenciais:', 'yellow');
  print('   1. Acesse: https://supabase.com/', 'dim');
  print('   2. Crie um projeto', 'dim');
  print('   3. Vá em Settings > API', 'dim');
  print('   4. Copie a URL e a anon/public key', 'dim');
  print('', 'reset');

  config.supabaseUrl = await question('🌐 SUPABASE_URL: ');
  config.supabaseKey = await question('🔑 SUPABASE_KEY: ');

  if (config.supabaseUrl && config.supabaseKey) {
    print('✅ Supabase configurado!', 'green');
  } else {
    print('⚠️  Configuração incompleta. Você pode configurar depois no .env', 'yellow');
  }

  await sleep(500);
  return true;
}

async function emailStep() {
  printHeader();
  printBox('CONFIGURAÇÃO DE EMAIL (OPCIONAL)', 'blue');

  print('📧 Configure para permitir que o Turion leia seus emails.', 'white');
  print('', 'reset');

  const useEmail = await question('Deseja configurar email agora? (s/N): ');

  if (useEmail.toLowerCase() !== 's' && useEmail.toLowerCase() !== 'sim') {
    print('⏭️  Pulando configuração de email...', 'dim');
    await sleep(1000);
    return true;
  }

  print('', 'reset');
  print('📌 Para Gmail:', 'yellow');
  print('   1. Ative "Acesso a app menos seguro"', 'dim');
  print('   2. Ou use "Senha de app" (recomendado)', 'dim');
  print('   3. Host: imap.gmail.com | Porta: 993', 'dim');
  print('', 'reset');

  let attempts = 0;
  while (attempts < 3) {
    config.emailUser = await question('📧 Email: ');

    const validation = validateEmail(config.emailUser);
    if (validation.valid) {
      break;
    } else {
      attempts++;
      print(`❌ ${validation.error}`, 'red');
      if (attempts < 3) {
        print(`⚠️  Tentativa ${attempts}/3.`, 'yellow');
      }
    }
  }

  if (attempts >= 3) {
    print('⚠️  Email inválido. Configure depois no .env', 'yellow');
    await sleep(1000);
    return true;
  }

  config.emailPassword = await question('🔒 Senha (ou senha de app): ');
  config.emailHost = await question(`🌐 Host IMAP [${config.emailHost}]: `) || config.emailHost;
  config.emailPort = await question(`🔌 Porta [${config.emailPort}]: `) || config.emailPort;

  if (config.emailUser && config.emailPassword) {
    print('✅ Email configurado!', 'green');
  }

  await sleep(500);
  return true;
}

async function brainV2Step() {
  printHeader();
  printBox('ATIVAÇÃO DO BRAIN SYSTEM V2', 'green');

  print('🚀 O Brain V2 é o novo sistema inteligente do Turion.', 'white');
  print('', 'reset');
  print('✨ Recursos:', 'yellow');
  print('   • Orquestrador inteligente de intents', 'dim');
  print('   • Agentes especializados (Chat, Cron, etc)', 'dim');
  print('   • Sistema de memória de 3 camadas', 'dim');
  print('   • Integração com Claude Sonnet 4.5', 'dim');
  print('', 'reset');

  const useBrainV2 = await question('Ativar Brain System V2? (S/n): ');

  config.useBrainV2 = useBrainV2.toLowerCase() !== 'n' && useBrainV2.toLowerCase() !== 'nao';

  if (config.useBrainV2) {
    print('✅ Brain V2 será ativado!', 'green');
  } else {
    print('⚠️  Brain V2 desativado. Sistema legado será usado.', 'yellow');
  }

  await sleep(500);
  return true;
}

async function saveConfig() {
  printHeader();
  printBox('SALVANDO CONFIGURAÇÕES', 'cyan');

  print('💾 Criando arquivo .env com suas configurações...', 'white');
  await sleep(500);

  const envPath = path.join(__dirname, '.env');
  const envExamplePath = path.join(__dirname, '.env.example');

  // Ler .env.example como base
  let envContent = '';
  if (fs.existsSync(envExamplePath)) {
    envContent = fs.readFileSync(envExamplePath, 'utf-8');
  }

  // Substituir valores
  const replacements = {
    'ANTHROPIC_API_KEY=': `ANTHROPIC_API_KEY=${config.anthropicKey}`,
    'SUPABASE_URL=': `SUPABASE_URL=${config.supabaseUrl}`,
    'SUPABASE_KEY=': `SUPABASE_KEY=${config.supabaseKey}`,
    'EMAIL_USER=': `EMAIL_USER=${config.emailUser}`,
    'EMAIL_PASSWORD=': `EMAIL_PASSWORD=${config.emailPassword}`,
    'EMAIL_HOST=': `EMAIL_HOST=${config.emailHost}`,
    'EMAIL_PORT=': `EMAIL_PORT=${config.emailPort}`,
    'TURION_USE_BRAIN_V2=': `TURION_USE_BRAIN_V2=${config.useBrainV2}`,
  };

  // Se não existe .env.example, criar do zero
  if (!envContent) {
    envContent = `# Turion Configuration - Generated by Setup Wizard
# Generated at: ${new Date().toISOString()}

# ===== ANTHROPIC API =====
ANTHROPIC_API_KEY=${config.anthropicKey}

# ===== SUPABASE =====
SUPABASE_URL=${config.supabaseUrl}
SUPABASE_KEY=${config.supabaseKey}

# ===== EMAIL CONFIGURATION =====
EMAIL_USER=${config.emailUser}
EMAIL_PASSWORD=${config.emailPassword}
EMAIL_HOST=${config.emailHost}
EMAIL_PORT=${config.emailPort}

# ===== FEATURE FLAGS =====
TURION_USE_BRAIN_V2=${config.useBrainV2}

# ===== OTHER =====
NODE_ENV=production
TZ=America/Sao_Paulo
`;
  } else {
    // Substituir valores no conteúdo existente
    for (const [key, value] of Object.entries(replacements)) {
      const regex = new RegExp(`^${key}.*$`, 'gm');
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, value);
      } else {
        // Adicionar se não existe
        envContent += `\n${value}`;
      }
    }
  }

  // Salvar .env
  try {
    fs.writeFileSync(envPath, envContent, 'utf-8');
    print('✅ Arquivo .env criado com sucesso!', 'green');
    await sleep(500);

    // Mostrar resumo
    print('', 'reset');
    print('📋 Resumo da configuração:', 'cyan');
    print(`   • Anthropic API: ${config.anthropicKey ? '✅ Configurada' : '❌ Não configurada'}`, 'dim');
    print(`   • Supabase: ${config.supabaseUrl ? '✅ Configurado' : '⏭️  Pulado'}`, 'dim');
    print(`   • Email: ${config.emailUser ? '✅ Configurado' : '⏭️  Pulado'}`, 'dim');
    print(`   • Brain V2: ${config.useBrainV2 ? '✅ Ativado' : '❌ Desativado'}`, 'dim');
    print('', 'reset');

    return true;
  } catch (error) {
    print(`❌ Erro ao salvar .env: ${error.message}`, 'red');
    return false;
  }
}

async function finalStep() {
  printHeader();
  printBox('CONFIGURAÇÃO CONCLUÍDA! 🎉', 'green');

  print('✅ Turion está pronto para ser iniciado!', 'white');
  print('', 'reset');
  print('📌 Próximos passos:', 'yellow');
  print('', 'reset');
  print('1️⃣  Compilar o projeto:', 'cyan');
  print('   npm run build', 'dim');
  print('', 'reset');
  print('2️⃣  Iniciar com PM2:', 'cyan');
  print('   pm2 start ecosystem.config.js', 'dim');
  print('   pm2 save', 'dim');
  print('   pm2 startup', 'dim');
  print('', 'reset');
  print('3️⃣  Escanear QR Code do WhatsApp:', 'cyan');
  print('   pm2 logs turion', 'dim');
  print('   (O QR Code aparecerá nos logs)', 'dim');
  print('', 'reset');
  print('4️⃣  Monitorar:', 'cyan');
  print('   pm2 monit', 'dim');
  print('', 'reset');

  print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'dim');
  print('', 'reset');
  print('💡 Dica: Para reconfigurar, execute: node setup-wizard.js', 'yellow');
  print('📚 Docs: https://github.com/LucasBolla94/turionai', 'dim');
  print('', 'reset');
  print('🚀 Bom trabalho com o Turion!', 'green');
  print('', 'reset');
}

// ===== MAIN =====
async function main() {
  try {
    // Welcome
    const ready = await welcomeStep();
    if (!ready) {
      print('👋 Até logo! Execute novamente quando estiver pronto.', 'yellow');
      rl.close();
      return;
    }

    // Steps
    await anthropicStep();
    await supabaseStep();
    await emailStep();
    await brainV2Step();
    await saveConfig();
    await finalStep();

  } catch (error) {
    print('', 'reset');
    print(`❌ Erro durante a configuração: ${error.message}`, 'red');
    print('💡 Execute novamente: node setup-wizard.js', 'yellow');
  } finally {
    rl.close();
  }
}

// Execute
main();
