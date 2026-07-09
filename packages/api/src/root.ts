import { router } from "./trpc";
import { analysisRouter } from "./router/analysis.router";

export const appRouter = router({ analysis: analysisRouter });
export type AppRouter = typeof appRouter;
