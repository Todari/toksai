import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { prisma } from "@toksai/db";
import configuration from "./common/config/configuration";
import { CryptoService } from "./common/crypto/crypto.service";
import { FileExtractService } from "./upload/file-extract.service";
import { AnalysisService } from "./analysis/analysis.service";
import { UploadController } from "./upload/upload.controller";
import { HealthController } from "./health.controller";

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, load: [configuration] })],
  controllers: [UploadController, HealthController],
  providers: [
    FileExtractService,
    { provide: CryptoService, useFactory: () => new CryptoService() },
    {
      provide: AnalysisService,
      useFactory: (extractor: FileExtractService, crypto: CryptoService) =>
        new AnalysisService(prisma, extractor, crypto),
      inject: [FileExtractService, CryptoService],
    },
  ],
})
export class AppModule {}
