import { BenefitEditorPage } from "../../../../components/benefit-editor-page";

type AdministrativeBenefitsViewPageProps = {
  params: Promise<{
    benefitId: string;
  }>;
};

export default async function AdministrativeBenefitsViewPage({
  params
}: AdministrativeBenefitsViewPageProps) {
  const { benefitId } = await params;

  return <BenefitEditorPage mode="view" benefitId={benefitId} />;
}
