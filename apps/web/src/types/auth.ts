export interface User {
  id: string
  name: string
  email: string
  created_at?: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface LoginResponse {
  user: User
  token: string
}

export interface CreateUserInput {
  name: string
  email: string
  password: string
}
