import { BenefitEditorPage } from "../../../../../components/benefit-editor-page";

type AdministrativeBenefitsEditPageProps = {
  params: Promise<{
    benefitId: string;
  }>;
};

export default async function AdministrativeBenefitsEditPage({
  params
}: AdministrativeBenefitsEditPageProps) {
  const { benefitId } = await params;

  return <BenefitEditorPage mode="edit" benefitId={benefitId} />;
}
