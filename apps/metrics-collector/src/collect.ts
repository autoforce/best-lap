import { closeLockClient, connectToDatabase, queuesMap } from '@best-lap/infra';
import { collectMetrics } from './jobs/collect-metrics'
import { slotKey } from './jobs/cron/schedule-task'

async function initCollect() {
  try {
    await connectToDatabase();
  } catch (error) {
    console.error('Erro ao conectar com banco:', error);
    process.exit(1);
  }

  try {
    console.log('starting collect')
    await collectMetrics(`manual_${slotKey()}`)
    console.log('collect enqueued successfully')
    await Promise.all(Object.values(queuesMap).map((queue) => queue.close()))
    await closeLockClient()
    process.exit(0)
  } catch (err) {
    console.log("error during execution: ", err)
    process.exit(1)
  }
}

initCollect();
