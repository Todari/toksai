import type { AnalysisResultView } from "@toksai/shared";
export type { AnalysisResultView } from "@toksai/shared";

export interface ParticipantView {
  id: string;
  rawName: string;
  nickname: string | null;
  isOwner: boolean;
}

export type AuthorAliasMap = Record<string, string | null>;

export interface AnalysisView {
  id: string;
  status: string;
  createdAt: Date;
  participants: ParticipantView[];
  detectedAuthorNames: string[];
  authorAliasMap: AuthorAliasMap;
}

export interface AnalysisContract {
  getByViewToken(viewToken: string): Promise<AnalysisView | null>;
  identify(
    adminToken: string,
    ownerRawName: string,
    nicknames: Record<string, string>,
    authorAliasMap?: AuthorAliasMap,
  ): Promise<void>;
  start(adminToken: string, clientId?: string): Promise<{ ok: true }>;
  getResult(viewToken: string): Promise<AnalysisResultView | null>;
  deleteByAdminToken(adminToken: string): Promise<{ ok: true }>;
}

export interface TrpcContext {
  analysis: AnalysisContract;
  clientIp: string;
}
