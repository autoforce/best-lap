import { EnqueueCollectionUseCase } from "@best-lap/core";
import { TypeormChannelsRepository, BullMqPageMetricsQueue, queuesMap } from "@best-lap/infra";

export const makeEnqueueCollectionUseCase = () => {
  return new EnqueueCollectionUseCase(new TypeormChannelsRepository(), new BullMqPageMetricsQueue(queuesMap))
}
