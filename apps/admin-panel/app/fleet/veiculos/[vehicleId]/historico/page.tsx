import { FleetVehicleLoader } from "../../../../../components/fleet-vehicle-loader";

type FleetVehicleHistoryPageProps = {
  params: Promise<{
    vehicleId: string;
  }>;
};

export default async function FleetVehicleHistoryPage({ params }: FleetVehicleHistoryPageProps) {
  const { vehicleId } = await params;

  return <FleetVehicleLoader vehicleId={vehicleId} view="workspace" activeTab="historico" />;
}
