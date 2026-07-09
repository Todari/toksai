import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "@toksai/api";
import { AppModule } from "./app.module";
import { AnalysisService } from "./analysis/analysis.service";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors({ origin: process.env.FRONTEND_URL ?? true, credentials: true });

  const analysisService = app.get(AnalysisService);
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.use(
    "/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext: () => ({ analysis: analysisService }),
    }),
  );

  const port = parseInt(process.env.PORT ?? "4100", 10);
  await app.listen(port);
  console.log(`server on :${port}`);
}
bootstrap();
