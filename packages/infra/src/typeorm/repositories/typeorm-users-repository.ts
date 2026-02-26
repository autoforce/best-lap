import { UserEntity, UserRepository } from '@best-lap/core'
import { dataSource } from '../../database/data-source'
import { User } from '../entities'

export class TypeormUsersRepository implements UserRepository {
  private get repository() {
    return dataSource.getRepository<User>(User)
  }

  async create(params: UserEntity): Promise<UserEntity> {
    const userData = this.repository.create(params)
    return await this.repository.save(userData)
  }

  async findById(id: string): Promise<UserEntity | null> {
    return (await this.repository.findOne({ where: { id } })) || null
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return (await this.repository.findOne({ where: { email } })) || null
  }

  async listAll(): Promise<UserEntity[]> {
    return await this.repository.find({
      order: { created_at: 'DESC' },
    })
  }

  async update(userId: string, data: Partial<UserEntity>): Promise<void> {
    await this.repository.update({ id: userId }, data)
  }

  async delete(userId: string): Promise<void> {
    await this.repository.delete({ id: userId })
  }
}
