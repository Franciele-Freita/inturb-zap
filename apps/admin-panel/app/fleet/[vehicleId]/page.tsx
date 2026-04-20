import { redirect } from "next/navigation";

type FleetVehicleDetailsPageProps = {
  params: Promise<{
    vehicleId: string;
  }>;
};

export default async function FleetVehicleDetailsPage({ params }: FleetVehicleDetailsPageProps) {
  const { vehicleId } = await params;

  redirect(`/fleet/veiculos/${vehicleId}/overview`);
}
