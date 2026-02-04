import imaps from "imap-simple";
import { simpleParser } from "mailparser";
import nodemailer from "nodemailer";
import { EmailConfig } from "./emailStore";

export interface EmailSummary {
  id: number;
  from: string;
  subject: string;
  date: string;
}

export interface EmailContent {
  id: number;
  from: string;
  subject: string;
  date: string;
  text: string;
}

export interface EmailListResult {
  totalUnread: number;
  items: EmailSummary[];
}

export async function listEmails(
  config: EmailConfig,
  options: { limit: number; unreadOnly: boolean },
): Promise<EmailListResult> {
  const connection = await imaps.connect({
    imap: {
      user: config.user,
      password: config.password,
      host: config.imapHost,
      port: config.imapPort,
      tls: config.imapTls,
      authTimeout: 10000,
    },
  });

  await connection.openBox("INBOX");
  const searchCriteria = options.unreadOnly ? ["UNSEEN"] : ["ALL"];
  const fetchOptions = {
    bodies: ["HEADER.FIELDS (FROM SUBJECT DATE)"],
    markSeen: false,
  };
  const results = await connection.search(searchCriteria, fetchOptions);
  let totalUnread = results.length;
  if (!options.unreadOnly) {
    try {
      const unread = await connection.search(["UNSEEN"], fetchOptions);
      totalUnread = unread.length;
    } catch {
      totalUnread = 0;
    }
  }
  const summaries = results
    .map((res: { parts: Array<{ which: string; body: any }>; attributes: { uid: number } }) => {
      const header = res.parts.find((p: { which: string }) => p.which.includes("HEADER"))?.body;
      return {
        id: res.attributes.uid as number,
        from: header?.from?.[0] ?? "",
        subject: header?.subject?.[0] ?? "",
        date: header?.date?.[0] ?? "",
      };
    })
    .reverse()
    .slice(0, options.limit);
  await connection.end();
  return { totalUnread, items: summaries };
}

export async function readEmail(
  config: EmailConfig,
  id: number,
): Promise<EmailContent | null> {
  const connection = await imaps.connect({
    imap: {
      user: config.user,
      password: config.password,
      host: config.imapHost,
      port: config.imapPort,
      tls: config.imapTls,
      authTimeout: 10000,
    },
  });
  await connection.openBox("INBOX");
  const searchCriteria = [["UID", id]];
  const fetchOptions = { bodies: ["HEADER.FIELDS (FROM SUBJECT DATE)", "TEXT"], markSeen: false };
  const results = await connection.search(searchCriteria, fetchOptions);
  if (results.length === 0) {
    await connection.end();
    return null;
  }
  const result = results[0];
  const header = result.parts.find((p: { which: string }) => p.which.includes("HEADER"))?.body;
  const textPart = result.parts.find((p: { which: string }) => p.which === "TEXT")?.body ?? "";
  const parsed = await simpleParser(textPart);
  await connection.end();
  return {
    id,
    from: header?.from?.[0] ?? "",
    subject: header?.subject?.[0] ?? "",
    date: header?.date?.[0] ?? "",
    text: parsed.text?.trim() ?? "",
  };
}

export async function sendEmail(
  config: EmailConfig,
  params: { to: string; subject: string; body: string },
): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure,
    auth: {
      user: config.user,
      pass: config.password,
    },
  });
  await transporter.sendMail({
    from: config.user,
    to: params.to,
    subject: params.subject,
    text: params.body,
  });
}

export async function deleteEmail(config: EmailConfig, id: number): Promise<void> {
  const connection = await imaps.connect({
    imap: {
      user: config.user,
      password: config.password,
      host: config.imapHost,
      port: config.imapPort,
      tls: config.imapTls,
      authTimeout: 10000,
    },
  });
  await connection.openBox("INBOX");
  await connection.addFlags(id, "\\\\Deleted");
  await new Promise<void>((resolve, reject) => {
    connection.imap.expunge((error: unknown) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
  await connection.end();
}
