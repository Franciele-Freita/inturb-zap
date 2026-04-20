import { redirect } from "next/navigation";

type DriverDetailsPageProps = {
  params: Promise<{
    driverId: string;
  }>;
};

export default async function DriverDetailsPage({ params }: DriverDetailsPageProps) {
  const { driverId } = await params;

  redirect(`/drivers/${driverId}/overview`);
}
