import type { PageInsightsRepository } from '../../modules/insights/page-insights.interface'
import { aggregateOpportunities } from '../../utils/aggregate-opportunities'

/** Latest Lighthouse findings for every page of a channel */
export class GetChannelInsightsUseCase {
  constructor(private pageInsightsRepository: PageInsightsRepository) {}

  async execute(channelId: string) {
    const pages = await this.pageInsightsRepository.list({ channelId })
    return { pages }
  }
}

/**
 * Opportunities shared by many channels (optionally of one theme or provider).
 * A problem present in most sites of a theme is usually fixed once, in the template.
 */
export class GetCommonOpportunitiesUseCase {
  constructor(private pageInsightsRepository: PageInsightsRepository) {}

  async execute({ theme, providerId }: { theme?: string; providerId?: string } = {}) {
    const rows = await this.pageInsightsRepository.list({ theme, providerId, activeOnly: true })
    return aggregateOpportunities(rows)
  }
}
