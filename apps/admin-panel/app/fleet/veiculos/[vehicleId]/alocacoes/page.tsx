import { FleetVehicleLoader } from "../../../../../components/fleet-vehicle-loader";

type FleetVehicleAllocationsPageProps = {
  params: Promise<{
    vehicleId: string;
  }>;
};

export default async function FleetVehicleAllocationsPage({ params }: FleetVehicleAllocationsPageProps) {
  const { vehicleId } = await params;

  return <FleetVehicleLoader vehicleId={vehicleId} view="workspace" activeTab="alocacoes" />;
}
