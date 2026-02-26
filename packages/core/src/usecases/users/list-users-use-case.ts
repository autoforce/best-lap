import { UserRepository } from '../../modules/user'

export class ListUsersUseCase {
  constructor(private userRepository: UserRepository) {}

  async execute() {
    const users = await this.userRepository.listAll()

    // Don't return passwords
    return users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      created_at: user.created_at,
    }))
  }
}
