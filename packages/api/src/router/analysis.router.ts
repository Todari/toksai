import { z } from "zod";
import { router, publicProcedure } from "../trpc";

export const analysisRouter = router({
  get: publicProcedure
    .input(z.object({ viewToken: z.string() }))
    .query(({ input, ctx }) => ctx.analysis.getByViewToken(input.viewToken)),
  identify: publicProcedure
    .input(
      z.object({
        adminToken: z.string(),
        ownerRawName: z.string(),
        nicknames: z.record(z.string().max(100), z.string().max(20)),
        authorAliasMap: z
          .record(z.string().max(100), z.string().max(100).nullable())
          .optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.analysis.identify(
        input.adminToken,
        input.ownerRawName,
        input.nicknames,
        input.authorAliasMap,
      );
      return { ok: true as const };
    }),
  start: publicProcedure
    .input(z.object({ adminToken: z.string() }))
    .mutation(({ input, ctx }) => ctx.analysis.start(input.adminToken, ctx.clientIp)),
  result: publicProcedure
    .input(z.object({ viewToken: z.string() }))
    .query(({ input, ctx }) => ctx.analysis.getResult(input.viewToken)),
  delete: publicProcedure
    .input(z.object({ adminToken: z.string() }))
    .mutation(({ input, ctx }) => ctx.analysis.deleteByAdminToken(input.adminToken)),
});
