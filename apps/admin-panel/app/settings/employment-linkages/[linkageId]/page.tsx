import { EmploymentLinkageEditorPage } from "../../../../components/employment-linkage-editor-page";

type EmploymentLinkageEditorRouteProps = {
  params: Promise<{
    linkageId: string;
  }>;
};

export default async function EmploymentLinkageEditorRoute({
  params
}: EmploymentLinkageEditorRouteProps) {
  const { linkageId } = await params;
  return <EmploymentLinkageEditorPage linkageId={linkageId} />;
}
