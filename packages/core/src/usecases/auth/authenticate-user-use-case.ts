import { UserRepository } from '../../modules/user'
import { InvalidCredentials } from '../../errors'
import * as bcrypt from 'bcryptjs'

interface AuthenticateUserRequest {
  email: string
  password: string
}

interface AuthenticateUserResponse {
  user: {
    id: string
    name: string
    email: string
  }
}

export class AuthenticateUserUseCase {
  constructor(private userRepository: UserRepository) {}

  async execute({ email, password }: AuthenticateUserRequest): Promise<AuthenticateUserResponse> {
    const user = await this.userRepository.findByEmail(email)

    if (!user) {
      throw new InvalidCredentials()
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      throw new InvalidCredentials()
    }

    return {
      user: {
        id: user.id!,
        name: user.name,
        email: user.email,
      },
    }
  }
}
