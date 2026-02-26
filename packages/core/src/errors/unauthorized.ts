export class Unauthorized extends Error {
  constructor(message: string = 'Unauthorized access.') {
    super(message)
  }
}
