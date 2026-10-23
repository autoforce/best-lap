import jwt from 'jsonwebtoken'
import { env, requireApiEnv } from '@best-lap/env'

export interface JwtPayload {
  userId: string
  email: string
  name: string
}

export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, requireApiEnv().JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  })
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, requireApiEnv().JWT_SECRET) as JwtPayload
}
