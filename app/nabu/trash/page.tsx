import TrashPage from "@/components/nabu/trash/trash-page";

/**
 * Trash Page Route
 * Displays deleted notes with option to restore
 * Notes are permanently deleted after 60 days
 */
export default async function TrashRoute() {
  return <TrashPage />;
}


