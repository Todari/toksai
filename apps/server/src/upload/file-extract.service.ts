import { Injectable } from "@nestjs/common";
import AdmZip from "adm-zip";

@Injectable()
export class FileExtractService {
  extractChatText(buffer: Buffer, filename: string): string {
    const lower = filename.toLowerCase();
    if (lower.endsWith(".txt")) {
      return buffer.toString("utf8");
    }
    if (lower.endsWith(".zip")) {
      const zip = new AdmZip(buffer);
      // 카톡은 긴 대화를 여러 txt로 분할해 내보내므로 전부 이름순(숫자 인식)으로 병합한다.
      const entries = zip
        .getEntries()
        .filter(
          (e) =>
            !e.isDirectory &&
            e.entryName.toLowerCase().endsWith(".txt") &&
            !e.entryName.startsWith("__MACOSX/") &&
            !e.name.startsWith("._"),
        )
        .sort((a, b) =>
          a.entryName.localeCompare(b.entryName, undefined, { numeric: true }),
        );
      if (entries.length === 0) throw new Error("NO_TXT_IN_ZIP");
      return entries.map((e) => e.getData().toString("utf8")).join("\n");
    }
    throw new Error("UNSUPPORTED_FILE");
  }
}
