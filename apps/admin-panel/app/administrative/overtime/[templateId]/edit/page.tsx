import { OvertimeTemplateEditorPage } from "../../../../../components/overtime-template-editor-page";

type AdministrativeOvertimeEditPageProps = {
  params: Promise<{
    templateId: string;
  }>;
};

export default async function AdministrativeOvertimeEditPage({
  params
}: AdministrativeOvertimeEditPageProps) {
  const { templateId } = await params;

  return <OvertimeTemplateEditorPage mode="edit" templateId={templateId} />;
}
