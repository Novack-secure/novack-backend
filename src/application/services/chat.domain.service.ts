/**
 * Servicio de dominio para chat
 *
 * Contiene la lógica de negocio principal relacionada con salas de chat
 * y mensajes, independiente de la infraestructura.
 */

import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ChatRoom, ChatRoomType } from "../../domain/entities";

export class ChatDomainService {
	/**
	 * Valida si un usuario tiene acceso a una sala de chat
	 */
	validateRoomAccess(
		room: ChatRoom,
		userId: string,
		userType: "employee" | "visitor",
	): boolean {
		if (!room) {
			throw new NotFoundException("La sala de chat no existe");
		}

		if (userType === "visitor") {
			return room.visitors.some((visitor) => visitor.id === userId);
		} else {
			// empleado
			if (room.type === ChatRoomType.SUPPLIER_GROUP) {
				const employee = room.employees.find((emp) => emp.id === userId);
				return employee?.supplier?.id === room.supplier_id;
			} else {
				return room.employees.some((emp) => emp.id === userId);
			}
		}
	}

	/**
	 * Genera un nombre para una sala privada entre dos usuarios
	 */
	generatePrivateRoomName(
		user1: any,
		user2: any,
		user1Type: "employee" | "visitor",
		user2Type: "employee" | "visitor",
	): string {
		const user1Name = this.getUserDisplayName(user1, user1Type);
		const user2Name = this.getUserDisplayName(user2, user2Type);

		return `Chat: ${user1Name} - ${user2Name}`;
	}

	/**
	 * Obtiene el nombre para mostrar de un usuario
	 */
	private getUserDisplayName(
		user: any,
		userType: "employee" | "visitor",
	): string {
		if (userType === "employee") {
			return `${user.first_name} ${user.last_name}`;
		} else {
			return `${user.first_name} ${user.last_name} (Visitante)`;
		}
	}
}
