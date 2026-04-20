import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { Ride, RideEvent, RideMapPreview } from "../rides/types";
import { DriverAuthGuard } from "./driver-auth.guard";
import { CreateDriverDto } from "./dto/create-driver.dto";
import { CreateVehicleDto } from "./dto/create-vehicle.dto";
import { DriverDecisionDto } from "./dto/driver-decision.dto";
import { DriverEmergencyCancelDayDto } from "./dto/driver-emergency-cancel-day.dto";
import { DriverEmergencyCancelRideDto } from "./dto/driver-emergency-cancel-ride.dto";
import { DriverStartRideDto } from "./dto/driver-start-ride.dto";
import { StartFleetVehicleSessionDto } from "./dto/start-fleet-vehicle-session.dto";
import { UpdateDriverFleetChecklistItemDto } from "./dto/update-driver-fleet-checklist-item.dto";
import { UpdateDriverDto } from "./dto/update-driver.dto";
import { UpdateVehicleDto } from "./dto/update-vehicle.dto";
import { DriversService } from "./drivers.service";
import { DriverFleetVehicleDetails, DriverProfile } from "./types";

@Controller("drivers")
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Post()
  async createDriver(@Body() dto: CreateDriverDto): Promise<DriverProfile> {
    return this.driversService.createDriver(dto);
  }

  @Get()
  async listDrivers(): Promise<DriverProfile[]> {
    return this.driversService.listDrivers();
  }

  @Get("prebooked-rides")
  async listPrebookedRides(): Promise<Ride[]> {
    return this.driversService.listPrebookedRides();
  }

  @Get(":driverId/available-rides")
  @UseGuards(DriverAuthGuard)
  async listAvailableRides(
    @Param("driverId") driverId: string,
    @Query("includeScheduleFit") includeScheduleFit?: string
  ): Promise<Ride[]> {
    return this.driversService.listAvailableRides(driverId, includeScheduleFit !== "false");
  }

  @Get(":driverId/available-rides/:rideId")
  @UseGuards(DriverAuthGuard)
  async getAvailableRide(
    @Param("driverId") driverId: string,
    @Param("rideId") rideId: string,
    @Query("includeScheduleFit") includeScheduleFit?: string
  ): Promise<Ride> {
    return this.driversService.getAvailableRide(driverId, rideId, includeScheduleFit !== "false");
  }

  @Get(":driverId/my-rides")
  @UseGuards(DriverAuthGuard)
  async listMyRides(
    @Param("driverId") driverId: string,
    @Query("includeScheduleFit") includeScheduleFit?: string
  ): Promise<Ride[]> {
    return this.driversService.listMyRides(driverId, includeScheduleFit !== "false");
  }

  @Get(":driverId")
  @UseGuards(DriverAuthGuard)
  async getDriver(@Param("driverId") driverId: string): Promise<DriverProfile> {
    return this.driversService.getDriver(driverId);
  }

  @Patch(":driverId")
  @UseGuards(DriverAuthGuard)
  async updateDriver(
    @Param("driverId") driverId: string,
    @Body() dto: UpdateDriverDto
  ): Promise<DriverProfile> {
    return this.driversService.updateDriver(driverId, dto);
  }

  @Post(":driverId/vehicles")
  @UseGuards(DriverAuthGuard)
  async addVehicle(
    @Param("driverId") driverId: string,
    @Body() dto: CreateVehicleDto
  ): Promise<DriverProfile> {
    return this.driversService.addVehicle(driverId, dto);
  }

  @Patch(":driverId/vehicles/:vehicleId")
  @UseGuards(DriverAuthGuard)
  async updateVehicle(
    @Param("driverId") driverId: string,
    @Param("vehicleId") vehicleId: string,
    @Body() dto: UpdateVehicleDto
  ): Promise<DriverProfile> {
    return this.driversService.updateVehicle(driverId, vehicleId, dto);
  }

  @Get(":driverId/fleet-vehicle")
  @UseGuards(DriverAuthGuard)
  async getCurrentFleetVehicle(@Param("driverId") driverId: string): Promise<DriverFleetVehicleDetails> {
    return this.driversService.getCurrentFleetVehicle(driverId);
  }

  @Post(":driverId/fleet-vehicle-session/start")
  @UseGuards(DriverAuthGuard)
  async startFleetVehicleSession(
    @Param("driverId") driverId: string,
    @Body() dto: StartFleetVehicleSessionDto
  ): Promise<DriverProfile> {
    return this.driversService.startFleetVehicleSession(driverId, dto);
  }

  @Post(":driverId/fleet-vehicle-session/end")
  @UseGuards(DriverAuthGuard)
  async endFleetVehicleSession(@Param("driverId") driverId: string): Promise<DriverProfile> {
    return this.driversService.endFleetVehicleSession(driverId);
  }

  @Post(":driverId/fleet-vehicle/checklist")
  @UseGuards(DriverAuthGuard)
  async updateCurrentFleetVehicleChecklist(
    @Param("driverId") driverId: string,
    @Body() dto: UpdateDriverFleetChecklistItemDto
  ): Promise<DriverFleetVehicleDetails> {
    return this.driversService.updateCurrentFleetVehicleChecklist(driverId, dto.itemKey, dto.isChecked, dto.numericValue);
  }

  @Post(":driverId/rides/:rideId/decision")
  @UseGuards(DriverAuthGuard)
  async decideRide(
    @Param("driverId") driverId: string,
    @Param("rideId") rideId: string,
    @Body() dto: DriverDecisionDto
  ): Promise<Ride> {
    return this.driversService.decideRide(rideId, driverId, dto.decision);
  }

  @Post(":driverId/rides/emergency-cancel-day")
  @UseGuards(DriverAuthGuard)
  async emergencyCancelDayRides(
    @Param("driverId") driverId: string,
    @Body() dto: DriverEmergencyCancelDayDto
  ): Promise<Ride[]> {
    return this.driversService.emergencyCancelDayRides(driverId, dto.dateKey, dto.reason);
  }

  @Post(":driverId/rides/:rideId/emergency-cancel")
  @UseGuards(DriverAuthGuard)
  async emergencyCancelRide(
    @Param("driverId") driverId: string,
    @Param("rideId") rideId: string,
    @Body() dto: DriverEmergencyCancelRideDto
  ): Promise<Ride> {
    return this.driversService.emergencyCancelRide(rideId, driverId, dto.reason);
  }

  @Post(":driverId/rides/:rideId/go-to-pickup")
  @UseGuards(DriverAuthGuard)
  async markDriverEnRoute(@Param("driverId") driverId: string, @Param("rideId") rideId: string): Promise<Ride> {
    return this.driversService.markDriverEnRoute(rideId, driverId);
  }

  @Post(":driverId/rides/:rideId/arrived")
  @UseGuards(DriverAuthGuard)
  async markDriverArrived(@Param("driverId") driverId: string, @Param("rideId") rideId: string): Promise<Ride> {
    return this.driversService.markDriverArrived(rideId, driverId);
  }

  @Post(":driverId/rides/:rideId/start")
  @UseGuards(DriverAuthGuard)
  async startRide(
    @Param("driverId") driverId: string,
    @Param("rideId") rideId: string,
    @Body() dto: DriverStartRideDto
  ): Promise<Ride> {
    return this.driversService.startRide(rideId, driverId, dto.pickupCode);
  }

  @Post(":driverId/rides/:rideId/complete")
  @UseGuards(DriverAuthGuard)
  async completeRide(@Param("driverId") driverId: string, @Param("rideId") rideId: string): Promise<Ride> {
    return this.driversService.completeRide(rideId, driverId);
  }

  @Post(":driverId/rides/:rideId/no-show")
  @UseGuards(DriverAuthGuard)
  async markPassengerNoShow(@Param("driverId") driverId: string, @Param("rideId") rideId: string): Promise<Ride> {
    return this.driversService.markPassengerNoShow(rideId, driverId);
  }

  @Get(":driverId/rides/:rideId/map-preview")
  @UseGuards(DriverAuthGuard)
  async getRideMapPreview(
    @Param("driverId") driverId: string,
    @Param("rideId") rideId: string
  ): Promise<RideMapPreview> {
    return this.driversService.getRideMapPreview(driverId, rideId);
  }

  @Get(":driverId/rides/:rideId/events")
  @UseGuards(DriverAuthGuard)
  async getRideEvents(@Param("driverId") driverId: string, @Param("rideId") rideId: string): Promise<RideEvent[]> {
    return this.driversService.getRideEvents(driverId, rideId);
  }
}
