import { UserRole } from "@prisma/client";
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { extractBearerToken, hashSessionToken } from "../auth/auth.service";

type RequestWithDriverSession = {
  headers: {
    authorization?: string;
  };
  params?: {
    driverId?: string;
  };
  driverSession?: {
    driverId: string;
    userId: string;
    sessionId: string;
  };
};

@Injectable()
export class DriverAuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithDriverSession>();
    const token = extractBearerToken(request.headers.authorization);

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

    if (request.params?.driverId && request.params.driverId !== session.user.driver.id) {
      throw new ForbiddenException("Essa sessao nao pode operar em nome de outro motorista.");
    }

    request.driverSession = {
      driverId: session.user.driver.id,
      userId: session.user.id,
      sessionId: session.id
    };

    return true;
  }
}
