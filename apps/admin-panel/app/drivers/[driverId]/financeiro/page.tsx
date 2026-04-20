import { DriverProfileLoader } from "../../../../components/driver-profile-loader";

type DriverFinancePageProps = {
  params: Promise<{
    driverId: string;
  }>;
};

export default async function DriverFinancePage({ params }: DriverFinancePageProps) {
  const { driverId } = await params;

  return <DriverProfileLoader driverId={driverId} view="workspace" activeTab="financeiro" />;
}
