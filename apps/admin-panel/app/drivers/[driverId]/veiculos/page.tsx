import { DriverProfileLoader } from "../../../../components/driver-profile-loader";

type DriverVehiclesPageProps = {
  params: Promise<{
    driverId: string;
  }>;
};

export default async function DriverVehiclesPage({ params }: DriverVehiclesPageProps) {
  const { driverId } = await params;

  return <DriverProfileLoader driverId={driverId} view="workspace" activeTab="veiculos" />;
}
