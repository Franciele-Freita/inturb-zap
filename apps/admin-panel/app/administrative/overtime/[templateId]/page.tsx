import { OvertimeTemplateEditorPage } from "../../../../components/overtime-template-editor-page";

type AdministrativeOvertimeViewPageProps = {
  params: Promise<{
    templateId: string;
  }>;
};

export default async function AdministrativeOvertimeViewPage({
  params
}: AdministrativeOvertimeViewPageProps) {
  const { templateId } = await params;

  return <OvertimeTemplateEditorPage mode="view" templateId={templateId} />;
}
