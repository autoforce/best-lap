import { UserRepository } from '../../modules/user'
import { UserAlreadyExists } from '../../errors'
import * as bcrypt from 'bcryptjs'

interface CreateUserRequest {
  name: string
  email: string
  password: string
}

export class CreateUserUseCase {
  constructor(private userRepository: UserRepository) {}

  async execute({ name, email, password }: CreateUserRequest) {
    const userExists = await this.userRepository.findByEmail(email)

    if (userExists) {
      throw new UserAlreadyExists()
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await this.userRepository.create({
      name,
      email,
      password: hashedPassword,
    })

    return {
      id: user.id,
      name: user.name,
      email: user.email,
    }
  }
}
