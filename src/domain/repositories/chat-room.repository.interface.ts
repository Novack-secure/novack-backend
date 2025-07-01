/**
 * Interfaz para el repositorio de salas de chat
 */

import { ChatRoom, ChatRoomType } from '../entities';

export interface IChatRoomRepository {
  findById(id: string, includeRelations?: boolean): Promise<ChatRoom | null>;
  findAll(): Promise<ChatRoom[]>;
  create(room: Partial<ChatRoom>): Promise<ChatRoom>;
  update(id: string, room: Partial<ChatRoom>): Promise<ChatRoom>;
  delete(id: string): Promise<void>;
  findBySupplier(supplierId: string): Promise<ChatRoom[]>;
  findRoomsByUserId(
    userId: string,
    userType: 'employee' | 'visitor',
  ): Promise<ChatRoom[]>;
  findPrivateRoomBetweenUsers(
    user1Id: string,
    user1Type: 'employee' | 'visitor',
    user2Id: string,
    user2Type: 'employee' | 'visitor',
  ): Promise<ChatRoom | null>;
  findOrCreateByType(type: ChatRoomType, criteria: any): Promise<ChatRoom>;
}
