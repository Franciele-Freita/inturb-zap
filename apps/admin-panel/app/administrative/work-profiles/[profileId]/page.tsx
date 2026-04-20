import { WorkProfileEditorPage } from "../../../../components/work-profile-editor-page";

type AdministrativeWorkProfileViewPageProps = {
  params: Promise<{
    profileId: string;
  }>;
};

export default async function AdministrativeWorkProfileViewPage({
  params
}: AdministrativeWorkProfileViewPageProps) {
  const { profileId } = await params;
  return <WorkProfileEditorPage mode="view" profileId={profileId} />;
}
