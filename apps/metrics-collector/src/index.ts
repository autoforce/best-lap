import { metricsWorkersConfig } from "./config/queues/workers-config";
import { collectMetricsCron } from "./jobs/cron/collect-metrics-cron";
import { syncChannelsCron } from "./jobs/cron/sync-channels-cron";
import { alertsCron } from "./jobs/cron/alerts-cron";
import { closeLockClient, connectToDatabase, dataSource, queuesMap, setupWorkers } from "@best-lap/infra";

async function initCollectMetricsCron() {
  try {
    // Migrations belong to the API; the collector only connects
    await connectToDatabase();
  } catch (error) {
    console.error('Erro ao conectar com banco:', error);
    process.exit(1);
  }

  const workers = setupWorkers(metricsWorkersConfig);
  const tasks = [collectMetricsCron(), syncChannelsCron(), ...alertsCron()].filter((task) => task !== null);

  // On deploys the platform sends SIGTERM: stop scheduling, let running jobs finish
  // (BullMQ waits for them) and close connections, so no job is left stalled.
  let shuttingDown = false
  const shutdown = async (signal: string) => {
    if (shuttingDown) return
    shuttingDown = true
    console.log(`🛑 ${signal} received, shutting down`)
    tasks.forEach((task) => task.stop())
    const forceExit = setTimeout(() => process.exit(1), 25_000)
    try {
      await Promise.all(workers.map((worker) => worker.close()))
      await Promise.all(Object.values(queuesMap).map((queue) => queue.close()))
      await closeLockClient()
      if (dataSource.isInitialized) await dataSource.destroy()
    } finally {
      clearTimeout(forceExit)
      process.exit(0)
    }
  }

  process.once('SIGTERM', () => void shutdown('SIGTERM'))
  process.once('SIGINT', () => void shutdown('SIGINT'))
}

initCollectMetricsCron()
