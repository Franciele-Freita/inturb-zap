import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { AuthService } from "./auth.service";

type RequestWithAdminSession = {
  headers: {
    authorization?: string;
    cookie?: string;
  };
  adminSession?: Awaited<ReturnType<AuthService["validateAdminSession"]>>;
};

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithAdminSession>();
    const session = await this.authService.validateAdminSession(request.headers.authorization, request.headers.cookie);
    request.adminSession = session;
    return true;
  }
}
