import { FastifyReply, FastifyRequest } from "fastify";
import { TypeormMetricsRepository } from "@best-lap/infra";
import { GetAllChannelsMetricsGroupedUseCase } from "@best-lap/core";
import { querySchema, requestParamsSchema } from "../utils/list-all-route-schemas";

export async function listAllChannelsMetricsGrouped(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { metric, startDate, endDate } = querySchema.parse(request.query);
    const { period } = requestParamsSchema.parse(request.params);

    const metricsRepository = new TypeormMetricsRepository()
    const getAllChannelsMetricsGroupedUseCase = new GetAllChannelsMetricsGroupedUseCase(metricsRepository)

    const metricsGroupedData = await getAllChannelsMetricsGroupedUseCase.execute({
      metric,
      filterPeriodOptions: {
        period,
        endDate,
        startDate,
      }
    })

    return reply.code(200).send({
      metrics: metricsGroupedData
    })
  } catch (error) {
    console.error(error);

    return reply.code(500).send({ error: 'Internal Server Error.' })
  }
}
