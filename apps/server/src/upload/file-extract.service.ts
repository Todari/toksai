import { Inject, Injectable, Optional } from "@nestjs/common";
import AdmZip from "adm-zip";

export interface ExtractLimits {
  maxTextEntries: number;
  maxExtractedBytes: number;
  maxCompressionRatio: number;
}

export const FILE_EXTRACT_LIMITS = Symbol("FILE_EXTRACT_LIMITS");

const DEFAULT_LIMITS: ExtractLimits = {
  maxTextEntries: 20,
  maxExtractedBytes: 50 * 1024 * 1024,
  maxCompressionRatio: 200,
};

@Injectable()
export class FileExtractService {
  private readonly limits: ExtractLimits;

  constructor(
    @Optional()
    @Inject(FILE_EXTRACT_LIMITS)
    limits?: ExtractLimits,
  ) {
    this.limits = limits ?? DEFAULT_LIMITS;
  }

  extractChatText(buffer: Buffer, filename: string): string {
    const lower = filename.toLowerCase();
    if (lower.endsWith(".txt") || lower.endsWith(".csv")) {
      return this.decodeText(buffer);
    }
    if (lower.endsWith(".zip")) {
      const zip = new AdmZip(buffer);
      // 카톡은 긴 대화를 여러 txt로 분할해 내보내므로 전부 이름순(숫자 인식)으로 병합한다.
      const entries = zip
        .getEntries()
        .filter(
          (e) =>
            !e.isDirectory &&
            /\.(txt|csv)$/i.test(e.entryName) &&
            !e.entryName.startsWith("__MACOSX/") &&
            !e.name.startsWith("._"),
        )
        .sort((a, b) =>
          a.entryName.localeCompare(b.entryName, undefined, { numeric: true }),
        );
      if (entries.length === 0) throw new Error("NO_TXT_IN_ZIP");
      if (entries.length > this.limits.maxTextEntries) {
        throw new Error("ZIP_TOO_MANY_FILES");
      }

      let declaredBytes = 0;
      for (const entry of entries) {
        const extracted = entry.header.size;
        const compressed = Math.max(1, entry.header.compressedSize);
        declaredBytes += extracted;
        if (declaredBytes > this.limits.maxExtractedBytes) throw new Error("ZIP_TOO_LARGE");
        if (extracted / compressed > this.limits.maxCompressionRatio) {
          throw new Error("ZIP_COMPRESSION_RATIO");
        }
      }

      let actualBytes = 0;
      return entries
        .map((entry) => {
          const data = entry.getData();
          actualBytes += data.length;
          if (actualBytes > this.limits.maxExtractedBytes) throw new Error("ZIP_TOO_LARGE");
          return this.decodeText(data);
        })
        .join("\n");
    }
    throw new Error("UNSUPPORTED_FILE");
  }

  private decodeText(buffer: Buffer): string {
    const utf8 = buffer.toString("utf8");
    const replacementCount = (utf8.match(/\uFFFD/g) ?? []).length;
    if (replacementCount === 0) return utf8;
    try {
      const eucKr = new TextDecoder("euc-kr").decode(buffer);
      const eucReplacementCount = (eucKr.match(/\uFFFD/g) ?? []).length;
      return eucReplacementCount < replacementCount ? eucKr : utf8;
    } catch {
      return utf8;
    }
  }
}
