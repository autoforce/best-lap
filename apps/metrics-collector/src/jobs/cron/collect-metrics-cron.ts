import { env } from '@best-lap/env';
import { collectMetrics } from '../collect-metrics';
import { scheduleTask } from './schedule-task';

export const collectMetricsCron = () =>
  scheduleTask('collect-metrics', env.COLLECT_METRICS_CRON_EXPRESSION, (slot) => collectMetrics(`cron_${slot}`))
