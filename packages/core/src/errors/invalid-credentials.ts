export class InvalidCredentials extends Error {
  constructor(message: string = 'Invalid email or password.') {
    super(message)
  }
}
