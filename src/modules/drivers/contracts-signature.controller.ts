import { Body, Controller, Get, Headers, Param, Post, Req } from "@nestjs/common";
import { DriversService } from "./drivers.service";

@Controller("contracts/signature")
export class ContractsSignatureController {
  constructor(private readonly driversService: DriversService) {}

  @Get(":token")
  async getSignatureSession(@Param("token") token: string) {
    return this.driversService.getEmploymentContractSignatureSession(token);
  }

  @Post(":token/confirm")
  async confirmSignature(
    @Param("token") token: string,
    @Body()
    body?: {
      signerName?: string;
      signerDocument?: string;
    },
    @Req() req?: any,
    @Headers("user-agent") userAgent?: string,
    @Headers("x-forwarded-for") forwardedFor?: string,
    @Headers("x-real-ip") realIp?: string
  ) {
    const headerForwardedIp =
      typeof forwardedFor === "string" && forwardedFor.trim().length > 0
        ? forwardedFor.split(",")[0]?.trim() || undefined
        : undefined;
    const headerRealIp = typeof realIp === "string" && realIp.trim().length > 0 ? realIp.trim() : undefined;
    const requestIp = typeof req?.ip === "string" && req.ip.trim().length > 0 ? req.ip.trim() : undefined;
    const socketIp =
      typeof req?.socket?.remoteAddress === "string" && req.socket.remoteAddress.trim().length > 0
        ? req.socket.remoteAddress.trim()
        : undefined;
    const signerIp = this.normalizeIp(headerForwardedIp || headerRealIp || requestIp || socketIp);

    return this.driversService.confirmEmploymentContractSignature(token, {
      signerName: body?.signerName,
      signerDocument: body?.signerDocument,
      signerIp,
      userAgent
    });
  }

  private normalizeIp(value?: string): string | undefined {
    if (!value) {
      return undefined;
    }
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }
    if (trimmed === "::1") {
      return "127.0.0.1";
    }
    if (trimmed.startsWith("::ffff:")) {
      return trimmed.slice("::ffff:".length);
    }
    return trimmed;
  }
}
