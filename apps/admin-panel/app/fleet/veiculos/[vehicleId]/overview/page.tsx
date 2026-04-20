import { FleetVehicleLoader } from "../../../../../components/fleet-vehicle-loader";

type FleetVehicleOverviewPageProps = {
  params: Promise<{
    vehicleId: string;
  }>;
};

export default async function FleetVehicleOverviewPage({ params }: FleetVehicleOverviewPageProps) {
  const { vehicleId } = await params;

  return <FleetVehicleLoader vehicleId={vehicleId} view="workspace" activeTab="overview" />;
}
