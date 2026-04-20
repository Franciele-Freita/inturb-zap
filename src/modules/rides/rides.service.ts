import { DriverDecisionType, Prisma, RideStatus as PrismaRideStatus } from "@prisma/client";
import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { MapsService } from "../maps/maps.service";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { PricingService } from "../pricing/pricing.service";
import { CreateQuoteDto } from "./dto/create-quote.dto";
import {
  DriverDecision,
  DriverEmergencyCancellationReason,
  RideExecutionAlert,
  DriverRideStage,
  PREBOOK_DECISION_WINDOW_MINUTES,
  Ride,
  RideDecisionWindow,
  RideEvent,
  RideScheduleFit,
  RideScheduleFitStatus,
  RideStatus
} from "./types";

const DRIVER_SCHEDULE_MARGIN_MINUTES = 15;
const DRIVER_SCHEDULE_OK_BUFFER_MINUTES = 15;
const DRIVER_SCHEDULE_TIGHT_BUFFER_MINUTES = 1;
const DRIVER_SCHEDULE_SUGGESTION_OFFSETS_MINUTES = [-30, 30, -15, 15, -45, 45, -60, 60] as const;
const DRIVER_SCHEDULE_MAX_SUGGESTIONS = 3;
const DRIVER_LATE_PICKUP_MINUTES = 15;
const DRIVER_WAITING_PASSENGER_GRACE_MINUTES = 5;
const DRIVER_OVERDUE_COMPLETION_BUFFER_MINUTES = 30;
const DRIVER_EMERGENCY_CANCELLATION_ALLOWED_STAGES: Array<DriverRideStage | null> = [
  null,
  "SCHEDULED",
  "EN_ROUTE_PICKUP",
  "ARRIVED"
];
const PICKUP_CODE_LENGTH = 4;

@Injectable()
export class RidesService {
  private readonly scheduleTransferCache = new Map<
    string,
    { durationMinutes: number; distanceKm: number; expiresAt: number }
  >();

  constructor(
    private readonly prisma: PrismaService,
    private readonly mapsService: MapsService,
    private readonly pricingService: PricingService,
    private readonly notificationsService: NotificationsService
  ) {}

  async createQuote(input: CreateQuoteDto): Promise<Ride> {
    const scheduledAt = new Date(input.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) {
      throw new BadRequestException("Invalid scheduledAt date.");
    }

    const route = await this.mapsService.estimateRoute(input.origin, input.destination, scheduledAt);
    const tripType = input.tripTypeSlug
      ? await this.prisma.tripType.findUnique({
          where: { slug: input.tripTypeSlug.trim() }
        })
      : null;
    if (input.tripTypeSlug && (!tripType || !tripType.isActive)) {
      throw new BadRequestException("Tipo de viagem invalido ou indisponivel.");
    }

    const tripTypeSurcharge = tripType ? Number(tripType.surchargeAmount) : 0;
    const price = await this.pricingService.calculate(
      route.distanceKm,
      route.durationMinutes,
      tripTypeSurcharge,
      scheduledAt
    );
    const normalizedCustomerName = input.customerName.trim();
    const normalizedCustomerPhone = input.customerPhone?.trim() ?? "unknown";
    const normalizedBaggageCount = input.baggageCount ?? null;
    const normalizedBaggageSize = input.baggageSize?.trim() || null;
    const normalizedPetType = input.petType?.trim() || null;
    const normalizedPetSize = input.petSize?.trim() || null;
    const normalizedCustomerHasReducedMobility = input.customerHasReducedMobility ?? null;
    const normalizedPassengerCount = input.passengerCount ?? 1;
    const normalizedCompanionNeedsSpecialAttention = input.companionNeedsSpecialAttention ?? false;
    const normalizedCompanionSpecialAttentionDetails =
      normalizedCompanionNeedsSpecialAttention && input.companionSpecialAttentionDetails?.trim()
        ? input.companionSpecialAttentionDetails.trim()
        : null;
    const normalizedHasIntermediateStops = input.hasIntermediateStops ?? false;
    const normalizedIntermediateStopsSummary =
      normalizedHasIntermediateStops && input.intermediateStopsSummary?.trim()
        ? input.intermediateStopsSummary.trim()
        : null;
    const normalizedOrigin = route.originLabel ?? input.origin.trim();
    const normalizedDestination = route.destinationLabel ?? input.destination.trim();

    const persistedRide = await this.prisma.$transaction(async (tx) => {
      if (normalizedCustomerPhone !== "unknown") {
        await tx.customer.upsert({
          where: { phone: normalizedCustomerPhone },
          update: { name: normalizedCustomerName },
          create: {
            phone: normalizedCustomerPhone,
            name: normalizedCustomerName
          }
        });
      }

      const ride = await tx.ride.create({
        data: {
          customerName: normalizedCustomerName,
          customerPhone: normalizedCustomerPhone,
          tripTypeSlug: tripType?.slug ?? null,
          tripTypeName: tripType?.name ?? null,
          tripTypeSurchargeAmount: tripTypeSurcharge || null,
          baggageCount: normalizedBaggageCount,
          baggageSize: normalizedBaggageSize,
          petType: normalizedPetType,
          petSize: normalizedPetSize,
          customerHasReducedMobility: normalizedCustomerHasReducedMobility,
          passengerCount: normalizedPassengerCount,
          companionNeedsSpecialAttention: normalizedCompanionNeedsSpecialAttention,
          companionSpecialAttentionDetails: normalizedCompanionSpecialAttentionDetails,
          hasIntermediateStops: normalizedHasIntermediateStops,
          intermediateStopsSummary: normalizedIntermediateStopsSummary,
          origin: normalizedOrigin,
          destination: normalizedDestination,
          scheduledAt,
          status: PrismaRideStatus.QUOTED,
          quoteAmount: price.total,
          quoteCurrency: price.currency,
          routeDistanceKm: route.distanceKm,
          routeDurationMin: route.durationMinutes
        }
      });

      await tx.quote.create({
        data: {
          rideId: ride.id,
          amount: price.total,
          currency: price.currency,
          routeDistanceKm: route.distanceKm,
          routeDurationMin: route.durationMinutes
        }
      });

      await tx.rideEvent.create({
        data: {
          rideId: ride.id,
          eventType: "RIDE_QUOTED",
          payload: {
            customerName: normalizedCustomerName,
            customerPhone: normalizedCustomerPhone,
            tripTypeSlug: tripType?.slug ?? null,
            tripTypeName: tripType?.name ?? null,
            tripTypeSurchargeAmount: tripTypeSurcharge,
            baggageCount: normalizedBaggageCount,
            baggageSize: normalizedBaggageSize,
            petType: normalizedPetType,
            petSize: normalizedPetSize,
            customerHasReducedMobility: normalizedCustomerHasReducedMobility,
            passengerCount: normalizedPassengerCount,
            companionNeedsSpecialAttention: normalizedCompanionNeedsSpecialAttention,
            companionSpecialAttentionDetails: normalizedCompanionSpecialAttentionDetails,
            hasIntermediateStops: normalizedHasIntermediateStops,
            intermediateStopsSummary: normalizedIntermediateStopsSummary,
            origin: normalizedOrigin,
            destination: normalizedDestination,
            amount: price.total,
            currency: price.currency,
            pricingRuleFare: price.pricingRuleFare,
            appliedPricingRule: price.appliedPricingRule,
            routeDistanceKm: route.distanceKm,
            routeDurationMinutes: route.durationMinutes,
            routeProvider: route.provider
          }
        }
      });

      return tx.ride.findUniqueOrThrow({
        where: { id: ride.id },
        include: {
          quotes: {
            orderBy: { createdAt: "desc" },
            take: 1
          }
        }
      });
    });

    return this.toRideResponse(persistedRide);
  }

