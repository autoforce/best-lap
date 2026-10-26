import type { PageSnapshotsRepository, SnapshotGroupFilter } from '../../modules/insights/page-snapshot.interface'
import { addDays, buildGroupRecommendations, buildPageRecommendations, compareSnapshots } from '../../utils/page-diagnosis'

const COMPARE_DAYS = 7
const HISTORY_DAYS = 60

/**
 * Diagnosis of one page from its daily snapshots: rule-based recommendations for the latest one,
 * what changed against a week before (or the oldest snapshot, while there is less history) and
 * the daily weight.
 */
export class GetPageDiagnosisUseCase {
  constructor(private snapshotsRepository: PageSnapshotsRepository) {}

  async execute(pageId: string) {
    const current = await this.snapshotsRepository.findLatest(pageId)
    if (!current) return { current: null, previous: null, changes: [], recommendations: [], history: [] }

    const weekBefore = await this.snapshotsRepository.findLatest(pageId, addDays(current.day, -COMPARE_DAYS))
    const oldest = weekBefore ?? (await this.snapshotsRepository.findOldestAfter(pageId, addDays(current.day, -HISTORY_DAYS)))
    const previous = oldest && oldest.day < current.day ? oldest : null

    return {
      current,
      previous: previous ? { day: previous.day, collected_at: previous.collected_at } : null,
      changes: previous ? compareSnapshots(current, previous) : [],
      recommendations: buildPageRecommendations(current),
      history: await this.snapshotsRepository.history(pageId, HISTORY_DAYS),
    }
  }
}

/** Files, third parties and LCP patterns shared by the sites of a theme or provider, with group rules */
export class GetGroupDiagnosisUseCase {
  constructor(private snapshotsRepository: PageSnapshotsRepository) {}

  async execute(filter: SnapshotGroupFilter = {}) {
    const aggregate = await this.snapshotsRepository.aggregateGroup(filter)
    return { ...aggregate, recommendations: buildGroupRecommendations(aggregate) }
  }
}
