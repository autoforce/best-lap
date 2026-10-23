import { endOfUtcDay, startOfUtcDay } from './parse-utc-date';
import { Metric, PerformanceMetricsResponse } from '../types';

type FilterDateOptions = {
  startDate?: string
  endDate?: string
}

export const filterByDate = ({ startDate, endDate }: FilterDateOptions, channelMetrics: Metric[] | PerformanceMetricsResponse[]): PerformanceMetricsResponse[] => {
  const parsedStartDate = startDate && startOfUtcDay(startDate);
  const parsedEndDate = endDate && endOfUtcDay(endDate)

  const filteredMetricsData = channelMetrics.filter(metricData => {
    let isInThePeriod = true;

    if (parsedStartDate) isInThePeriod = metricData.time >= parsedStartDate
    if (parsedEndDate) isInThePeriod = isInThePeriod && (metricData.time <= parsedEndDate)

    return isInThePeriod
  })

  return filteredMetricsData
};
