export class UserAlreadyExists extends Error {
  constructor(message: string = 'User with this email already exists.') {
    super(message)
  }
}
