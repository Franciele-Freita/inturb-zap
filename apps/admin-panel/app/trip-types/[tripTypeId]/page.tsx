import { TripTypeLoader } from "../../../components/trip-type-loader";

type TripTypeDetailsPageProps = {
  params: Promise<{
    tripTypeId: string;
  }>;
};

export default async function TripTypeDetailsPage({ params }: TripTypeDetailsPageProps) {
  const { tripTypeId } = await params;

  return <TripTypeLoader tripTypeId={tripTypeId} />;
}
