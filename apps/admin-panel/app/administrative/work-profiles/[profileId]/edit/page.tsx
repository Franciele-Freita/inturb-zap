import { WorkProfileEditorPage } from "../../../../../components/work-profile-editor-page";

type AdministrativeWorkProfileEditPageProps = {
  params: Promise<{
    profileId: string;
  }>;
};

export default async function AdministrativeWorkProfileEditPage({
  params
}: AdministrativeWorkProfileEditPageProps) {
  const { profileId } = await params;
  return <WorkProfileEditorPage mode="edit" profileId={profileId} />;
}
