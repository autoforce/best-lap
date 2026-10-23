import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { ChannelEntity } from '@best-lap/core'
import { Page } from './page-entity';
import { Provider } from './provider-entity';

@Entity('channels')
export class Channel implements ChannelEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('text')
  name!: string;

  @Column('text')
  domain!: string;

  @Column('text', { unique: true })
  internal_link!: string;

  @Column('text')
  theme!: string;

  @Column('bool')
  active!: boolean;

  @Column('bool')
  is_reference!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @Column('uuid', { nullable: true })
  provider_id?: string;

  @Column('text', { nullable: true })
  source?: string;

  @ManyToOne(() => Provider, (provider) => provider.channels, { nullable: true })
  @JoinColumn({ name: 'provider_id' })
  provider?: Provider;

  @OneToMany(() => Page, (page) => page.channel)
  pages!: Page[];
}