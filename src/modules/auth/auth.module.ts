import { Module } from "@nestjs/common";
import { DriversModule } from "../drivers/drivers.module";
import { AdminAuthGuard } from "./admin-auth.guard";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { RolesGuard } from "./roles.guard";

@Module({
  imports: [DriversModule],
  controllers: [AuthController],
  providers: [AuthService, AdminAuthGuard, RolesGuard],
  exports: [AuthService, AdminAuthGuard, RolesGuard]
})
export class AuthModule {}
