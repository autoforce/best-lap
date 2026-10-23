import { makeEnqueueCollectionUseCase } from "../factories";

/** Enqueues every page of every active channel. The batch key deduplicates repeated runs. */
export const collectMetrics = async (batchKey: string) => {
  const result = await makeEnqueueCollectionUseCase().execute({
    scope: { kind: 'all' },
    pages: 'all',
    batchKey,
  })

  console.log(`📥 ${result.jobs_count} pages enqueued for ${result.channels_count} channels`)
  if (result.skipped.length) {
    console.warn(`⚠️  ${result.skipped.length} channels skipped:`, result.skipped)
  }
};
