import { UserRepository } from '../../modules/user'
import { ResourceNotFound } from '../../errors'

export class DeleteUserUseCase {
  constructor(private userRepository: UserRepository) {}

  async execute(userId: string) {
    const user = await this.userRepository.findById(userId)

    if (!user) {
      throw new ResourceNotFound('User not found')
    }

    await this.userRepository.delete(userId)
  }
}
