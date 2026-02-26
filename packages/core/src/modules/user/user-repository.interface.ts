import { UserEntity } from './user-entity.interface'

export interface UserRepository {
  create(params: UserEntity): Promise<UserEntity>
  findById(id: string): Promise<UserEntity | null>
  findByEmail(email: string): Promise<UserEntity | null>
  listAll(): Promise<UserEntity[]>
  update(userId: string, data: Partial<UserEntity>): Promise<void>
  delete(userId: string): Promise<void>
}
