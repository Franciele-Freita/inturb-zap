import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { CreateQuoteDto } from "./dto/create-quote.dto";
import { PrebookRideDto } from "./dto/prebook-ride.dto";
import { Ride, RideEvent } from "./types";
import { RidesService } from "./rides.service";

@Controller("rides")
export class RidesController {
  constructor(private readonly ridesService: RidesService) {}

  @Post("quote")
  async createQuote(@Body() dto: CreateQuoteDto): Promise<Ride> {
    return this.ridesService.createQuote(dto);
  }

  @Post(":rideId/prebook")
  async prebook(@Param("rideId") rideId: string, @Body() dto: PrebookRideDto): Promise<Ride> {
    return this.ridesService.prebookRide(rideId, dto.customerConfirmed);
  }

  @Get()
  async list(): Promise<Ride[]> {
    return this.ridesService.listAll();
  }

  @Get(":rideId/events")
  async listEvents(@Param("rideId") rideId: string): Promise<RideEvent[]> {
    return this.ridesService.listEvents(rideId);
  }

  @Get(":rideId")
  async getById(@Param("rideId") rideId: string): Promise<Ride> {
    return this.ridesService.getById(rideId);
  }
}
