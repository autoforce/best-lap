import { PageEntity } from "../page";
import { ProviderEntity } from "../provider";

export interface ChannelEntity {
  id?: string;
  name: string;
  domain: string;
  internal_link: string;
  theme: string;
  active: boolean;
  is_reference?: boolean;
  provider_id?: string;
  source?: string;
  provider?: ProviderEntity;
  pages?: PageEntity[];
  created_at?: Date;
  updated_at?: Date;
}
