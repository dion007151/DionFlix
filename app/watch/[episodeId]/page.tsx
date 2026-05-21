import { WatchExperience } from "@/components/WatchExperience";

export default async function WatchPage({ params }: { params: Promise<{ episodeId: string }> }) {
  const { episodeId } = await params;
  return <WatchExperience episodeId={episodeId} />;
}
