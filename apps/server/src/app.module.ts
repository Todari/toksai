import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { prisma } from "@toksai/db";
import configuration from "./common/config/configuration";
import { CryptoService } from "./common/crypto/crypto.service";
import { FileExtractService } from "./upload/file-extract.service";
import { AnalysisService } from "./analysis/analysis.service";
import { AnalysisRunnerService } from "./analysis-pipeline/analysis-runner.service";
import { GeminiService } from "./gemini/gemini.service";
import { UploadController } from "./upload/upload.controller";
import { HealthController } from "./health.controller";

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, load: [configuration] })],
  controllers: [UploadController, HealthController],
  providers: [
    FileExtractService,
    { provide: CryptoService, useFactory: () => new CryptoService() },
    GeminiService,
    {
      provide: AnalysisRunnerService,
      useFactory: (crypto: CryptoService, gemini: GeminiService) =>
        new AnalysisRunnerService(prisma, crypto, gemini),
      inject: [CryptoService, GeminiService],
    },
    {
      provide: AnalysisService,
      useFactory: (extractor: FileExtractService, crypto: CryptoService, runner: AnalysisRunnerService) =>
        new AnalysisService(prisma, extractor, crypto, runner),
      inject: [FileExtractService, CryptoService, AnalysisRunnerService],
    },
  ],
})
export class AppModule {}
