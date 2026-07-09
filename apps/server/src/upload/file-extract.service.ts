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
      const entry = zip
        .getEntries()
        .find((e) => !e.isDirectory && e.entryName.toLowerCase().endsWith(".txt"));
      if (!entry) throw new Error("NO_TXT_IN_ZIP");
      return entry.getData().toString("utf8");
    }
    throw new Error("UNSUPPORTED_FILE");
  }
}
