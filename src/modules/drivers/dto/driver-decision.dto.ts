import { IsIn } from "class-validator";
import { DriverDecision } from "../../rides/types";

export class DriverDecisionDto {
  @IsIn(["ACCEPT", "REJECT"])
  decision!: DriverDecision;
}
