import { NightPolicyEditorPage } from "../../../../components/night-policy-editor-page";

type Props = {
  params: Promise<{
    policyId: string;
  }>;
};

export default async function AdministrativeNightPolicyViewPage({ params }: Props) {
  const { policyId } = await params;
  return <NightPolicyEditorPage mode="view" policyId={policyId} />;
}
