import { Skill, SkillContext, SkillResult } from "./types";
import { buildEmailConfig, loadEmailConfig, saveEmailConfig } from "../core/emailStore";
import { listEmails, readEmail, sendEmail, deleteEmail, type EmailSummary } from "../core/emailClient";
import { getTimezone } from "../core/timezone";
import { getEmailRules, matchRule } from "../core/emailRules";
import { saveEmailSnapshot } from "../core/emailSnapshot";
import { draftEmailReply, explainEmail } from "../core/brain";

export class EmailSkill implements Skill {
  name = "EmailSkill";

  canHandle(intent: string): boolean {
    return intent.startsWith("EMAIL_");
  }

  async execute(args: Record<string, unknown>, _ctx: SkillContext): Promise<SkillResult> {
    const action = typeof args.action === "string" ? args.action : "";

    if (action === "connect") {
      const provider = typeof args.provider === "string" ? args.provider : "";
      const user = typeof args.user === "string" ? args.user : "";
      const password = typeof args.password === "string" ? args.password : "";
      if (!provider || !user || !password) {
        return {
          ok: false,
          output: "Uso: email connect <gmail|icloud> <email> <app_password>",
        };
      }
      if (provider !== "gmail" && provider !== "icloud") {
        return { ok: false, output: "Provider inválido. Use gmail ou icloud." };
      }
      const config = buildEmailConfig(provider, user, password);
      await saveEmailConfig(config);
      return { ok: true, output: "Email configurado com sucesso." };
    }

    const config = await loadEmailConfig();
    if (!config) {
      return { ok: false, output: "Email não configurado. Use email connect." };
    }

    if (action === "list") {
      const limit = typeof args.limit === "number" ? args.limit : 5;
      const unreadOnly =
        typeof args.unreadOnly === "boolean" ? args.unreadOnly : true;
      const mode = typeof args.mode === "string" ? args.mode : "summary";
      const suggestCleanup =
        typeof args.suggestCleanup === "boolean" ? args.suggestCleanup : true;
      const result = await listEmails(config, { limit, unreadOnly });
      if (result.items.length === 0) {
        return { ok: true, output: "Nenhum email encontrado." };
      }
      const total = result.totalUnread;
      const timeZone = await getTimezone();
      const rules = await getEmailRules();
      const important = result.items.filter(
        (mail) => computeEmailPriority(mail, rules).importance === "alta",
      );

      await saveEmailSnapshot(
        result.items.map((mail) => ({
          id: mail.id,
          sender: simplifySender(mail.from),
          subject: mail.subject,
          category: mapCategory(mail),
        })),
      );

      if (mode === "compact") {
        const items = result.items.slice(0, Math.max(1, limit));
        const lines = items.map((mail, index) =>
          formatEmailCompact(mail, index + 1, timeZone, rules),
        );
        const more =
          unreadOnly && total > items.length
            ? `Você ainda tem ${total - items.length} e-mails não lidos.`
            : "";
        return {
          ok: true,
          output: [
            "📬 Últimos e-mails não lidos:",
            "",
            ...lines,
            "",
            more,
            "Quer que eu abra algum?",
          ]
            .filter(Boolean)
            .join("\n"),
        };
      }

      const listLines =
        limit > 0 && result.items.length > 0
          ? [
              `Separei os ${Math.min(limit, result.items.length)} primeiros n?o lidos:`,
              ...result.items
                .slice(0, Math.max(1, limit))
                .map((mail, index) => formatEmailCompact(mail, index + 1, timeZone, rules)),
              "",
            ]
          : [];

      const importantBullets = important
        .slice(0, 2)
        .map((mail) => `• ${simplifySender(mail.from)} — ${shortSubject(mail.subject)}`);

      const insight = importantBullets.length
        ? [
            "📬 Dei uma olhada nos seus e-mails agora.",
            "",
            `Tem ${importantBullets.length} que merecem atenção 👀`,
            "",
            ...importantBullets,
            "",
            "O resto são notificações e newsletters/promos.",
          ].join("\n")
        : [
            "📬 Dei uma olhada nos seus e-mails agora.",
            "Nada urgente por aqui. O resto são notificações e newsletters/promos.",
          ].join("\n");

      const more =
        unreadOnly && total > 0
          ? `\nVocê ainda tem ${total} e-mails não lidos.`
          : "";

      const footer = [
        "Quer que eu:",
        "1️⃣ Abra um desses importantes e te explique",
        "2️⃣ Veja se tem algo urgente",
        "3️⃣ Ignore só as promoções",
        "4️⃣ Mostre mais e-mails",
      ].join("\n");

      const cleanupCandidates = suggestCleanup
        ? result.items
            .filter((mail) => {
              const priority = computeEmailPriority(mail, rules);
              const category = classifyEmailCategory(mail);
              return (
                priority.importance === "baixa" &&
                (category === "newsletter/promoções" || category === "marketing")
              );
            })
            .slice(0, 3)
        : [];

      const cleanupText = cleanupCandidates.length
        ? [
            "",
            `Acho que ${cleanupCandidates.length} e-mail(s) parecem promoções:`,
            ...cleanupCandidates.map(
              (mail) => `• ${simplifySender(mail.from)} — ${shortSubject(mail.subject)}`,
            ),
            "Posso apagar esses?",
            `[[CLEANUP:${cleanupCandidates
              .map((mail) => `${mail.id}|${simplifySender(mail.from)}`)
              .join(";")}]]`,
          ].join("\n")
        : "";

      return {
        ok: true,
        output: [listLines.join("\n"), insight, more, "", footer, cleanupText]
          .filter(Boolean)
          .join("\n"),
      };
    }

    if (action === "read") {
      const id = typeof args.id === "number" ? args.id : Number(args.id);
      if (!id) return { ok: false, output: "Uso: email read <id>" };
      const email = await readEmail(config, id);
      if (!email) return { ok: false, output: "Email não encontrado." };
      const output = [
        `De: ${email.from}`,
        `Assunto: ${email.subject}`,
        `Data: ${email.date}`,
        "",
        email.text.slice(0, 2000),
      ].join("\n");
      return { ok: true, output };
    }

    if (action === "reply") {
      const id = typeof args.id === "number" ? args.id : Number(args.id);
      const body = typeof args.body === "string" ? args.body : "";
      if (!id || !body) {
        return { ok: false, output: "Uso: email reply <id> <texto>" };
      }
      const email = await readEmail(config, id);
      if (!email) return { ok: false, output: "Email não encontrado." };
      await sendEmail(config, {
        to: email.from,
        subject: `Re: ${email.subject}`,
        body,
      });
      return { ok: true, output: "Resposta enviada." };
    }

    if (action === "explain") {
      const id = typeof args.id === "number" ? args.id : Number(args.id);
      if (!id) return { ok: false, output: "Uso: email explain <id>" };
      const email = await readEmail(config, id);
      if (!email) return { ok: false, output: "Email não encontrado." };
      const input = [
        `De: ${email.from}`,
        `Assunto: ${email.subject}`,
        `Data: ${email.date}`,
        "",
        email.text.slice(0, 4000),
      ].join("\n");
      const summary = await explainEmail(input);
      return { ok: true, output: summary ?? "Não consegui explicar o email." };
    }

    if (action === "draft_reply") {
      const id = typeof args.id === "number" ? args.id : Number(args.id);
      const instruction = typeof args.instruction === "string" ? args.instruction : "";
      if (!id || !instruction) {
        return { ok: false, output: "Uso: email draft <id> <instrução>" };
      }
      const email = await readEmail(config, id);
      if (!email) return { ok: false, output: "Email não encontrado." };
      const input = [
        `Instrução: ${instruction}`,
        `De: ${email.from}`,
        `Assunto: ${email.subject}`,
        `Data: ${email.date}`,
        "",
        email.text.slice(0, 4000),
      ].join("\n");
      const draft = await draftEmailReply(input);
      return { ok: true, output: draft ?? "Não consegui gerar o rascunho." };
    }

    if (action === "delete") {
      const id = typeof args.id === "number" ? args.id : Number(args.id);
      if (!id) return { ok: false, output: "Uso: email delete <id>" };
      await deleteEmail(config, id);
      return { ok: true, output: "Email deletado." };
    }

    return { ok: false, output: "Ação de email inválida." };
  }
}

