import { FastifyReply, FastifyRequest } from "fastify";
import { querySchema, requestParamsSchema } from "../utils/list-route-schemas";
import { TypeormChannelsRepository, TypeormMetricsRepository, TypeormPagesRepository } from "@best-lap/infra";
import { GetPageMetricsUseCase, ResourceNotFound } from "@best-lap/core";

export async function listChannelMetrics(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { channel_id } = requestParamsSchema.parse(request.params);

    const channelsRepository = new TypeormChannelsRepository()
    const pagesRepository = new TypeormPagesRepository()
    const metricsRepository = new TypeormMetricsRepository()

    const page = await pagesRepository.findByPathFromChannel({
      channel_id,
      path: '/'
    })

    if (!page) {
      return reply.code(404).send({ message: 'Channel has no home page (/)' });
    }

    const getChannelMetricsUseCase = new GetPageMetricsUseCase(
      channelsRepository,
      pagesRepository,
      metricsRepository
    )
    const { metric, startDate, endDate } = querySchema.parse(request.query);

    const channelMetrics = await getChannelMetricsUseCase.execute(
      {
        pageId: page.id!,
        filterOptions: {
          endDate,
          startDate,
          metric
        }
      }
    )

    return reply.code(200).send(channelMetrics)
  } catch (error) {
    console.error(error)

    if (error instanceof ResourceNotFound) {
      return reply.code(404).send({ message: error.message })
    }

    return reply.code(500).send({ error: 'Internal Server Error' })
  }
}