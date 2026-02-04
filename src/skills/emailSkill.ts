import { Skill, SkillContext, SkillResult } from "./types";
import { buildEmailConfig, loadEmailConfig, saveEmailConfig } from "../core/emailStore";
import { listEmails, readEmail, sendEmail, deleteEmail } from "../core/emailClient";
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
      const emails = await listEmails(config, { limit, unreadOnly });
      if (emails.length === 0) {
        return { ok: true, output: "Nenhum email encontrado." };
      }
      const output = emails
        .map(
          (mail) =>
            `#${mail.id} | ${mail.from} | ${mail.subject} | ${mail.date}`,
        )
        .join("\n");
      return { ok: true, output };
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
