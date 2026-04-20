import { DriverProfileLoader } from "../../../../components/driver-profile-loader";

type DriverHistoryPageProps = {
  params: Promise<{
    driverId: string;
  }>;
};

export default async function DriverHistoryPage({ params }: DriverHistoryPageProps) {
  const { driverId } = await params;

  return <DriverProfileLoader driverId={driverId} view="workspace" activeTab="historico" />;
}
