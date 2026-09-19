import { getJourney, getJourneyOptions } from "@nomera/postgres/server/journey";
import { JourneyBuilder } from "@/features/journey/builder";
import { journeyContext } from "@/features/journey/server";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ departure?: string }>;
}) {
  const { secret, tenantId, canManage } = await journeyContext();
  const options = await getJourneyOptions(secret, tenantId);
  const requested = (await searchParams).departure;
  const selected =
    options.find((option) => option.id === requested) ?? options[0];
  const data = selected
    ? await getJourney(secret, tenantId, selected.id)
    : null;
  return (
    <JourneyBuilder
      key={data?.departureId ?? "empty"}
      options={options}
      initial={data}
      canManage={canManage}
    />
  );
}