function computeEmailPriority(
  mail: EmailSummary,
  rules: Awaited<ReturnType<typeof getEmailRules>>,
): { urgency: "alta" | "normal" | "baixa"; importance: "alta" | "normal" | "baixa" } {
  const from = `${mail.from}`.toLowerCase();
  const subject = `${mail.subject}`.toLowerCase();
  const urgentKeywords = ["urgent", "urgente", "asap", "imediato", "today", "hoje"];
  const importantFrom = ["@apple.com", "icloud.com", "bank", "paypal", "gov", "hmrc", "linkedin", "indeed"];
  const matched = matchRule(rules, from, subject);
  if (matched) {
    return {
      urgency:
        matched.urgency === "media"
          ? "normal"
          : matched.urgency === "baixa"
            ? "baixa"
            : "alta",
      importance:
        matched.importance === "media"
          ? "normal"
          : matched.importance === "baixa"
            ? "baixa"
            : "alta",
    };
  }
  const isUrgent = urgentKeywords.some((k) => subject.includes(k));
  const isImportant = importantFrom.some((k) => from.includes(k));
  return {
    urgency: isUrgent ? "alta" : "normal",
    importance: isImportant ? "alta" : "normal",
  };
}

function formatEmailCompact(
  mail: EmailSummary,
  index: number,
  timeZone: string,
  rules: Awaited<ReturnType<typeof getEmailRules>>,
): string {
  const priority = computeEmailPriority(mail, rules);
  const badge = priority.importance === "alta" ? " ⚠️" : "";
  const time = formatTime(mail.date, timeZone);
  return `${index}️⃣ ${simplifySender(mail.from)} — ${shortSubject(mail.subject)} (${time})${badge}`;
}

function simplifySender(value: string): string {
  const match = value.match(/^(.*?)(<.*>)?$/);
  if (!match) return value;
  return match[1].trim().replace(/\"/g, "") || value;
}

function shortSubject(value: string): string {
  if (value.length <= 48) return value;
  return `${value.slice(0, 45)}...`;
}

function formatTime(value: string, timeZone: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const formatter = new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
  });
  return formatter.format(date);
}

function classifyEmailCategory(mail: EmailSummary): string {
  const from = `${mail.from}`.toLowerCase();
  const subject = `${mail.subject}`.toLowerCase();
  if (from.includes("apple") || subject.includes("password") || subject.includes("segurança")) {
    return "segurança/conta";
  }
  if (from.includes("linkedin") || from.includes("indeed") || subject.includes("job")) {
    return "oportunidades de trabalho";
  }
  if (subject.includes("promo") || subject.includes("oferta") || from.includes("marketing")) {
    return "newsletter/promoções";
  }
  return "atualizações gerais";
}

function mapCategory(mail: EmailSummary): "important" | "normal" | "promo" | "newsletter" | "spam" {
  const category = classifyEmailCategory(mail);
  if (category === "segurança/conta" || category === "oportunidades de trabalho") return "important";
  if (category === "newsletter/promoções") return "promo";
  return "normal";
}
