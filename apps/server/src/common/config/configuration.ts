export default () => ({
  port: parseInt(process.env.PORT ?? "4100", 10),
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:3000",
  database: { url: process.env.DATABASE_URL ?? "" },
  encryptionKey: process.env.ENCRYPTION_KEY ?? "",
  gemini: { apiKey: process.env.GEMINI_API_KEY ?? "" },
  email: {
    inboundDomain: process.env.EMAIL_INBOUND_DOMAIN ?? "talk.todari.dev",
    resendApiKey: process.env.RESEND_API_KEY ?? "",
    resendWebhookSecret: process.env.RESEND_WEBHOOK_SECRET ?? "",
  },
});
