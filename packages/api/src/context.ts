export interface ParticipantView {
  id: string;
  rawName: string;
  nickname: string | null;
  isOwner: boolean;
}

export interface AnalysisView {
  id: string;
  status: string;
  createdAt: Date;
  participants: ParticipantView[];
}

export interface AnalysisContract {
  getByViewToken(viewToken: string): Promise<AnalysisView | null>;
  identify(
    adminToken: string,
    ownerRawName: string,
    nicknames: Record<string, string>,
  ): Promise<void>;
}

export interface TrpcContext {
  analysis: AnalysisContract;
}
