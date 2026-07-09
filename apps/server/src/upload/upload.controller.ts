import {
  BadRequestException, Controller, Post, UploadedFile, UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ParseError } from "@toksai/shared";
import { AnalysisService } from "../analysis/analysis.service";

@Controller("upload")
export class UploadController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Post()
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 20 * 1024 * 1024 } }))
  async upload(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException({ code: "NO_FILE", message: "파일이 없습니다." });
    try {
      return await this.analysisService.createFromUpload(file.buffer, file.originalname);
    } catch (e) {
      if (e instanceof ParseError) {
        throw new BadRequestException({ code: e.code, message: e.message });
      }
      const msg = (e as Error).message;
      if (["UNSUPPORTED_FILE", "NO_TXT_IN_ZIP"].includes(msg)) {
        throw new BadRequestException({ code: msg, message: "지원하지 않는 파일입니다." });
      }
      throw e;
    }
  }
}
