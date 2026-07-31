import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@toksai/api";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4100";

export const trpc = createTRPCClient<AppRouter>({
  links: [httpBatchLink({ url: `${API}/trpc` })],
});

export interface UploadResult { id: string; viewToken: string; adminToken: string }
export interface EmailIntake {
  token: string;
  address: string;
  expiresAt: string;
}
export type EmailIntakeStatus =
  | { status: "WAITING" | "PROCESSING"; expiresAt: string }
  | { status: "READY"; expiresAt: string; viewToken: string; adminToken: string }
  | { status: "FAILED"; expiresAt: string; errorCode: string }
  | { status: "EXPIRED" | "NOT_FOUND" };

export class UploadApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "UploadApiError";
  }
}

export async function uploadFile(file: File): Promise<UploadResult> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API}/upload`, { method: "POST", body: fd });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "업로드 실패" }));
    throw new UploadApiError(
      typeof err.message === "string" ? err.message : "업로드 실패",
      typeof err.code === "string" ? err.code : `HTTP_${res.status}`,
      res.status,
    );
  }
  return res.json();
}

export async function createEmailIntake(): Promise<EmailIntake> {
  const res = await fetch(`${API}/email-intakes`, { method: "POST" });
  if (!res.ok) throw new Error(`EMAIL_INTAKE_CREATE_${res.status}`);
  return res.json();
}

export async function getEmailIntake(token: string): Promise<EmailIntakeStatus> {
  const res = await fetch(`${API}/email-intakes/status`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token }),
  });
  if (!res.ok) throw new Error(`EMAIL_INTAKE_STATUS_${res.status}`);
  return res.json();
}

export function saveAdminToken(viewToken: string, adminToken: string) {
  localStorage.setItem(`toksai:admin:${viewToken}`, adminToken);
}
export function loadAdminToken(viewToken: string): string {
  return localStorage.getItem(`toksai:admin:${viewToken}`) ?? "";
}
export function clearAdminToken(viewToken: string) {
  localStorage.removeItem(`toksai:admin:${viewToken}`);
}

export const startAnalysis = (adminToken: string) => trpc.analysis.start.mutate({ adminToken });
export const getAnalysis = (viewToken: string) => trpc.analysis.get.query({ viewToken });
export const getResult = (viewToken: string) => trpc.analysis.result.query({ viewToken });
export const deleteAnalysis = (adminToken: string) => trpc.analysis.delete.mutate({ adminToken });
