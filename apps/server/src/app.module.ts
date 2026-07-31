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
import {
  EmailIntakeController,
  ResendWebhookController,
} from "./email-intake/email-intake.controller";
import { EmailIntakeService } from "./email-intake/email-intake.service";
import {
  ResendInboundGateway,
} from "./email-intake/resend-inbound.gateway";

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, load: [configuration] })],
  controllers: [
    UploadController,
    EmailIntakeController,
    ResendWebhookController,
    HealthController,
  ],
  providers: [
    FileExtractService,
    RateLimitService,
    ResendInboundGateway,
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
    {
      provide: EmailIntakeService,
      useFactory: (
        analysis: AnalysisService,
        rateLimit: RateLimitService,
        gateway: ResendInboundGateway,
      ) => new EmailIntakeService(prisma, analysis, rateLimit, gateway),
      inject: [AnalysisService, RateLimitService, ResendInboundGateway],
    },
  ],
})
export class AppModule {}
