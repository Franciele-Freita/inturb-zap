import { redirect } from "next/navigation";

type FleetVehiclePageProps = {
  params: Promise<{
    vehicleId: string;
  }>;
};

export default async function FleetVehiclePage({ params }: FleetVehiclePageProps) {
  const { vehicleId } = await params;

  redirect(`/fleet/veiculos/${vehicleId}/overview`);
}
