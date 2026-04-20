import { FleetVehicleLoader } from "../../../../../components/fleet-vehicle-loader";

type FleetVehicleChecklistsPageProps = {
  params: Promise<{
    vehicleId: string;
  }>;
};

export default async function FleetVehicleChecklistsPage({ params }: FleetVehicleChecklistsPageProps) {
  const { vehicleId } = await params;

  return <FleetVehicleLoader vehicleId={vehicleId} view="workspace" activeTab="checklists" />;
}
