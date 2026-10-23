import { TypeormMetricsRepository, TypeormPageInsightsRepository } from "@best-lap/infra";
import { CollectPageMetricsService } from "../services";

export const makeCollectPageMetricsService = () => {
  return new CollectPageMetricsService(new TypeormMetricsRepository(), new TypeormPageInsightsRepository())
}
