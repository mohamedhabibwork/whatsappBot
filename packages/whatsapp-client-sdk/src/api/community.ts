import { HttpClient } from '../utils/http-client';
import type {
  CreateCommunityRequest,
  DeactivateCommunityRequest,
  AddCommunitySubgroupRequest,
  RemoveCommunitySubgroupRequest,
  PromoteCommunityParticipantRequest,
  DemoteCommunityParticipantRequest,
  CommunityInfo,
  CommunityParticipant,
} from '../types';

export class CommunityAPI {
  constructor(
    private http: HttpClient,
    private session: string
  ) {}

  /**
   * Create a new community
   */
  async createCommunity(request: CreateCommunityRequest): Promise<CommunityInfo> {
    return this.http.post(`/api/${this.session}/create-community`, request);
  }

  /**
   * Deactivate a community
   */
  async deactivateCommunity(request: DeactivateCommunityRequest): Promise<{ success: boolean }> {
    return this.http.post(`/api/${this.session}/deactivate-community`, request);
  }

  /**
   * Add subgroups to a community
   */
  async addCommunitySubgroup(request: AddCommunitySubgroupRequest): Promise<{ success: boolean }> {
    return this.http.post(`/api/${this.session}/add-community-subgroup`, request);
  }

  /**
   * Remove subgroups from a community
   */
  async removeCommunitySubgroup(request: RemoveCommunitySubgroupRequest): Promise<{ success: boolean }> {
    return this.http.post(`/api/${this.session}/remove-community-subgroup`, request);
  }

  /**
   * Promote community participants to admin
   */
  async promoteCommunityParticipant(request: PromoteCommunityParticipantRequest): Promise<{ success: boolean }> {
    return this.http.post(`/api/${this.session}/promote-community-participant`, request);
  }

  /**
   * Demote community admins to participants
   */
  async demoteCommunityParticipant(request: DemoteCommunityParticipantRequest): Promise<{ success: boolean }> {
    return this.http.post(`/api/${this.session}/demote-community-participant`, request);
  }

  /**
   * Get community participants
   */
  async getCommunityParticipants(communityId: string): Promise<CommunityParticipant[]> {
    return this.http.get(`/api/${this.session}/community-participants/${communityId}`);
  }
}
