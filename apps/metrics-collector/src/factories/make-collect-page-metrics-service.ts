import { TypeormMetricsRepository, TypeormPageInsightsRepository, TypeormPageSnapshotsRepository } from "@best-lap/infra";
import { CollectPageMetricsService } from "../services";

export const makeCollectPageMetricsService = () => {
  return new CollectPageMetricsService(
    new TypeormMetricsRepository(),
    new TypeormPageInsightsRepository(),
    new TypeormPageSnapshotsRepository(),
  )
}
