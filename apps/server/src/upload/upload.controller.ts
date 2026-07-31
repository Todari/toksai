import {
  BadRequestException, Controller, Post, Req, UploadedFile, UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Request } from "express";
import { ParseError } from "@toksai/shared";
import { AnalysisService } from "../analysis/analysis.service";
import { RateLimitService } from "../common/rate-limit.service";

@Controller("upload")
export class UploadController {
  constructor(
    private readonly analysisService: AnalysisService,
    private readonly rateLimit: RateLimitService,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 20 * 1024 * 1024 } }))
  async upload(@Req() req: Request, @UploadedFile() file?: Express.Multer.File) {
    this.rateLimit.assert("upload", req.ip ?? "unknown", 12, 60 * 60 * 1000);
    if (!file) throw new BadRequestException({ code: "NO_FILE", message: "파일이 없습니다." });
    try {
      return await this.analysisService.createFromUpload(file.buffer, file.originalname);
    } catch (e) {
      if (e instanceof ParseError) {
        throw new BadRequestException({ code: e.code, message: e.message });
      }
      const msg = (e as Error).message;
      const extractMessages: Record<string, string> = {
        UNSUPPORTED_FILE: "지원하지 않는 파일입니다.",
        NO_TXT_IN_ZIP: "압축 파일에서 대화 파일을 찾지 못했어요.",
        ZIP_TOO_MANY_FILES: "압축 파일 안의 텍스트 파일이 너무 많아요.",
        ZIP_TOO_LARGE: "압축을 푼 대화 파일이 너무 커요.",
        ZIP_COMPRESSION_RATIO: "안전하게 열 수 없는 압축 파일이에요.",
      };
      if (extractMessages[msg]) {
        throw new BadRequestException({ code: msg, message: extractMessages[msg] });
      }
      throw e;
    }
  }
}
