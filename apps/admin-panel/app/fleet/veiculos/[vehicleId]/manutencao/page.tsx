import { FleetVehicleLoader } from "../../../../../components/fleet-vehicle-loader";

type FleetVehicleMaintenancePageProps = {
  params: Promise<{
    vehicleId: string;
  }>;
};

export default async function FleetVehicleMaintenancePage({ params }: FleetVehicleMaintenancePageProps) {
  const { vehicleId } = await params;

  return <FleetVehicleLoader vehicleId={vehicleId} view="workspace" activeTab="manutencao" />;
}
