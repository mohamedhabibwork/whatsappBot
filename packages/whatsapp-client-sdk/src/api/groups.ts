import { HttpClient } from '../utils/http-client';
import type {
  CreateGroupRequest,
  AddParticipantRequest,
  RemoveParticipantRequest,
  PromoteParticipantRequest,
  DemoteParticipantRequest,
  UpdateGroupInfoRequest,
  SetGroupPictureRequest,
  GroupInfo,
  GroupInviteLink,
  GroupDescriptionRequest,
  GroupSubjectRequest,
  GroupPropertyRequest,
  MessagesAdminsOnlyRequest,
  ChangePrivacyGroupRequest,
} from '../types';

export class GroupsAPI {
  constructor(
    private http: HttpClient,
    private session: string
  ) {}

  /**
   * Create new group
   */
  async createGroup(request: CreateGroupRequest): Promise<GroupInfo> {
    return this.http.post(`/api/${this.session}/create-group`, request);
  }

  /**
   * Get all groups
   */
  async getAllGroups(): Promise<GroupInfo[]> {
    return this.http.get(`/api/${this.session}/all-groups`);
  }

  /**
   * Get group info
   */
  async getGroupInfo(groupId: string): Promise<GroupInfo> {
    return this.http.get(`/api/${this.session}/group-info/${groupId}`);
  }

  /**
   * Get group members
   */
  async getGroupMembers(groupId: string): Promise<{ participants: string[] }> {
    return this.http.get(`/api/${this.session}/group-members/${groupId}`);
  }

  /**
   * Add participant to group
   */
  async addParticipant(request: AddParticipantRequest): Promise<{ success: boolean }> {
    return this.http.post(`/api/${this.session}/group-add-participant`, request);
  }

  /**
   * Remove participant from group
   */
  async removeParticipant(request: RemoveParticipantRequest): Promise<{ success: boolean }> {
    return this.http.post(`/api/${this.session}/group-remove-participant`, request);
  }

  /**
   * Promote participant to admin
   */
  async promoteParticipant(request: PromoteParticipantRequest): Promise<{ success: boolean }> {
    return this.http.post(`/api/${this.session}/group-promote-participant`, request);
  }

  /**
   * Demote admin to participant
   */
  async demoteParticipant(request: DemoteParticipantRequest): Promise<{ success: boolean }> {
    return this.http.post(`/api/${this.session}/group-demote-participant`, request);
  }

  /**
   * Update group info (name, description)
   */
  async updateGroupInfo(request: UpdateGroupInfoRequest): Promise<{ success: boolean }> {
    return this.http.post(`/api/${this.session}/group-update-info`, request);
  }

  /**
   * Set group picture
   */
  async setGroupPicture(request: SetGroupPictureRequest): Promise<{ success: boolean }> {
    return this.http.post(`/api/${this.session}/group-set-picture`, request);
  }

  /**
   * Get group invite link
   */
  async getGroupInviteLink(groupId: string): Promise<GroupInviteLink> {
    return this.http.get(`/api/${this.session}/group-invite-link/${groupId}`);
  }

  /**
   * Revoke group invite link
   */
  async revokeGroupInviteLink(groupId: string): Promise<GroupInviteLink> {
    return this.http.post(`/api/${this.session}/group-revoke-invite-link`, { groupId });
  }

  /**
   * Leave group
   */
  async leaveGroup(groupId: string): Promise<{ success: boolean }> {
    return this.http.post(`/api/${this.session}/group-leave`, { groupId });
  }

  /**
   * Join group via invite code
   */
  async joinGroupViaLink(inviteCode: string): Promise<{ success: boolean; groupId: string }> {
    return this.http.post(`/api/${this.session}/join-code`, { inviteCode });
  }

  /**
   * Get group member IDs
   */
  async getGroupMemberIds(groupId: string): Promise<string[]> {
    return this.http.get(`/api/${this.session}/group-members-ids/${groupId}`);
  }

  /**
   * Get group admins
   */
  async getGroupAdmins(groupId: string): Promise<string[]> {
    return this.http.get(`/api/${this.session}/group-admins/${groupId}`);
  }

  /**
   * Get common groups with contact
   */
  async getCommonGroups(wid: string): Promise<GroupInfo[]> {
    return this.http.get(`/api/${this.session}/common-groups/${wid}`);
  }

  /**
   * Set group description
   */
  async setGroupDescription(request: GroupDescriptionRequest): Promise<{ success: boolean }> {
    return this.http.post(`/api/${this.session}/group-description`, request);
  }

  /**
   * Set group subject (name)
   */
  async setGroupSubject(request: GroupSubjectRequest): Promise<{ success: boolean }> {
    return this.http.post(`/api/${this.session}/group-subject`, request);
  }

  /**
   * Set group property
   */
  async setGroupProperty(request: GroupPropertyRequest): Promise<{ success: boolean }> {
    return this.http.post(`/api/${this.session}/group-property`, request);
  }

  /**
   * Set messages admins only
   */
  async setMessagesAdminsOnly(request: MessagesAdminsOnlyRequest): Promise<{ success: boolean }> {
    return this.http.post(`/api/${this.session}/messages-admins-only`, request);
  }

  /**
   * Change group privacy
   */
  async changePrivacyGroup(request: ChangePrivacyGroupRequest): Promise<{ success: boolean }> {
    return this.http.post(`/api/${this.session}/change-privacy-group`, request);
  }

  /**
   * Get group info from invite link
   */
  async getGroupInfoFromInviteLink(inviteCode: string): Promise<GroupInfo> {
    return this.http.post(`/api/${this.session}/group-info-from-invite-link`, { inviteCode });
  }
}
