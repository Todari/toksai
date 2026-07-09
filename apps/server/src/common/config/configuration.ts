export default () => ({
  port: parseInt(process.env.PORT ?? "4100", 10),
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:3000",
  database: { url: process.env.DATABASE_URL ?? "" },
  encryptionKey: process.env.ENCRYPTION_KEY ?? "",
  gemini: { apiKey: process.env.GEMINI_API_KEY ?? "" },
});
