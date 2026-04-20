import { CargoEditorPage } from "../../../../../components/cargo-editor-page";

type AdministrativeCargoEditPageProps = {
  params: Promise<{
    cargoId: string;
  }>;
};

export default async function AdministrativeCargoEditPage({
  params
}: AdministrativeCargoEditPageProps) {
  const { cargoId } = await params;
  return <CargoEditorPage mode="edit" cargoId={cargoId} />;
}
