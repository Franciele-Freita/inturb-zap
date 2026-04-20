import { WorkJourneyEditorPage } from "../../../../components/work-journey-editor-page";

type AdministrativeScalesViewPageProps = {
  params: Promise<{
    journeyId: string;
  }>;
};

export default async function AdministrativeScalesViewPage({ params }: AdministrativeScalesViewPageProps) {
  const { journeyId } = await params;
  return <WorkJourneyEditorPage mode="view" journeyId={journeyId} />;
}
