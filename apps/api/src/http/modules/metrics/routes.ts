import { FastifyInstance } from "fastify"
import { ZodTypeProvider } from "fastify-type-provider-zod"
import {
  listAverageForAllChannelsMetrics,
  listAllChannelsMetricsGrouped,
  listAverageChannelsMetricsByTheme,
  listAverageChannelsMetricsByProvider,
  listAverageChannelMetrics,
  listChannelMetrics,
  triggerCollectionAll,
  triggerCollectionChannel,
  triggerCollectionPage
} from "./controllers"
import {
  listAverageChannelsMetricsByThemeDocs,
  listAverageChannelsMetricsByProviderDocs,
  listAverageChannelMetricsDocs,
  listChannelMetricsDocs,
  listAverageForAllChannelsMetricsDocs,
  listAllChannelsMetricsGroupedDocs,
  triggerCollectionAllDocs,
  triggerCollectionChannelDocs,
  triggerCollectionPageDocs
} from "./docs"

export async function metricsRoutes(server: FastifyInstance) {
  // POST routes (more specific) should come first
  server
    .withTypeProvider<ZodTypeProvider>()
    .post(
      '/collect',
      triggerCollectionAllDocs,
      triggerCollectionAll
    )

  server
    .withTypeProvider<ZodTypeProvider>()
    .post(
      '/:channel_id/pages/:page_id/collect',
      triggerCollectionPageDocs,
      triggerCollectionPage
    )

  server
    .withTypeProvider<ZodTypeProvider>()
    .post(
      '/:channel_id/collect',
      triggerCollectionChannelDocs,
      triggerCollectionChannel
    )

  // GET routes
  server
    .withTypeProvider<ZodTypeProvider>()
    .get(
      '/average/:period',
      listAverageForAllChannelsMetricsDocs,
      listAverageForAllChannelsMetrics
    )

  server
    .withTypeProvider<ZodTypeProvider>()
    .get(
      '/grouped/:period',
      listAllChannelsMetricsGroupedDocs,
      listAllChannelsMetricsGrouped
    )

  server
    .withTypeProvider<ZodTypeProvider>()
    .get(
      '/theme/:theme/average/:period',
      listAverageChannelsMetricsByThemeDocs,
      listAverageChannelsMetricsByTheme
    )

  server
    .withTypeProvider<ZodTypeProvider>()
    .get(
      '/provider/:provider_id/average/:period',
      listAverageChannelsMetricsByProviderDocs,
      listAverageChannelsMetricsByProvider
    )

  server
    .withTypeProvider<ZodTypeProvider>()
    .get(
      '/:channel_id/average/:period',
      listAverageChannelMetricsDocs,
      listAverageChannelMetrics
    )

  server
    .withTypeProvider<ZodTypeProvider>()
    .get(
      '/:channel_id',
      listChannelMetricsDocs,
      listChannelMetrics
    )
}
