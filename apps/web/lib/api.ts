import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@toksai/api";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4100";

export const trpc = createTRPCClient<AppRouter>({
  links: [httpBatchLink({ url: `${API}/trpc` })],
});

export interface UploadResult { id: string; viewToken: string; adminToken: string }

export async function uploadFile(file: File): Promise<UploadResult> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API}/upload`, { method: "POST", body: fd });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "업로드 실패" }));
    throw new Error(err.message ?? "업로드 실패");
  }
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
