export class BulkSyncRejected extends Error {
  constructor(message: string, public details: string[] = []) {
    super(message)
  }
}
