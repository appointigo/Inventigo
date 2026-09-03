import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { WhatsAppError } from "../errors";
import type { WhatsAppCredentialStore } from "./WhatsAppCredentialStore";

const PREFIX = "db://whatsapp-credentials/";

export class PrismaWhatsAppCredentialStore implements WhatsAppCredentialStore {
  constructor(private readonly prisma: PrismaClient, private readonly key: Buffer) {
    if (key.length !== 32) throw new Error("WhatsApp credential encryption key must be 32 bytes");
  }
  async save(input: { organizationId: string; accessToken: string; expiresAt?: Date }) {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(input.accessToken, "utf8"), cipher.final()]);
    const row = await this.prisma.whatsAppCredential.create({ data: {
      organizationId: input.organizationId, ciphertext: ciphertext.toString("base64"),
      iv: iv.toString("base64"), authTag: cipher.getAuthTag().toString("base64"), expiresAt: input.expiresAt,
    }, select: { id: true } });
    return `${PREFIX}${row.id}`;
  }
  async resolve(credentialRef: string, organizationId: string) {
    if (!credentialRef.startsWith(PREFIX)) throw new WhatsAppError("META_AUTH_FAILED", "Unsupported credential reference");
    const row = await this.prisma.whatsAppCredential.findFirst({ where: {
      id: credentialRef.slice(PREFIX.length), organizationId, provider: "META",
    } });
    if (!row || (row.expiresAt && row.expiresAt <= new Date())) throw new WhatsAppError("META_AUTH_FAILED", "WhatsApp credential is missing or expired");
    try {
      const decipher = createDecipheriv("aes-256-gcm", this.key, Buffer.from(row.iv, "base64"));
      decipher.setAuthTag(Buffer.from(row.authTag, "base64"));
      return Buffer.concat([decipher.update(Buffer.from(row.ciphertext, "base64")), decipher.final()]).toString("utf8");
    } catch (cause) {
      throw new WhatsAppError("META_AUTH_FAILED", "WhatsApp credential could not be decrypted", { cause });
    }
  }
}
