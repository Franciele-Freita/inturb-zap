import { HolidayEditorPage } from "../../../../components/holiday-editor-page";

type Props = {
  params: Promise<{
    holidayId: string;
  }>;
};

export default async function AdministrativeHolidayViewPage({ params }: Props) {
  const { holidayId } = await params;
  return <HolidayEditorPage mode="view" holidayId={holidayId} />;
}

