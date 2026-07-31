import { Injectable } from "@nestjs/common";
import {
  Resend,
  type AttachmentData,
  type EmailReceivedEvent,
  type WebhookEventPayload,
} from "resend";

export interface WebhookHeaders {
  id: string;
  timestamp: string;
  signature: string;
}

export interface InboundEmailGateway {
  verify(payload: string, headers: WebhookHeaders): WebhookEventPayload;
  listAttachments(emailId: string): Promise<AttachmentData[]>;
  download(url: string, maxBytes: number): Promise<Buffer>;
}

@Injectable()
export class ResendInboundGateway implements InboundEmailGateway {
  private resendClient?: Resend;

  verify(payload: string, headers: WebhookHeaders): WebhookEventPayload {
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
    if (!webhookSecret) throw new Error("RESEND_WEBHOOK_NOT_CONFIGURED");
    return this.client().webhooks.verify({ payload, headers, webhookSecret });
  }

  async listAttachments(emailId: string): Promise<AttachmentData[]> {
    const { data, error } = await this.client().emails.receiving.attachments.list({ emailId });
    if (error || !data) {
      throw new Error(`RESEND_ATTACHMENTS_FAILED:${error?.message ?? "unknown"}`);
    }
    return data.data;
  }

  async download(url: string, maxBytes: number): Promise<Buffer> {
    const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw new Error(`RESEND_ATTACHMENT_DOWNLOAD_FAILED:${response.status}`);

    const contentLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > maxBytes) {
      throw new Error("EMAIL_FILE_TOO_LARGE");
    }
    if (!response.body) throw new Error("RESEND_ATTACHMENT_DOWNLOAD_FAILED:NO_BODY");

    const reader = response.body.getReader();
    const chunks: Buffer[] = [];
    let totalBytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        throw new Error("EMAIL_FILE_TOO_LARGE");
      }
      chunks.push(Buffer.from(value));
    }
    return Buffer.concat(chunks, totalBytes);
  }

  private client(): Resend {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_NOT_CONFIGURED");
    this.resendClient ??= new Resend(apiKey);
    return this.resendClient;
  }
}

export type VerifiedInboundEmailEvent = EmailReceivedEvent;
