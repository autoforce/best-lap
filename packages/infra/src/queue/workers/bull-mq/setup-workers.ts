import { Worker } from "bullmq";
import { makeWorker } from "./factory/make-worker";
import { QueueType } from "../../queues/types/queue-type";
import { env } from "@best-lap/env";

type workerConfig = {
  queueName: QueueType;
  processor: (job: any) => Promise<void>;
  concurrency?: number;
}

/** Starts one worker per queue and returns them, so the process can close them on shutdown */
export const setupWorkers = (workersConfig: workerConfig[]): Worker[] => {
  return workersConfig.map(({ queueName, processor, concurrency }) => {
    const worker = makeWorker({
      queueName,
      processor,
      options: {
        concurrency: concurrency ?? env.WORKER_CONCURRENCY
      }
    });

    console.log(`Worker for queue ${queueName} started successfully`);
    return worker;
  })
}
