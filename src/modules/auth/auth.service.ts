import { randomBytes, scryptSync, createHash, timingSafeEqual } from "crypto";
import { User, UserGender, UserRole } from "@prisma/client";
import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { DriversService } from "../drivers/drivers.service";
import { PrismaService } from "../prisma/prisma.service";
import { AdminLoginDto } from "./dto/admin-login.dto";
import { ChangeAdminEmailDto } from "./dto/change-admin-email.dto";
import { ChangeAdminPasswordDto } from "./dto/change-admin-password.dto";
import { UpdateAdminProfileDto } from "./dto/update-admin-profile.dto";

const ADMIN_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const DRIVER_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const ADMIN_LOGIN_WINDOW_MS = 15 * 60 * 1000;
const ADMIN_LOGIN_BLOCK_MS = 15 * 60 * 1000;
const ADMIN_LOGIN_MAX_ATTEMPTS = 5;
const ADMIN_ROLES = [UserRole.ADMIN, UserRole.OPERATOR] as const;
export const ADMIN_SESSION_COOKIE_NAME = "inturb_admin_session";

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function extractBearerToken(authorization?: string): string | null {
  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token.trim();
}

type AdminSessionAccessInput = {
  authorization?: string;
  cookieHeader?: string;
};

type DriverSessionAccessInput = {
  authorization?: string;
};

type AdminLoginAttemptState = {
  firstFailureAt: number;
  failCount: number;
  blockedUntil?: number;
};

type AdminProfileSummary = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "OPERATOR";
  cpf?: string;
  phone?: string;
  birthDate?: string;
  gender?: UserGender;
  isActive: boolean;
};

