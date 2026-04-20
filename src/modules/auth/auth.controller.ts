import { Body, Controller, Get, Headers, Ip, Patch, Post, Res } from "@nestjs/common";
import { AdminLoginDto } from "./dto/admin-login.dto";
import { ChangeAdminEmailDto } from "./dto/change-admin-email.dto";
import { ChangeAdminPasswordDto } from "./dto/change-admin-password.dto";
import { DriverLoginDto } from "./dto/driver-login.dto";
import { LoginDto } from "./dto/login.dto";
import { UpdateAdminProfileDto } from "./dto/update-admin-profile.dto";
import { ADMIN_SESSION_COOKIE_NAME, AuthService } from "./auth.service";

function buildAdminSessionCookieOptions(expiresAt?: string) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt ? new Date(expiresAt) : undefined
  };
}

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.phone, dto.pin);
  }

  @Post("driver/login")
  driverLogin(@Body() dto: DriverLoginDto) {
    return this.authService.driverLogin(dto.cpf, dto.password);
  }

  @Post("admin/login")
  async adminLogin(@Body() dto: AdminLoginDto, @Ip() ip: string | undefined, @Res({ passthrough: true }) response: any) {
    const authResponse = await this.authService.adminLogin(dto, ip);
    response.cookie(ADMIN_SESSION_COOKIE_NAME, authResponse.sessionToken, buildAdminSessionCookieOptions(authResponse.expiresAt));

    return {
      expiresAt: authResponse.expiresAt,
      user: authResponse.user
    };
  }

  @Get("admin/profile")
  adminProfile(@Headers("authorization") authorization?: string, @Headers("cookie") cookieHeader?: string) {
    return this.authService.getAdminProfile({ authorization, cookieHeader });
  }

  @Patch("admin/profile")
  updateAdminProfile(
    @Headers("authorization") authorization: string | undefined,
    @Headers("cookie") cookieHeader: string | undefined,
    @Body() dto: UpdateAdminProfileDto
  ) {
    return this.authService.updateAdminProfile({ authorization, cookieHeader }, dto);
  }

  @Post("admin/change-password")
  changeAdminPassword(
    @Headers("authorization") authorization: string | undefined,
    @Headers("cookie") cookieHeader: string | undefined,
    @Body() dto: ChangeAdminPasswordDto
  ) {
    return this.authService.changeAdminPassword({ authorization, cookieHeader }, dto);
  }

  @Post("admin/change-email")
  changeAdminEmail(
    @Headers("authorization") authorization: string | undefined,
    @Headers("cookie") cookieHeader: string | undefined,
    @Body() dto: ChangeAdminEmailDto
  ) {
    return this.authService.changeAdminEmail({ authorization, cookieHeader }, dto);
  }

  @Post("admin/logout")
  async adminLogout(
    @Headers("authorization") authorization: string | undefined,
    @Headers("cookie") cookieHeader: string | undefined,
    @Res({ passthrough: true }) response: any
  ) {
    response.clearCookie(ADMIN_SESSION_COOKIE_NAME, buildAdminSessionCookieOptions());
    return this.authService.adminLogout({ authorization, cookieHeader });
  }
}