  async prebookRide(rideId: string, customerConfirmed: boolean): Promise<Ride> {
    if (!customerConfirmed) {
      throw new BadRequestException("Customer confirmation is required to prebook.");
    }

    const ride = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.ride.findUnique({ where: { id: rideId } });
      if (!existing) {
        throw new NotFoundException(`Ride ${rideId} not found.`);
      }
      if (existing.status !== PrismaRideStatus.QUOTED) {
        throw new ConflictException("Only quoted rides can be prebooked.");
      }

      await tx.ride.update({
        where: { id: rideId },
        data: { status: PrismaRideStatus.PREBOOKED }
      });

      await tx.rideEvent.create({
        data: {
          rideId,
          eventType: "RIDE_PREBOOKED",
          payload: { customerConfirmed: true }
        }
      });

      return tx.ride.findUniqueOrThrow({
        where: { id: rideId },
        include: {
          quotes: {
            orderBy: { createdAt: "desc" },
            take: 1
          }
        }
      });
    });

    void this.notificationsService.notifyNewPrebookedRide(rideId);
    return this.toRideResponse(ride);
  }

  async decideRide(rideId: string, driverId: string, decision: DriverDecision): Promise<Ride> {
    const ride = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.ride.findUnique({
        where: { id: rideId },
        include: {
          quotes: {
            orderBy: { createdAt: "desc" },
            take: 1
          }
        }
      });
      if (!existing) {
        throw new NotFoundException(`Ride ${rideId} not found.`);
      }
      if (existing.status === PrismaRideStatus.PREBOOKED && this.isDecisionWindowExpired(existing.updatedAt)) {
        await tx.ride.update({
          where: { id: rideId },
          data: { status: PrismaRideStatus.EXPIRED }
        });
        await tx.rideEvent.create({
          data: {
            rideId,
            eventType: "RIDE_EXPIRED",
            payload: { reason: "DECISION_WINDOW_ELAPSED" }
          }
        });
        throw new ConflictException("Ride decision window has expired.");
      }
      if (existing.status !== PrismaRideStatus.PREBOOKED) {
        throw new ConflictException("Ride is not available for decision.");
      }

      const nextStatus = decision === "ACCEPT" ? PrismaRideStatus.ACCEPTED : PrismaRideStatus.REJECTED;
      const driver = await tx.driver.findUnique({ where: { id: driverId } });
      if (!driver) {
        throw new NotFoundException(`Driver ${driverId} not found.`);
      }

      if (decision === "ACCEPT") {
        const candidateRide = this.toRideResponse(existing);
        const activeRides = await this.loadActiveDriverRides(driverId, candidateRide.id);
        const candidateFit = await this.assessCandidateRideAgainstExistingRides(candidateRide, activeRides);

        if (candidateFit?.status === "CONFLICT" || candidateFit?.status === "FLEXIBLE") {
          throw new ConflictException(
            candidateFit.status === "FLEXIBLE"
              ? "Horario atual nao encaixa na agenda. Negocie um dos horarios sugeridos com o cliente antes de aceitar."
              : `Corrida inviavel para a agenda atual: ${candidateFit.label.toLowerCase()} com margem de ${candidateFit.bufferMinutes} min.`
          );
        }
      }

      await tx.ride.update({
        where: { id: rideId },
        data: {
          status: nextStatus,
          assignedDriverId: decision === "ACCEPT" ? driverId : null,
          driverStage: decision === "ACCEPT" ? "SCHEDULED" : null,
          pickupCode: decision === "ACCEPT" ? this.generatePickupCode() : null,
          pickupCodeVerifiedAt: null,
          navigationStartedAt: null,
          arrivedAt: null,
          startedAt: null,
          completedAt: null
        }
      });

      await tx.rideEvent.create({
        data: {
          rideId,
          eventType: "DRIVER_DECISION",
          payload: { driverId, decision }
        }
      });

      return tx.ride.findUniqueOrThrow({
        where: { id: rideId },
        include: {
          quotes: {
            orderBy: { createdAt: "desc" },
            take: 1
          }
        }
      });
    });

    await this.prisma.driverRideDecision
      .create({
        data: {
          rideId,
          driverId,
          decision: decision === "ACCEPT" ? DriverDecisionType.ACCEPT : DriverDecisionType.REJECT
        }
      })
      .catch(() => null);

    void this.notificationsService.notifyRideDecision(rideId, decision, driverId);
    return this.toRideResponse(ride);
  }

  async markDriverEnRoute(rideId: string, driverId: string): Promise<Ride> {
    return this.updateDriverStage({
      rideId,
      driverId,
      allowedStages: ["SCHEDULED"],
      nextStage: "EN_ROUTE_PICKUP",
      eventType: "DRIVER_EN_ROUTE_PICKUP",
      nextTimestamps: {
        navigationStartedAt: new Date()
      }
    });
  }

  async markDriverArrived(rideId: string, driverId: string): Promise<Ride> {
    return this.updateDriverStage({
      rideId,
      driverId,
      allowedStages: ["SCHEDULED", "EN_ROUTE_PICKUP"],
      nextStage: "ARRIVED",
      eventType: "DRIVER_ARRIVED_PICKUP",
      nextTimestamps: {
        navigationStartedAt: undefined,
        arrivedAt: new Date()
      }
    });
  }

  async startRide(rideId: string, driverId: string, pickupCode: string): Promise<Ride> {
    const normalizedPickupCode = pickupCode.trim();

    const ride = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.ride.findUnique({
        where: { id: rideId },
        include: {
          quotes: {
            orderBy: { createdAt: "desc" },
            take: 1
          }
        }
      });

      if (!existing) {
        throw new NotFoundException(`Ride ${rideId} not found.`);
      }

      if (existing.status !== PrismaRideStatus.ACCEPTED) {
        throw new ConflictException("Ride is not active for driver execution.");
      }

      if (existing.assignedDriverId !== driverId) {
        throw new ConflictException("Ride is assigned to another driver.");
      }

      const currentStage = (existing.driverStage as DriverRideStage | null) ?? "SCHEDULED";
      if (currentStage !== "ARRIVED") {
        throw new ConflictException(`Ride stage ${currentStage} cannot transition to IN_PROGRESS.`);
      }

      if (!existing.pickupCode || normalizedPickupCode !== existing.pickupCode) {
        throw new ConflictException("Codigo de embarque invalido.");
      }

      const updatedRide = await tx.ride.update({
        where: { id: rideId },
        data: {
          driverStage: "IN_PROGRESS",
          startedAt: new Date(),
          pickupCodeVerifiedAt: new Date()
        },
        include: {
          quotes: {
            orderBy: { createdAt: "desc" },
            take: 1
          }
        }
      });

      await tx.rideEvent.create({
        data: {
          rideId,
          eventType: "RIDE_STARTED",
          payload: {
            driverId,
            stage: "IN_PROGRESS",
            pickupCodeVerified: true
          }
        }
      });

      return updatedRide;
    });

    return this.toRideResponse(ride);
  }

  async completeRide(rideId: string, driverId: string): Promise<Ride> {
    return this.updateDriverStage({
      rideId,
      driverId,
      allowedStages: ["IN_PROGRESS"],
      nextStage: "COMPLETED",
      eventType: "RIDE_COMPLETED",
      nextTimestamps: {
        completedAt: new Date()
      }
    });
  }

  async markPassengerNoShow(rideId: string, driverId: string): Promise<Ride> {
    const ride = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.ride.findUnique({
        where: { id: rideId },
        include: {
          quotes: {
            orderBy: { createdAt: "desc" },
            take: 1
          }
        }
      });

      if (!existing) {
        throw new NotFoundException(`Ride ${rideId} not found.`);
      }

      if (existing.status !== PrismaRideStatus.ACCEPTED) {
        throw new ConflictException("Ride is not active for driver execution.");
      }

      if (existing.assignedDriverId !== driverId) {
        throw new ConflictException("Ride is assigned to another driver.");
      }

      const currentStage = (existing.driverStage as DriverRideStage | null) ?? "SCHEDULED";
      if (currentStage !== "ARRIVED") {
        throw new ConflictException("Passageiro ausente so pode ser registrado apos a chegada ao embarque.");
      }

      if (!existing.arrivedAt) {
        throw new ConflictException("A chegada ao embarque ainda nao foi registrada.");
      }

      const noShowThresholdMs =
        existing.arrivedAt.getTime() + DRIVER_WAITING_PASSENGER_GRACE_MINUTES * 60_000;

      if (Date.now() < noShowThresholdMs) {
        throw new ConflictException("Aguarde 5 minutos no embarque antes de registrar passageiro ausente.");
      }

      const updatedRide = await tx.ride.update({
        where: { id: rideId },
        data: {
          status: PrismaRideStatus.CANCELLED,
          driverStage: "COMPLETED",
          completedAt: new Date()
        },
        include: {
          quotes: {
            orderBy: { createdAt: "desc" },
            take: 1
          }
        }
      });

      await tx.rideEvent.create({
        data: {
          rideId,
          eventType: "RIDE_NO_SHOW",
          payload: {
            driverId,
            stage: "ARRIVED"
          }
        }
      });

      return updatedRide;
    });

    return this.toRideResponse(ride);
  }

  async emergencyCancelAssignedRide(
    rideId: string,
    driverId: string,
    reason: DriverEmergencyCancellationReason
  ): Promise<Ride> {
    const [updatedRide] = await this.releaseAssignedRidesForEmergency(driverId, {
      rideId,
      reason,
      scope: "SINGLE"
    });

    if (!updatedRide) {
      throw new NotFoundException(`Ride ${rideId} not found for driver ${driverId}.`);
    }

    return updatedRide;
  }

  async emergencyCancelAssignedRidesByDate(
    driverId: string,
    dateKey: string,
    reason: DriverEmergencyCancellationReason
  ): Promise<Ride[]> {
    return this.releaseAssignedRidesForEmergency(driverId, {
      dateKey,
      reason,
      scope: "DAY"
    });
  }

  async listAll(): Promise<Ride[]> {
    await this.expireStalePrebookedRides();

    const rides = await this.prisma.ride.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        quotes: {
          orderBy: { createdAt: "desc" },
          take: 1
        }
      }
    });

    return rides.map((ride) => this.toRideResponse(ride));
  }

  async listPrebooked(): Promise<Ride[]> {
    await this.expireStalePrebookedRides();

    const rides = await this.prisma.ride.findMany({
      where: { status: PrismaRideStatus.PREBOOKED },
      orderBy: { createdAt: "desc" },
      include: {
        quotes: {
          orderBy: { createdAt: "desc" },
          take: 1
        }
      }
    });

    return rides.map((ride) => this.toRideResponse(ride));
  }

  async getById(rideId: string): Promise<Ride> {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      include: {
        quotes: {
          orderBy: { createdAt: "desc" },
          take: 1
        }
      }
    });
    if (!ride) {
      throw new NotFoundException(`Ride ${rideId} not found.`);
    }

    return this.toRideResponse(ride);
  }

  async getMetrics(): Promise<Record<RideStatus, number>> {
    const metrics: Record<RideStatus, number> = {
      NEW: 0,
      QUOTED: 0,
      PREBOOKED: 0,
      ACCEPTED: 0,
      COMPLETED: 0,
      REJECTED: 0,
      EXPIRED: 0,
      CANCELLED: 0
    };

    const grouped = await this.prisma.ride.groupBy({
      by: ["status"],
      _count: { _all: true }
    });

    for (const group of grouped) {
      metrics[group.status as RideStatus] = group._count._all;
    }

    return metrics;
  }

  async expireStalePrebookedRides(): Promise<void> {
    const cutoff = new Date(Date.now() - PREBOOK_DECISION_WINDOW_MINUTES * 60_000);
    const staleRides = await this.prisma.ride.findMany({
      where: {
        status: PrismaRideStatus.PREBOOKED,
        updatedAt: { lt: cutoff }
      },
      select: { id: true }
    });

    if (staleRides.length === 0) {
      return;
    }

    const rideIds = staleRides.map((ride) => ride.id);
    await this.prisma.$transaction(async (tx) => {
      await tx.ride.updateMany({
        where: {
          id: { in: rideIds },
          status: PrismaRideStatus.PREBOOKED
        },
        data: { status: PrismaRideStatus.EXPIRED }
      });

      await tx.rideEvent.createMany({
        data: rideIds.map((rideId) => ({
          rideId,
          eventType: "RIDE_EXPIRED",
          payload: { reason: "DECISION_WINDOW_ELAPSED" }
        }))
      });
    });
  }

  async listEvents(rideId: string): Promise<RideEvent[]> {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      select: { id: true }
    });
    if (!ride) {
      throw new NotFoundException(`Ride ${rideId} not found.`);
    }

    const events = await this.prisma.rideEvent.findMany({
      where: { rideId },
      orderBy: { createdAt: "asc" }
    });

    return events.map((event) => ({
      id: event.id,
      rideId: event.rideId,
      eventType: event.eventType,
      payload: this.toEventPayload(event.payload),
      createdAt: event.createdAt.toISOString()
    }));
  }

  async annotateScheduleFitsForAssignedRides(rides: Ride[]): Promise<Ride[]> {
    if (rides.length <= 1) {
      return rides;
    }

    const annotated = await Promise.all(
      rides.map(async (ride, index) => {
        const nextRide = rides[index + 1];
        if (!nextRide) {
          return ride;
        }

        const scheduleFit = await this.buildSequentialScheduleFit(ride, nextRide);
        return {
          ...ride,
          scheduleFit
        };
      })
    );

    return annotated;
  }

  async annotateScheduleFitsForAvailableRides(driverId: string, rides: Ride[]): Promise<Ride[]> {
    if (rides.length === 0) {
      return rides;
    }

    const activeRides = await this.loadActiveDriverRides(driverId);

    return Promise.all(
      rides.map(async (ride) => ({
        ...ride,
        scheduleFit: await this.assessCandidateRideAgainstExistingRides(ride, activeRides)
      }))
    );
  }

  toRideResponse(
    ride: Prisma.RideGetPayload<{
      include: {
        quotes: true;
      };
    }>
  ): Ride {
    const latestQuote = ride.quotes[0];
    const fallbackQuoteAvailable =
      ride.quoteAmount !== null &&
      ride.quoteCurrency !== null &&
      ride.routeDistanceKm !== null &&
      ride.routeDurationMin !== null;

    const quote = latestQuote
      ? {
          amount: Number(latestQuote.amount),
          currency: latestQuote.currency,
          routeDistanceKm: Number(latestQuote.routeDistanceKm),
          routeDurationMinutes: latestQuote.routeDurationMin,
          quotedAt: latestQuote.createdAt.toISOString()
        }
      : fallbackQuoteAvailable
        ? {
            amount: Number(ride.quoteAmount),
            currency: ride.quoteCurrency!,
            routeDistanceKm: Number(ride.routeDistanceKm),
            routeDurationMinutes: ride.routeDurationMin!,
            quotedAt: ride.updatedAt.toISOString()
          }
        : undefined;

    return {
      id: ride.id,
      customerName: ride.customerName,
      tripTypeSlug: ride.tripTypeSlug ?? undefined,
      tripTypeName: ride.tripTypeName ?? undefined,
      tripTypeSurchargeAmount:
        ride.tripTypeSurchargeAmount !== null && ride.tripTypeSurchargeAmount !== undefined
          ? Number(ride.tripTypeSurchargeAmount)
          : undefined,
      baggageCount: ride.baggageCount ?? undefined,
      baggageSize: ride.baggageSize ?? undefined,
      petType: ride.petType ?? undefined,
      petSize: ride.petSize ?? undefined,
      customerHasReducedMobility: ride.customerHasReducedMobility ?? undefined,
      passengerCount: ride.passengerCount ?? undefined,
      companionNeedsSpecialAttention: ride.companionNeedsSpecialAttention ?? undefined,
      companionSpecialAttentionDetails: ride.companionSpecialAttentionDetails ?? undefined,
      hasIntermediateStops: ride.hasIntermediateStops ?? undefined,
      intermediateStopsSummary: ride.intermediateStopsSummary ?? undefined,
      origin: ride.origin,
      destination: ride.destination,
      scheduledAt: ride.scheduledAt.toISOString(),
      status: ride.status as RideStatus,
      createdAt: ride.createdAt.toISOString(),
      updatedAt: ride.updatedAt.toISOString(),
      customerPhone: ride.customerPhone,
      assignedDriverId: ride.assignedDriverId ?? undefined,
      driverStage: ride.driverStage ?? undefined,
      pickupCode: ride.pickupCode ?? undefined,
      pickupCodeVerifiedAt: ride.pickupCodeVerifiedAt?.toISOString(),
      navigationStartedAt: ride.navigationStartedAt?.toISOString(),
      arrivedAt: ride.arrivedAt?.toISOString(),
      startedAt: ride.startedAt?.toISOString(),
      completedAt: ride.completedAt?.toISOString(),
      quote,
      decisionWindow: this.getDecisionWindow(ride.status as RideStatus, ride.updatedAt),
      executionAlert: this.getExecutionAlert(ride)
    };
  }

  getDecisionWindow(status: RideStatus, updatedAt: Date): RideDecisionWindow | undefined {
    if (status !== "PREBOOKED") {
      return undefined;
    }

    const startedAt = updatedAt;
    const expiresAt = new Date(startedAt.getTime() + PREBOOK_DECISION_WINDOW_MINUTES * 60_000);

    return {
      startedAt: startedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      expiresInSeconds: Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000)),
      totalSeconds: PREBOOK_DECISION_WINDOW_MINUTES * 60
    };
  }

  private getExecutionAlert(
    ride: {
      status: PrismaRideStatus;
      driverStage: DriverRideStage | null;
      scheduledAt: Date;
      arrivedAt: Date | null;
      startedAt: Date | null;
      routeDurationMin: number | null;
      completedAt: Date | null;
    }
  ): RideExecutionAlert | undefined {
    if (ride.status !== PrismaRideStatus.ACCEPTED || ride.driverStage === "COMPLETED" || ride.completedAt) {
      return undefined;
    }

    const nowMs = Date.now();
    const stage = ride.driverStage ?? "SCHEDULED";

    if (
      (stage === "SCHEDULED" || stage === "EN_ROUTE_PICKUP") &&
      nowMs >= ride.scheduledAt.getTime() + DRIVER_LATE_PICKUP_MINUTES * 60_000
    ) {
      return {
        code: "LATE_PICKUP",
        label: "Em atraso",
        description: "O horario do embarque ja passou e a corrida ainda nao avancou para o embarque.",
        tone: "warning"
      };
    }

    if (
      stage === "ARRIVED" &&
      ride.arrivedAt &&
      nowMs >= ride.arrivedAt.getTime() + DRIVER_WAITING_PASSENGER_GRACE_MINUTES * 60_000
    ) {
      return {
        code: "WAITING_PASSENGER",
        label: "Passageiro nao embarcou",
        description: "O motorista ja confirmou chegada e o embarque ainda nao foi iniciado.",
        tone: "critical"
      };
    }

    if (stage === "IN_PROGRESS" && ride.startedAt && ride.routeDurationMin !== null) {
      const overdueThresholdMs =
        ride.startedAt.getTime() + (ride.routeDurationMin + DRIVER_OVERDUE_COMPLETION_BUFFER_MINUTES) * 60_000;
      if (nowMs >= overdueThresholdMs) {
        return {
          code: "OVERDUE_COMPLETION",
          label: "Encerramento pendente",
          description: "A corrida passou da duracao prevista e precisa ser revisada antes do encerramento.",
          tone: "warning"
        };
      }
    }

    return undefined;
  }

  private toEventPayload(payload: Prisma.JsonValue | null | undefined): Record<string, unknown> | undefined {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return undefined;
    }

    return payload as Record<string, unknown>;
  }

  private isDecisionWindowExpired(updatedAt: Date): boolean {
    return Date.now() >= updatedAt.getTime() + PREBOOK_DECISION_WINDOW_MINUTES * 60_000;
  }

  private generatePickupCode(): string {
    return String(Math.floor(Math.random() * 10 ** PICKUP_CODE_LENGTH)).padStart(PICKUP_CODE_LENGTH, "0");
  }

  private async releaseAssignedRidesForEmergency(
    driverId: string,
    input:
      | {
          rideId: string;
          reason: DriverEmergencyCancellationReason;
          scope: "SINGLE";
        }
      | {
          dateKey: string;
          reason: DriverEmergencyCancellationReason;
          scope: "DAY";
        }
  ): Promise<Ride[]> {
    const rides = await this.findEmergencyCancelableAssignedRides(driverId, input);
    if (rides.length === 0) {
      throw new BadRequestException(
        input.scope === "DAY"
          ? "Nenhuma corrida elegivel para cancelamento emergencial nesse dia."
          : "Essa corrida nao pode mais entrar em cancelamento emergencial."
      );
    }

    const updatedRides = await this.prisma.$transaction(async (tx) =>
      Promise.all(
        rides.map(async (ride) => {
          await tx.ride.update({
            where: { id: ride.id },
            data: {
              status: PrismaRideStatus.PREBOOKED,
              assignedDriverId: null,
              driverStage: null,
              pickupCode: null,
              pickupCodeVerifiedAt: null,
              navigationStartedAt: null,
              arrivedAt: null,
              startedAt: null,
              completedAt: null
            }
          });

          await tx.rideEvent.create({
            data: {
              rideId: ride.id,
              eventType: "DRIVER_EMERGENCY_CANCELLATION",
              payload: {
                driverId,
                reason: input.reason,
                scope: input.scope,
                dateKey: input.scope === "DAY" ? input.dateKey : undefined
              }
            }
          });

          return tx.ride.findUniqueOrThrow({
            where: { id: ride.id },
            include: {
              quotes: {
                orderBy: { createdAt: "desc" },
                take: 1
              }
            }
          });
        })
      )
    );

    updatedRides.forEach((ride) => {
      void this.notificationsService.notifyNewPrebookedRide(ride.id);
    });

    return updatedRides.map((ride) => this.toRideResponse(ride));
  }

  private async findEmergencyCancelableAssignedRides(
    driverId: string,
    input:
      | {
          rideId: string;
          reason: DriverEmergencyCancellationReason;
          scope: "SINGLE";
        }
      | {
          dateKey: string;
          reason: DriverEmergencyCancellationReason;
          scope: "DAY";
        }
  ) {
    const where =
      input.scope === "SINGLE"
        ? {
            id: input.rideId
          }
        : {
            scheduledAt: this.buildLocalDateRange(input.dateKey)
          };

    return this.prisma.ride.findMany({
      where: {
        assignedDriverId: driverId,
        status: PrismaRideStatus.ACCEPTED,
        OR: [
          { driverStage: null },
          {
            driverStage: {
              in: DRIVER_EMERGENCY_CANCELLATION_ALLOWED_STAGES.filter(
                (stage): stage is Exclude<(typeof DRIVER_EMERGENCY_CANCELLATION_ALLOWED_STAGES)[number], null> => stage !== null
              )
            }
          }
        ],
        ...where
      },
      orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }],
      include: {
        quotes: {
          orderBy: { createdAt: "desc" },
          take: 1
        }
      }
    });
  }

  private buildLocalDateRange(dateKey: string): { gte: Date; lt: Date } {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
      throw new BadRequestException("Data invalida para cancelamento emergencial.");
    }

    const [year, month, day] = dateKey.split("-").map(Number);
    const start = new Date(year, (month ?? 1) - 1, day ?? 1);
    const end = new Date(year, (month ?? 1) - 1, (day ?? 1) + 1);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException("Data invalida para cancelamento emergencial.");
    }

    return { gte: start, lt: end };
  }

  private async loadActiveDriverRides(driverId: string, excludeRideId?: string): Promise<Ride[]> {
    const existingRides = await this.prisma.ride.findMany({
      where: {
        assignedDriverId: driverId,
        status: PrismaRideStatus.ACCEPTED,
        OR: [{ driverStage: null }, { driverStage: { not: "COMPLETED" } }],
        ...(excludeRideId ? { id: { not: excludeRideId } } : {})
      },
      orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }],
      include: {
        quotes: {
          orderBy: { createdAt: "desc" },
          take: 1
        }
      }
    });

    return existingRides.map((ride) => this.toRideResponse(ride));
  }

  private async assessCandidateRideAgainstExistingRides(
    candidateRide: Ride,
    activeRides: Ride[]
  ): Promise<RideScheduleFit | undefined> {
    if (activeRides.length === 0) {
      return undefined;
    }

    const candidateStartMs = this.getRideStartMs(candidateRide);
    const candidateEndMs = this.getRideEndMs(candidateRide);
    let worstFit: RideScheduleFit | undefined;

    for (const scheduledRide of activeRides) {
      const scheduledStartMs = this.getRideStartMs(scheduledRide);
      const scheduledEndMs = this.getRideEndMs(scheduledRide);

      if (candidateStartMs >= scheduledStartMs) {
        const fit = await this.buildScheduleFitBetweenRides(
          scheduledRide,
          candidateRide,
          candidateStartMs - scheduledEndMs
        );
        worstFit = this.pickWorseScheduleFit(worstFit, fit);
      } else if (candidateEndMs <= scheduledStartMs) {
        const fit = await this.buildScheduleFitBetweenRides(
          candidateRide,
          scheduledRide,
          scheduledStartMs - candidateEndMs
        );
        worstFit = this.pickWorseScheduleFit(worstFit, fit);
      } else {
        const overlapWindowMinutes = Math.round((scheduledStartMs - candidateEndMs) / 60_000);
        const overlapFit = this.toScheduleFit(
          overlapWindowMinutes,
          0,
          scheduledRide.id
        );
        worstFit = this.pickWorseScheduleFit(worstFit, overlapFit);
      }
    }

    if (worstFit?.status === "CONFLICT") {
      const alternativeOptions = await this.findAlternativeOptions(candidateRide, activeRides);
      if (alternativeOptions.length > 0) {
        return {
          ...worstFit,
          status: "FLEXIBLE",
          label: "Encaixa com ajuste",
          alternativeOptions
        };
      }
    }

    return worstFit;
  }

  private async buildSequentialScheduleFit(currentRide: Ride, nextRide: Ride): Promise<RideScheduleFit> {
    const currentEndMs = this.getRideEndMs(currentRide);
    const nextStartMs = this.getRideStartMs(nextRide);
    return this.buildScheduleFitBetweenRides(currentRide, nextRide, nextStartMs - currentEndMs);
  }

  private async buildScheduleFitBetweenRides(fromRide: Ride, toRide: Ride, windowMs: number): Promise<RideScheduleFit> {
    const windowMinutes = Math.round(windowMs / 60_000);
    const transferDepartureTime = new Date(this.getRideEndMs(fromRide));

    if (windowMinutes <= 0) {
      return this.toScheduleFit(windowMinutes, 0, toRide.id);
    }

    const transferRoute = await this.getTransferEstimate(
      fromRide.destination,
      toRide.origin,
      transferDepartureTime
    );
    return this.toScheduleFit(windowMinutes, transferRoute.durationMinutes, toRide.id);
  }

  private toScheduleFit(
    windowMinutes: number,
    transferMinutes: number,
    referenceRideId?: string
  ): RideScheduleFit {
    const bufferMinutes = windowMinutes - transferMinutes - DRIVER_SCHEDULE_MARGIN_MINUTES;
    let status: RideScheduleFitStatus;
    let label: string;

    if (bufferMinutes >= DRIVER_SCHEDULE_OK_BUFFER_MINUTES) {
      status = "OK";
      label = "Folga boa";
    } else if (bufferMinutes >= DRIVER_SCHEDULE_TIGHT_BUFFER_MINUTES) {
      status = "TIGHT";
      label = "Agenda apertada";
    } else {
      status = "CONFLICT";
      label = "Conflito de horario";
    }

    return {
      status,
      label,
      windowMinutes,
      transferMinutes,
      bufferMinutes,
      marginMinutes: DRIVER_SCHEDULE_MARGIN_MINUTES,
      referenceRideId
    };
  }

  private async findAlternativeOptions(
    candidateRide: Ride,
    activeRides: Ride[]
  ): Promise<Array<{ scheduledAt: string; deltaMinutes: number; label: string }>> {
    const suggestions: Array<{ scheduledAt: string; deltaMinutes: number; label: string }> = [];

    for (const deltaMinutes of DRIVER_SCHEDULE_SUGGESTION_OFFSETS_MINUTES) {
      const shiftedRide = this.shiftRideSchedule(candidateRide, deltaMinutes);
      const shiftedFit = await this.assessCandidateRideAgainstExistingRidesWithoutSuggestions(shiftedRide, activeRides);

      if (!shiftedFit || shiftedFit.status === "OK" || shiftedFit.status === "TIGHT") {
        suggestions.push({
          scheduledAt: shiftedRide.scheduledAt,
          deltaMinutes,
          label: this.buildAlternativeOptionLabel(shiftedRide.scheduledAt, deltaMinutes)
        });
      }
    }

    const uniqueSuggestions = suggestions.filter(
      (suggestion, index, items) => items.findIndex((item) => item.scheduledAt === suggestion.scheduledAt) === index
    );

    return uniqueSuggestions.slice(0, DRIVER_SCHEDULE_MAX_SUGGESTIONS);
  }

  private async assessCandidateRideAgainstExistingRidesWithoutSuggestions(
    candidateRide: Ride,
    activeRides: Ride[]
  ): Promise<RideScheduleFit | undefined> {
    if (activeRides.length === 0) {
      return undefined;
    }

    const candidateStartMs = this.getRideStartMs(candidateRide);
    const candidateEndMs = this.getRideEndMs(candidateRide);
    let worstFit: RideScheduleFit | undefined;

    for (const scheduledRide of activeRides) {
      const scheduledStartMs = this.getRideStartMs(scheduledRide);
      const scheduledEndMs = this.getRideEndMs(scheduledRide);

      if (candidateStartMs >= scheduledStartMs) {
        const fit = await this.buildScheduleFitBetweenRides(
          scheduledRide,
          candidateRide,
          candidateStartMs - scheduledEndMs
        );
        worstFit = this.pickWorseScheduleFit(worstFit, fit);
      } else if (candidateEndMs <= scheduledStartMs) {
        const fit = await this.buildScheduleFitBetweenRides(
          candidateRide,
          scheduledRide,
          scheduledStartMs - candidateEndMs
        );
        worstFit = this.pickWorseScheduleFit(worstFit, fit);
      } else {
        const overlapWindowMinutes = Math.round((scheduledStartMs - candidateEndMs) / 60_000);
        worstFit = this.pickWorseScheduleFit(worstFit, this.toScheduleFit(overlapWindowMinutes, 0, scheduledRide.id));
      }
    }

    return worstFit;
  }

  private pickWorseScheduleFit(
    currentFit: RideScheduleFit | undefined,
    nextFit: RideScheduleFit
  ): RideScheduleFit {
    if (!currentFit) {
      return nextFit;
    }

    if (nextFit.bufferMinutes < currentFit.bufferMinutes) {
      return nextFit;
    }

    return currentFit;
  }

  private async getTransferEstimate(origin: string, destination: string, departureTime?: Date): Promise<{
    durationMinutes: number;
    distanceKm: number;
  }> {
    const departureKey = departureTime ? departureTime.toISOString().slice(0, 16) : "no_departure";
    const cacheKey = `${origin}__${destination}__${departureKey}`;
    const cached = this.scheduleTransferCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return {
        durationMinutes: cached.durationMinutes,
        distanceKm: cached.distanceKm
      };
    }

    const route = await this.mapsService.estimateRoute(origin, destination, departureTime);
    this.scheduleTransferCache.set(cacheKey, {
      durationMinutes: route.durationMinutes,
      distanceKm: route.distanceKm,
      expiresAt: Date.now() + 5 * 60_000
    });

    return {
      durationMinutes: route.durationMinutes,
      distanceKm: route.distanceKm
    };
  }

  private getRideStartMs(ride: Ride): number {
    return new Date(ride.startedAt ?? ride.scheduledAt).getTime();
  }

  private getRideEndMs(ride: Ride): number {
    return this.getRideStartMs(ride) + (ride.quote?.routeDurationMinutes ?? 0) * 60_000;
  }

  private shiftRideSchedule(ride: Ride, deltaMinutes: number): Ride {
    const nextScheduledAt = new Date(new Date(ride.scheduledAt).getTime() + deltaMinutes * 60_000);

    return {
      ...ride,
      scheduledAt: nextScheduledAt.toISOString()
    };
  }

  private buildAlternativeOptionLabel(scheduledAt: string, deltaMinutes: number): string {
    const timeLabel = new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(scheduledAt));

    if (deltaMinutes < 0) {
      return `${timeLabel} (${Math.abs(deltaMinutes)} min antes)`;
    }

    return `${timeLabel} (${deltaMinutes} min depois)`;
  }

  private async updateDriverStage(input: {
    rideId: string;
    driverId: string;
    allowedStages: DriverRideStage[];
    nextStage: DriverRideStage;
    eventType: string;
    nextTimestamps: {
      navigationStartedAt?: Date;
      arrivedAt?: Date;
      startedAt?: Date;
      completedAt?: Date;
    };
  }): Promise<Ride> {
    const ride = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.ride.findUnique({
        where: { id: input.rideId },
        include: {
          quotes: {
            orderBy: { createdAt: "desc" },
            take: 1
          }
        }
      });

      if (!existing) {
        throw new NotFoundException(`Ride ${input.rideId} not found.`);
      }

      if (existing.status !== PrismaRideStatus.ACCEPTED) {
        throw new ConflictException("Ride is not active for driver execution.");
      }

      if (existing.assignedDriverId !== input.driverId) {
        throw new ConflictException("Ride is assigned to another driver.");
      }

      const currentStage = (existing.driverStage as DriverRideStage | null) ?? "SCHEDULED";
      if (!input.allowedStages.includes(currentStage)) {
        throw new ConflictException(`Ride stage ${currentStage} cannot transition to ${input.nextStage}.`);
      }

      const updatedRide = await tx.ride.update({
        where: { id: input.rideId },
        data: {
          ...(input.nextStage === "COMPLETED" ? { status: PrismaRideStatus.COMPLETED } : {}),
          driverStage: input.nextStage,
          navigationStartedAt:
            input.nextTimestamps.navigationStartedAt === undefined
              ? undefined
              : input.nextTimestamps.navigationStartedAt,
          arrivedAt: input.nextTimestamps.arrivedAt === undefined ? undefined : input.nextTimestamps.arrivedAt,
          startedAt: input.nextTimestamps.startedAt === undefined ? undefined : input.nextTimestamps.startedAt,
          completedAt:
            input.nextTimestamps.completedAt === undefined ? undefined : input.nextTimestamps.completedAt
        },
        include: {
          quotes: {
            orderBy: { createdAt: "desc" },
            take: 1
          }
        }
      });

      await tx.rideEvent.create({
        data: {
          rideId: input.rideId,
          eventType: input.eventType,
          payload: {
            driverId: input.driverId,
            stage: input.nextStage
          }
        }
      });

      return updatedRide;
    });

    return this.toRideResponse(ride);
  }
}
