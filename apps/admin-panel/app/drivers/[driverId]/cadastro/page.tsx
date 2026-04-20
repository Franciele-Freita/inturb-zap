import { DriverProfileLoader } from "../../../../components/driver-profile-loader";

type DriverEditorPageProps = {
  params: Promise<{
    driverId: string;
  }>;
};

export default async function DriverEditorPage({ params }: DriverEditorPageProps) {
  const { driverId } = await params;

  return <DriverProfileLoader driverId={driverId} view="editor" />;
}
