import { DriverProfileLoader } from "../../../../components/driver-profile-loader";

type DriverOverviewPageProps = {
  params: Promise<{
    driverId: string;
  }>;
};

export default async function DriverOverviewPage({ params }: DriverOverviewPageProps) {
  const { driverId } = await params;

  return <DriverProfileLoader driverId={driverId} view="workspace" activeTab="overview" />;
}
