import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { PrismaClient } from "@toksai/db";
import { ParseError } from "@toksai/shared";
import { randomBytes } from "node:crypto";
import { AnalysisService } from "../analysis/analysis.service";
import { RateLimitService } from "../common/rate-limit.service";
import type {
  InboundEmailGateway,
  VerifiedInboundEmailEvent,
  WebhookHeaders,
} from "./resend-inbound.gateway";

const INTAKE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;
const ADDRESS_PREFIX = "analysis-";
const SUPPORTED_FILE = /\.(zip|txt|csv)$/i;

export type EmailIntakeStatusResponse =
  | { status: "WAITING" | "PROCESSING"; expiresAt: string }
  | { status: "READY"; expiresAt: string; viewToken: string; adminToken: string }
  | { status: "FAILED"; expiresAt: string; errorCode: string }
  | { status: "EXPIRED" | "NOT_FOUND" };

@Injectable()
export class EmailIntakeService {
  private readonly logger = new Logger(EmailIntakeService.name);

  constructor(
    private readonly prisma: PrismaClient,
    private readonly analysis: AnalysisService,
    private readonly rateLimit: RateLimitService,
    private readonly gateway: InboundEmailGateway,
  ) {}

  async create(clientId: string) {
    if (!process.env.RESEND_API_KEY || !process.env.RESEND_WEBHOOK_SECRET) {
      throw new ServiceUnavailableException({
        code: "EMAIL_INTAKE_UNAVAILABLE",
        message: "메일 수신 기능을 준비하고 있어요. 잠시 후 다시 시도해 주세요.",
      });
    }
    this.rateLimit.assert("email-intake-create", clientId, 12, 60 * 60 * 1000);
    const token = randomBytes(16).toString("hex");
    const expiresAt = new Date(Date.now() + INTAKE_TTL_MS);
    await this.prisma.emailIntake.create({
      data: { token, expiresAt },
    });
    return {
      token,
      address: `${ADDRESS_PREFIX}${token}@${this.inboundDomain()}`,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async getStatus(token: string): Promise<EmailIntakeStatusResponse> {
    if (!/^[a-f0-9]{32}$/.test(token)) return { status: "NOT_FOUND" };
    const intake = await this.prisma.emailIntake.findUnique({
      where: { token },
      include: { analysis: true },
    });
    if (!intake) return { status: "NOT_FOUND" };
    if (intake.expiresAt.getTime() <= Date.now()) return { status: "EXPIRED" };
    const expiresAt = intake.expiresAt.toISOString();

    if (intake.status === "READY") {
      if (intake.analysis) {
        return {
          status: "READY",
          expiresAt,
          viewToken: intake.analysis.viewToken,
          adminToken: intake.analysis.adminToken,
        };
      }
      return { status: "FAILED", expiresAt, errorCode: "ANALYSIS_NOT_FOUND" };
    }
    if (intake.status === "FAILED") {
      return {
        status: "FAILED",
        expiresAt,
        errorCode: intake.errorCode ?? "EMAIL_PROCESSING_FAILED",
      };
    }
    return {
      status: intake.status === "PROCESSING" ? "PROCESSING" : "WAITING",
      expiresAt,
    };
  }

  async handleWebhook(payload: string, headers: WebhookHeaders): Promise<{ ok: true }> {
    let event;
    try {
      event = this.gateway.verify(payload, headers);
    } catch {
      throw new BadRequestException("Invalid webhook signature");
    }
    if (event.type !== "email.received") return { ok: true };

    const token = this.findToken(event);
    if (!token) return { ok: true };
    const intake = await this.prisma.emailIntake.findUnique({ where: { token } });
    if (!intake || intake.expiresAt.getTime() <= Date.now()) return { ok: true };
    if (intake.status === "READY" || intake.status === "FAILED") return { ok: true };

    const claimed = await this.prisma.emailIntake.updateMany({
      where: { id: intake.id, status: "WAITING" },
      data: {
        status: "PROCESSING",
        sourceEmailId: event.data.email_id,
        errorCode: null,
      },
    });
    if (claimed.count === 0) return { ok: true };

    try {
      const attachment = await this.selectAttachment(event.data.email_id);
      const buffer = await this.gateway.download(
        attachment.download_url,
        MAX_ATTACHMENT_BYTES,
      );

      const analysis = await this.analysis.createFromFile(
        buffer,
        attachment.filename ?? "chat.txt",
        "email",
      );
      await this.prisma.emailIntake.update({
        where: { id: intake.id },
        data: { status: "READY", analysisId: analysis.id },
      });
    } catch (error) {
      const errorCode = this.toErrorCode(error);
      this.logger.warn(`email intake ${intake.id} failed: ${errorCode}`);
      await this.prisma.emailIntake.update({
        where: { id: intake.id },
        data: { status: "FAILED", errorCode },
      });
    }

    return { ok: true };
  }

  private async selectAttachment(emailId: string) {
    const attachments = (await this.gateway.listAttachments(emailId)).filter(
      (attachment) =>
        Boolean(attachment.filename) &&
        SUPPORTED_FILE.test(attachment.filename ?? "") &&
        attachment.content_disposition !== "inline",
    );
    if (attachments.length === 0) throw new Error("EMAIL_NO_SUPPORTED_FILE");

    const zipFiles = attachments.filter((attachment) => /\.zip$/i.test(attachment.filename ?? ""));
    const selected =
      attachments.length === 1 ? attachments[0] : zipFiles.length === 1 ? zipFiles[0] : null;
    if (!selected) throw new Error("EMAIL_MULTIPLE_CHAT_FILES");
    if (selected.size > MAX_ATTACHMENT_BYTES) throw new Error("EMAIL_FILE_TOO_LARGE");
    return selected;
  }

  private findToken(event: VerifiedInboundEmailEvent): string | null {
    const suffix = `@${this.inboundDomain()}`.toLowerCase();
    for (const recipient of event.data.to) {
      const address = recipient.trim().toLowerCase();
      if (!address.endsWith(suffix)) continue;
      const local = address.slice(0, -suffix.length);
      if (!local.startsWith(ADDRESS_PREFIX)) continue;
      const token = local.slice(ADDRESS_PREFIX.length);
      if (/^[a-f0-9]{32}$/.test(token)) return token;
    }
    return null;
  }

  private inboundDomain(): string {
    return (process.env.EMAIL_INBOUND_DOMAIN ?? "talk.todari.dev").trim().toLowerCase();
  }

  private toErrorCode(error: unknown): string {
    if (error instanceof ParseError) return error.code;
    const code = error instanceof Error ? error.message.split(":")[0] : "";
    const known = new Set([
      "EMAIL_NO_SUPPORTED_FILE",
      "EMAIL_MULTIPLE_CHAT_FILES",
      "EMAIL_FILE_TOO_LARGE",
      "UNSUPPORTED_FILE",
      "NO_TXT_IN_ZIP",
      "ZIP_TOO_MANY_FILES",
      "ZIP_TOO_LARGE",
      "ZIP_COMPRESSION_RATIO",
    ]);
    return known.has(code) ? code : "EMAIL_PROCESSING_FAILED";
  }
}