@Injectable()
export class AuthService {
  private readonly adminLoginAttempts = new Map<string, AdminLoginAttemptState>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly driversService: DriversService
  ) {}

  async login(phone: string, _pin: string) {
    const normalizedPhone = this.normalizePhone(phone);
    const user = await this.prisma.user.findFirst({
      where: { phone: normalizedPhone },
      select: {
        id: true,
        driver: {
          select: {
            id: true,
            isActive: true
          }
        }
      }
    });

    if (!user?.driver) {
      throw new UnauthorizedException("Motorista nao encontrado para esse telefone.");
    }

    if (!user.driver.isActive) {
      throw new ForbiddenException("Esse motorista esta inativo no painel administrativo.");
    }

    return this.buildDriverLoginResult(user.id, user.driver.id);
  }

  async driverLogin(cpf: string, password: string) {
    const normalizedCpf = this.normalizeCpf(cpf);
    if (!normalizedCpf) {
      throw new BadRequestException("CPF invalido.");
    }

    const user = await this.prisma.user.findFirst({
      where: {
        cpf: normalizedCpf,
        role: UserRole.DRIVER
      },
      select: {
        id: true,
        isActive: true,
        passwordHash: true,
        driver: {
          select: {
            id: true,
            isActive: true
          }
        }
      }
    });

    if (!user?.driver) {
      throw new UnauthorizedException("Motorista nao encontrado para esse CPF.");
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException("Esse motorista ainda nao possui senha cadastrada.");
    }

    if (!this.verifyPassword(password, user.passwordHash)) {
      throw new UnauthorizedException("Senha invalida para esse motorista.");
    }

    if (!user.isActive || !user.driver.isActive) {
      throw new ForbiddenException("Esse motorista esta inativo no painel administrativo.");
    }

    return this.buildDriverLoginResult(user.id, user.driver.id);
  }

  async adminLogin(input: AdminLoginDto, clientIp?: string) {
    const normalizedEmail = this.normalizeEmail(input.email);
    const attemptKey = this.buildAdminLoginAttemptKey(normalizedEmail, clientIp);
    this.assertAdminLoginAllowed(attemptKey);
    const existingAdminCount = await this.prisma.user.count({
      where: {
        role: { in: [...ADMIN_ROLES] }
      }
    });

    let user = await this.prisma.user.findFirst({
      where: {
        email: normalizedEmail,
        role: { in: [...ADMIN_ROLES] }
      }
    });

    if (!user) {
      if (existingAdminCount > 0) {
        this.recordAdminLoginFailure(attemptKey);
        throw new UnauthorizedException("Conta administrativa nao encontrada para esse e-mail.");
      }

      const expectedBootstrapKey = process.env.ADMIN_BOOTSTRAP_KEY?.trim();
      if (!expectedBootstrapKey) {
        throw new ForbiddenException("Bootstrap administrativo desabilitado. Configure ADMIN_BOOTSTRAP_KEY no backend.");
      }

      const normalizedName = input.name?.trim();
      if (!normalizedName) {
        throw new BadRequestException("Informe o nome para criar o primeiro administrador.");
      }

      if (input.bootstrapKey?.trim() !== expectedBootstrapKey) {
        this.recordAdminLoginFailure(attemptKey);
        throw new UnauthorizedException("Chave de bootstrap invalida para criar o primeiro administrador.");
      }

      user = await this.prisma.user.create({
        data: {
          role: UserRole.ADMIN,
          name: normalizedName,
          email: normalizedEmail,
          passwordHash: this.hashPassword(input.password),
          isActive: true
        }
      });
    }

    if (!user.passwordHash || !this.verifyPassword(input.password, user.passwordHash)) {
      this.recordAdminLoginFailure(attemptKey);
      throw new UnauthorizedException("Senha invalida para essa conta administrativa.");
    }

    if (!user.isActive) {
      throw new ForbiddenException("Essa conta administrativa esta inativa.");
    }

    this.clearAdminLoginFailures(attemptKey);
    const { token, expiresAt } = await this.createUserSession(user.id);
    const freshUser = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id } });

    return {
      sessionToken: token,
      expiresAt: expiresAt.toISOString(),
      user: this.toAdminProfile(freshUser)
    };
  }

  async getAdminProfile(input: AdminSessionAccessInput): Promise<AdminProfileSummary> {
    const { user } = await this.requireAdminSession(input);
    return this.toAdminProfile(user);
  }

  async updateAdminProfile(
    inputAccess: AdminSessionAccessInput,
    input: UpdateAdminProfileDto
  ): Promise<AdminProfileSummary> {
    const { user } = await this.requireAdminSession(inputAccess);

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        name: input.name.trim(),
        cpf: this.normalizeCpf(input.cpf),
        phone: this.normalizeOptionalPhone(input.phone),
        birthDate: input.birthDate ? this.normalizeBirthDate(input.birthDate) : null,
        gender: input.gender ?? null
      }
    });

    return this.toAdminProfile(updated);
  }

  async changeAdminPassword(
    inputAccess: AdminSessionAccessInput,
    input: ChangeAdminPasswordDto
  ): Promise<{ success: true }> {
    const { user } = await this.requireAdminSession(inputAccess);

    if (!user.passwordHash || !this.verifyPassword(input.currentPassword, user.passwordHash)) {
      throw new UnauthorizedException("Senha atual invalida.");
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: this.hashPassword(input.newPassword)
      }
    });

    return { success: true };
  }

  async changeAdminEmail(
    inputAccess: AdminSessionAccessInput,
    input: ChangeAdminEmailDto
  ): Promise<AdminProfileSummary> {
    const { user } = await this.requireAdminSession(inputAccess);

    if (!user.passwordHash || !this.verifyPassword(input.password, user.passwordHash)) {
      throw new UnauthorizedException("Senha invalida para alterar o e-mail.");
    }

    const normalizedEmail = this.normalizeEmail(input.newEmail);
    const existing = await this.prisma.user.findFirst({
      where: {
        email: normalizedEmail,
        NOT: { id: user.id },
        role: { in: [...ADMIN_ROLES] }
      }
    });

    if (existing) {
      throw new BadRequestException("Ja existe uma conta administrativa com esse e-mail.");
    }

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        email: normalizedEmail
      }
    });

    return this.toAdminProfile(updated);
  }

  async adminLogout(input: AdminSessionAccessInput): Promise<{ success: true }> {
    const token = this.extractAdminSessionToken(input);
    if (!token) {
      return { success: true };
    }

    await this.prisma.userSession.updateMany({
      where: {
        tokenHash: hashSessionToken(token),
        revokedAt: null
      },
      data: {
        revokedAt: new Date()
      }
    });

    return { success: true };
  }

  async validateAdminSession(authorization?: string, cookieHeader?: string) {
    return this.requireAdminSession({ authorization, cookieHeader });
  }

  async validateDriverSession(authorization?: string) {
    return this.requireDriverSession({ authorization });
  }

  private async requireAdminSession(input: AdminSessionAccessInput) {
    const token = this.extractAdminSessionToken(input);
    if (!token) {
      throw new UnauthorizedException("Sessao administrativa ausente.");
    }

    const session = await this.prisma.userSession.findUnique({
      where: {
        tokenHash: hashSessionToken(token)
      },
      include: {
        user: true
      }
    });

    if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException("Sessao administrativa expirada ou invalida.");
    }

    if (!ADMIN_ROLES.includes(session.user.role as (typeof ADMIN_ROLES)[number])) {
      throw new ForbiddenException("Essa conta nao possui acesso administrativo.");
    }

    if (!session.user.isActive || !session.user.email) {
      throw new ForbiddenException("Essa conta administrativa esta inativa.");
    }

    return session;
  }

  private async requireDriverSession(input: DriverSessionAccessInput) {
    const token = extractBearerToken(input.authorization);
    if (!token) {
      throw new UnauthorizedException("Sessao do motorista ausente.");
    }

    const session = await this.prisma.userSession.findUnique({
      where: {
        tokenHash: hashSessionToken(token)
      },
      include: {
        user: {
          include: {
            driver: {
              select: {
                id: true,
                isActive: true
              }
            }
          }
        }
      }
    });

    if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException("Sessao do motorista expirada ou invalida.");
    }

    if (session.user.role !== UserRole.DRIVER || !session.user.driver) {
      throw new ForbiddenException("Essa sessao nao pertence a um motorista.");
    }

    if (!session.user.isActive || !session.user.driver.isActive) {
      throw new ForbiddenException("Esse motorista esta inativo no painel administrativo.");
    }

    return session;
  }

  private assertAdminLoginAllowed(attemptKey: string): void {
    const now = Date.now();
    const current = this.adminLoginAttempts.get(attemptKey);

    if (!current) {
      return;
    }

    if (current.blockedUntil && current.blockedUntil > now) {
      const retryInMinutes = Math.max(1, Math.ceil((current.blockedUntil - now) / 60000));
      throw new HttpException(
        `Muitas tentativas de login. Tente novamente em ${retryInMinutes} minuto(s).`,
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    if (current.blockedUntil && current.blockedUntil <= now) {
      this.adminLoginAttempts.delete(attemptKey);
    }
  }

  private recordAdminLoginFailure(attemptKey: string): void {
    const now = Date.now();
    const current = this.adminLoginAttempts.get(attemptKey);

    if (!current || now - current.firstFailureAt > ADMIN_LOGIN_WINDOW_MS) {
      this.adminLoginAttempts.set(attemptKey, {
        firstFailureAt: now,
        failCount: 1
      });
      return;
    }

    const failCount = current.failCount + 1;
    this.adminLoginAttempts.set(attemptKey, {
      firstFailureAt: current.firstFailureAt,
      failCount,
      blockedUntil: failCount >= ADMIN_LOGIN_MAX_ATTEMPTS ? now + ADMIN_LOGIN_BLOCK_MS : current.blockedUntil
    });
  }

  private clearAdminLoginFailures(attemptKey: string): void {
    this.adminLoginAttempts.delete(attemptKey);
  }

  private buildAdminLoginAttemptKey(email: string, clientIp?: string): string {
    return `${email}:${this.normalizeClientIp(clientIp)}`;
  }

  private async createUserSession(userId: string, ttlMs: number = ADMIN_SESSION_TTL_MS) {
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + ttlMs);

    await this.prisma.userSession.create({
      data: {
        userId,
        tokenHash: hashSessionToken(token),
        expiresAt
      }
    });

    return { token, expiresAt };
  }

  private async buildDriverLoginResult(userId: string, driverId: string) {
    const { token } = await this.createUserSession(userId, DRIVER_SESSION_TTL_MS);
    const driver = await this.driversService.getDriver(driverId);

    return {
      accessToken: token,
      tokenType: "Bearer",
      expiresInSeconds: Math.floor(DRIVER_SESSION_TTL_MS / 1000),
      driver
    };
  }

  private toAdminProfile(user: User): AdminProfileSummary {
    if (!user.email || (user.role !== UserRole.ADMIN && user.role !== UserRole.OPERATOR)) {
      throw new ForbiddenException("Usuario nao pode ser exposto como conta administrativa.");
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      cpf: user.cpf ?? undefined,
      phone: user.phone ?? undefined,
      birthDate: user.birthDate?.toISOString().slice(0, 10),
      gender: user.gender ?? undefined,
      isActive: user.isActive
    };
  }

  private hashPassword(password: string): string {
    const salt = randomBytes(16).toString("hex");
    const hash = scryptSync(password, salt, 64).toString("hex");
    return `${salt}:${hash}`;
  }

  private verifyPassword(password: string, storedHash: string): boolean {
    const [salt, hash] = storedHash.split(":");
    if (!salt || !hash) {
      return false;
    }

    const hashedAttempt = scryptSync(password, salt, 64);
    const hashedStored = Buffer.from(hash, "hex");

    return hashedAttempt.length === hashedStored.length && timingSafeEqual(hashedAttempt, hashedStored);
  }

  private extractAdminSessionToken(input: AdminSessionAccessInput): string | null {
    return extractBearerToken(input.authorization) ?? this.extractCookieToken(input.cookieHeader);
  }

  private extractCookieToken(cookieHeader?: string): string | null {
    if (!cookieHeader) {
      return null;
    }

    const tokenEntry = cookieHeader
      .split(";")
      .map((entry) => entry.trim())
      .find((entry) => entry.startsWith(`${ADMIN_SESSION_COOKIE_NAME}=`));

    if (!tokenEntry) {
      return null;
    }

    const [, token] = tokenEntry.split("=");
    return token?.trim() ? decodeURIComponent(token.trim()) : null;
  }

  private normalizePhone(value?: string): string {
    const normalized = value?.replace(/\D/g, "").trim();
    if (!normalized) {
      throw new BadRequestException("Telefone invalido.");
    }

    return normalized;
  }

  private normalizeEmail(value: string): string {
    const normalized = value.trim().toLowerCase();
    if (!normalized) {
      throw new BadRequestException("E-mail invalido.");
    }

    return normalized;
  }

  private normalizeOptional(value?: string): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private normalizeCpf(value?: string): string | null {
    const normalized = value?.replace(/\D/g, "").trim();
    return normalized ? normalized : null;
  }

  private normalizeOptionalPhone(value?: string): string | null {
    const normalized = value?.replace(/\D/g, "").trim();
    return normalized ? normalized : null;
  }

  private normalizeBirthDate(value: string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException("Data de nascimento invalida.");
    }

    return date;
  }

  private normalizeClientIp(value?: string): string {
    const normalized = value?.split(",")[0]?.trim();
    return normalized || "unknown";
  }
}
