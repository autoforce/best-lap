export interface UserEntity {
  id?: string
  name: string
  email: string
  password: string // hashed
  created_at?: Date
  updated_at?: Date
}
