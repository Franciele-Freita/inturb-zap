import { FleetVehicleLoader } from "../../../../../components/fleet-vehicle-loader";

type FleetVehicleCadastroPageProps = {
  params: Promise<{
    vehicleId: string;
  }>;
};

export default async function FleetVehicleCadastroPage({ params }: FleetVehicleCadastroPageProps) {
  const { vehicleId } = await params;

  return <FleetVehicleLoader vehicleId={vehicleId} view="editor" />;
}
