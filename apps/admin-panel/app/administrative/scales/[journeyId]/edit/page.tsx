import { WorkJourneyEditorPage } from "../../../../../components/work-journey-editor-page";

type AdministrativeScalesEditPageProps = {
  params: Promise<{
    journeyId: string;
  }>;
};

export default async function AdministrativeScalesEditPage({ params }: AdministrativeScalesEditPageProps) {
  const { journeyId } = await params;
  return <WorkJourneyEditorPage mode="edit" journeyId={journeyId} />;
}
