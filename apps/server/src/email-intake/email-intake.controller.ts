import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  RawBodyRequest,
  Req,
} from "@nestjs/common";
import type { Request } from "express";
import { EmailIntakeService } from "./email-intake.service";

@Controller("email-intakes")
export class EmailIntakeController {
  constructor(private readonly emailIntake: EmailIntakeService) {}

  @Post()
  create(@Req() req: Request) {
    return this.emailIntake.create(req.ip ?? "unknown");
  }

  @Post("status")
  @HttpCode(HttpStatus.OK)
  status(@Body("token") token: string) {
    return this.emailIntake.getStatus(token);
  }
}

@Controller("webhooks/resend")
export class ResendWebhookController {
  constructor(private readonly emailIntake: EmailIntakeService) {}

  @Post("inbound")
  @HttpCode(HttpStatus.OK)
  async inbound(@Req() req: RawBodyRequest<Request>) {
    const rawBody = req.rawBody;
    const id = req.get("svix-id");
    const timestamp = req.get("svix-timestamp");
    const signature = req.get("svix-signature");
    if (!rawBody || !id || !timestamp || !signature) {
      throw new BadRequestException("Invalid webhook request");
    }
    return this.emailIntake.handleWebhook(rawBody.toString("utf8"), {
      id,
      timestamp,
      signature,
    });
  }
}
