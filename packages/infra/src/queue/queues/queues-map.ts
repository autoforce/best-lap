import { makeQueue } from "./bull-mq"

const bullMqMainQueue = makeQueue('reference')
const bullMqClientsQueue = makeQueue('client')

/** Queues that receive page collection jobs */
export const queuesMap = {
  reference: bullMqMainQueue,
  client: bullMqClientsQueue
}
