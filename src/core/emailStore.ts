import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

export interface EmailConfig {
  provider: "gmail" | "icloud";
  user: string;
  password: string;
  imapHost: string;
  imapPort: number;
  imapTls: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
}

const SECURE_DIR = resolve("state", "secure");
const EMAIL_PATH = resolve(SECURE_DIR, "email.json");

export async function saveEmailConfig(config: EmailConfig): Promise<void> {
  await mkdir(SECURE_DIR, { recursive: true });
  await writeFile(EMAIL_PATH, JSON.stringify(config, null, 2), "utf8");
}

export async function loadEmailConfig(): Promise<EmailConfig | null> {
  try {
    const data = await readFile(EMAIL_PATH, "utf8");
    return JSON.parse(data) as EmailConfig;
  } catch {
    return null;
  }
}

export function buildEmailConfig(
  provider: "gmail" | "icloud",
  user: string,
  password: string,
): EmailConfig {
  if (provider === "gmail") {
    return {
      provider,
      user,
      password,
      imapHost: "imap.gmail.com",
      imapPort: 993,
      imapTls: true,
      smtpHost: "smtp.gmail.com",
      smtpPort: 587,
      smtpSecure: false,
    };
  }
  return {
    provider,
    user,
    password,
    imapHost: "imap.mail.me.com",
    imapPort: 993,
    imapTls: true,
    smtpHost: "smtp.mail.me.com",
    smtpPort: 587,
    smtpSecure: false,
  };
}
