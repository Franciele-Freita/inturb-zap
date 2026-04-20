import { FleetChecklistTemplatePage } from "../../../../components/fleet-checklist-template-page";

type FleetChecklistTemplateEditPageProps = {
  params: Promise<{
    templateId: string;
  }>;
};

export default async function FleetChecklistTemplateEditPage({
  params
}: FleetChecklistTemplateEditPageProps) {
  const { templateId } = await params;

  return <FleetChecklistTemplatePage templateId={templateId} />;
}
