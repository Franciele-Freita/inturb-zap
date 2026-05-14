import { HolidayEditorPage } from "../../../../../components/holiday-editor-page";

type Props = {
  params: Promise<{
    holidayId: string;
  }>;
};

export default async function AdministrativeHolidayEditPage({ params }: Props) {
  const { holidayId } = await params;
  return <HolidayEditorPage mode="edit" holidayId={holidayId} />;
}

