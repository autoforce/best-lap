import { IsNull } from "typeorm";
import { ChannelEntity, ChannelsRepository } from "@best-lap/core";
import { Channel as ChannelModel } from "../entities/channel-entity";
import { dataSource } from "../../database/data-source";

const channelRepository = dataSource.getRepository<ChannelModel>(ChannelModel);

export class TypeormChannelsRepository implements ChannelsRepository {
  async create(params: ChannelEntity): Promise<ChannelEntity> {
    const channelData = channelRepository.create(params)
    const createdChannel = await channelRepository.save(channelData)

    return createdChannel
  }

  async update(channel_id: string, data: Partial<ChannelEntity>) {
    await channelRepository.update(channel_id, data)
  }

  async delete(channelId: string): Promise<void> {
    await channelRepository.delete(channelId)
  }

  async listAll(): Promise<ChannelEntity[]> {
    return await channelRepository.find({
      relations: ['pages', 'provider']
    })
  }

  async listAllReferences(): Promise<ChannelEntity[]> {
    const allReferences = await channelRepository.find({
      where: {
        is_reference: true,
      }
    })

    return allReferences
  }

  async listAllClients(): Promise<ChannelEntity[]> {
    const allClients = await channelRepository.find({
      where: {
        is_reference: IsNull(),
      }
    })

    return allClients
  }

  async listActiveChannels(): Promise<ChannelEntity[]> {
    const activeChannels = await channelRepository.find({
      where: {
        active: true,
      },
      relations: ['pages', 'provider']
    })

    return activeChannels
  }

  async listActiveChannelsWithHomePage(): Promise<ChannelEntity[]> {
    const activeChannels = await channelRepository
      .createQueryBuilder('channel')
      .leftJoinAndSelect('channel.pages', 'page', 'page.path = :path', { path: '/' })
      .leftJoinAndSelect('channel.provider', 'provider')
      .where('channel.active = :active', { active: true })
      .getMany()

    return activeChannels
  }

  async listByTheme(theme: string): Promise<ChannelEntity[]> {
    const channelsByTheme = await channelRepository.find({
      where: {
        theme: theme,
      },
      relations: ['provider']
    })

    return channelsByTheme
  }

  async findByLink(link: string): Promise<ChannelEntity | null> {
    const channel = await channelRepository.findOne({
      where: {
        internal_link: link
      }
    })

    return channel
  }

  async findById(id: string): Promise<ChannelEntity | null> {
    const channel = await channelRepository.findOne({
      where: {
        id
      },
      relations: ['pages', 'provider']
    })

    return channel
  }
}
