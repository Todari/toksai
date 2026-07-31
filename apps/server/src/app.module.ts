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
import { RateLimitService } from "./common/rate-limit.service";

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, load: [configuration] })],
  controllers: [UploadController, HealthController],
  providers: [
    FileExtractService,
    RateLimitService,
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
      useFactory: (
        extractor: FileExtractService,
        crypto: CryptoService,
        runner: AnalysisRunnerService,
        rateLimit: RateLimitService,
      ) => new AnalysisService(prisma, extractor, crypto, runner, rateLimit),
      inject: [FileExtractService, CryptoService, AnalysisRunnerService, RateLimitService],
    },
  ],
})
export class AppModule {}
