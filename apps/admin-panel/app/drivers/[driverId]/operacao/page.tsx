import { DriverProfileLoader } from "../../../../components/driver-profile-loader";

type DriverOperationPageProps = {
  params: Promise<{
    driverId: string;
  }>;
};

export default async function DriverOperationPage({ params }: DriverOperationPageProps) {
  const { driverId } = await params;

  return <DriverProfileLoader driverId={driverId} view="workspace" activeTab="operacao" />;
}
