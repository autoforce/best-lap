import { FastifyReply, FastifyRequest } from "fastify";
import { querySchema } from "../utils/list-route-schemas";
import { TypeormMetricsRepository, TypeormPagesRepository } from "@best-lap/infra";
import { GetPageAverageMetricsUseCase } from "@best-lap/core";
import { channelRequestParamsSchema } from "../utils/list-average-route-schemas";

export async function listAverageChannelMetrics(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { metric, startDate, endDate } = querySchema.parse(request.query);
    const { page_id } = request.query as { page_id?: string };
    const { period, channel_id } = channelRequestParamsSchema.parse(request.params);

    const pagesRepository = new TypeormPagesRepository()
    const page = page_id
      ? await pagesRepository.findById(page_id)
      : await pagesRepository.findByPathFromChannel({ channel_id, path: '/' })

    if (!page) {
      return reply.code(404).send({ message: page_id ? 'Page not found' : 'Channel has no home page (/)' });
    }

    if (page.channel_id !== channel_id) {
      return reply.code(400).send({ message: 'Page does not belong to the specified channel' });
    }

    const metricsRepository = new TypeormMetricsRepository()
    const getChannelMetricsAverageUseCase = new GetPageAverageMetricsUseCase(metricsRepository)

    const metricsAverageData = await getChannelMetricsAverageUseCase.execute({
      metric,
      filterPeriodOptions: {
        period,
        page_id: page.id,
        endDate,
        startDate
      }
    })

    return reply.code(200).send({
      metrics: metricsAverageData
    })
  } catch (error) {
    console.error(error);

    return reply.code(500).send({ error: 'Internal Server Error' })
  }
}