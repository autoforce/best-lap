import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { UserEntity } from '@best-lap/core'

@Entity('users')
export class User implements UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column('text')
  name!: string

  @Column('text', { unique: true })
  email!: string

  @Column('text')
  password!: string

  @CreateDateColumn()
  created_at!: Date

  @UpdateDateColumn()
  updated_at!: Date
}
