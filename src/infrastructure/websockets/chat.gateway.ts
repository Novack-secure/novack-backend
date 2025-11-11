import {
	WebSocketGateway,
	WebSocketServer,
	SubscribeMessage,
	OnGatewayConnection,
	OnGatewayDisconnect,
	MessageBody,
	ConnectedSocket,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { UseGuards } from "@nestjs/common";
import { ChatService } from "src/application/services/chat.service";
import { SupplierBotService } from "src/application/services/supplier-bot.service";
import { CreateMessageDto } from "src/application/dtos/chat/create-message.dto";
import { WsJwtGuard } from "../../application/guards/ws-jwt.guard";
import { WsAuthUser } from "../../application/decorators/ws-auth-user.decorator";

interface UserSocket extends Socket {
	user?: any;
}

@WebSocketGateway({
	cors: {
		origin: "*",
		credentials: true,
	},
	namespace: "chat",
	transports: ["websocket", "polling"],
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
	@WebSocketServer()
	server: Server;

	// Mapeo de usuarios conectados a sus sockets
	private connectedClients = new Map<string, string[]>();

	constructor(
		private readonly chatService: ChatService,
		private readonly supplierBotService: SupplierBotService,
	) {}

	async handleConnection(client: UserSocket) {
		try {
			console.log(`🔌 Cliente intentando conectar: ${client.id}`);
			// La autenticación se manejará en cada evento con el guard
		} catch (e) {
			console.error("❌ Error en handleConnection:", e);
			client.disconnect();
		}
	}

	handleDisconnect(client: UserSocket) {
		try {
			// Eliminar cliente de la lista de conexiones
			if (client.user) {
				const userId = client.user.id;
				const userType = client.user.userType;
				const clientId = client.id;

				const clientKey = `${userType}:${userId}`;
				const clientSockets = this.connectedClients.get(clientKey) || [];

				this.connectedClients.set(
					clientKey,
					clientSockets.filter((id) => id !== clientId),
				);

				console.log(`🔌 Cliente desconectado: ${client.id}`);
			}
		} catch (e) {
			console.error("❌ Error en handleDisconnect:", e);
		}
	}

	@UseGuards(WsJwtGuard)
	@SubscribeMessage("registerUser")
	async registerUser(
		@ConnectedSocket() client: UserSocket,
		@WsAuthUser() user: any,
	) {
		try {
			const { id, userType } = user;
			const clientKey = `${userType}:${id}`;

			console.log("✅ registerUser - userId:", id, "userType:", userType);
			console.log("✅ registerUser - user supplier:", user.supplier?.id);

			// Añadir socket a la lista de sockets del usuario
			const clientSockets = this.connectedClients.get(clientKey) || [];
			if (!clientSockets.includes(client.id)) {
				clientSockets.push(client.id);
			}
			this.connectedClients.set(clientKey, clientSockets);

			// Guardar usuario en el socket
			client.user = user;

			// Crear sala de grupo del proveedor si no existe
			let supplierRoom = null;
			if (userType === "employee" && user.supplier?.id) {
				try {
					console.log("✅ registerUser - Creando/verificando sala de grupo del proveedor...");
					supplierRoom = await this.chatService.createSupplierGroupRoom(user.supplier.id);
					console.log("✅ registerUser - Sala de grupo creada/verificada:", supplierRoom.id);
				} catch (error) {
					console.error("❌ Error al crear sala de grupo:", error);
				}
			}

			// Obtener todas las salas del usuario
			console.log("✅ registerUser - Obteniendo salas del usuario...");
			const rooms = await this.chatService.getUserRooms(id, userType);
			console.log("✅ registerUser - Salas encontradas:", rooms.length);

			// Subscribir al cliente a sus salas
			for (const room of rooms) {
				const roomKey = `room:${room.id}`;
				client.join(roomKey);
				console.log("✅ registerUser - Cliente unido a sala:", room.name, `(${roomKey})`);
			}

			// Retornar respuesta de éxito
			return {
				status: "success",
				userId: id,
				userType,
				roomsCount: rooms.length,
			};
		} catch (error) {
			console.error("❌ Error en registerUser:", error);
			return {
				status: "error",
				message: error.message || "Error al registrar usuario",
			};
		}
	}

	@UseGuards(WsJwtGuard)
	@SubscribeMessage("getUserRooms")
	async getUserRooms(
		@ConnectedSocket() client: UserSocket,
		@WsAuthUser() user: any,
	) {
		try {
			const { id, userType } = user;
			console.log("✅ getUserRooms - userId:", id, "userType:", userType);

			// Obtener salas del usuario
			const rooms = await this.chatService.getUserRooms(id, userType);
			console.log("✅ getUserRooms - Salas encontradas:", rooms.length);

			// Mapear salas al formato esperado por el frontend
			const mappedRooms = rooms.map((room) => ({
				id: room.id,
				name: room.name,
				type: room.type,
				supplier_id: room.supplier_id,
				is_active: room.is_active,
				created_at: room.created_at,
				updated_at: room.updated_at,
				employees: room.employees || [],
				visitors: room.visitors || [],
			}));

			return {
				status: "success",
				rooms: mappedRooms,
			};
		} catch (error) {
			console.error("❌ Error en getUserRooms:", error);
			return {
				status: "error",
				message: error.message || "Error al obtener salas",
			};
		}
	}

	@UseGuards(WsJwtGuard)
	@SubscribeMessage("joinRoom")
	async joinRoom(
		@ConnectedSocket() client: UserSocket,
		@MessageBody() data: { roomId: string },
		@WsAuthUser() user: any,
	) {
		try {
			const { roomId } = data;
			const { id, userType } = user;

			console.log("✅ joinRoom - userId:", id, "roomId:", roomId);

			// Verificar acceso a la sala
			await this.chatService.getRoomMessages(roomId, id, userType);

			// Unir al socket a la sala
			const roomKey = `room:${roomId}`;
			client.join(roomKey);
			console.log("✅ joinRoom - Cliente unido a sala:", roomKey);

			return {
				status: "success",
				roomId,
			};
		} catch (error) {
			console.error("❌ Error en joinRoom:", error);
			return {
				status: "error",
				message: error.message || "Error al unirse a la sala",
			};
		}
	}

	@UseGuards(WsJwtGuard)
	@SubscribeMessage("leaveRoom")
	async leaveRoom(
		@ConnectedSocket() client: UserSocket,
		@MessageBody() data: { roomId: string },
	) {
		try {
			const { roomId } = data;

			// Eliminar socket de la sala
			const roomKey = `room:${roomId}`;
			client.leave(roomKey);
			console.log("✅ leaveRoom - Cliente salió de sala:", roomKey);

			return {
				status: "success",
				roomId,
			};
		} catch (error) {
			console.error("❌ Error en leaveRoom:", error);
			return {
				status: "error",
				message: error.message || "Error al salir de la sala",
			};
		}
	}

	@UseGuards(WsJwtGuard)
	@SubscribeMessage("sendMessage")
	async sendMessage(
		@ConnectedSocket() client: UserSocket,
		@MessageBody() data: CreateMessageDto,
		@WsAuthUser() user: any,
	) {
		try {
			console.log("✅ sendMessage - roomId:", data.roomId, "user:", user.id);

			// Guardar mensaje en la base de datos
			const message = await this.chatService.addMessage(data, user);
			console.log("✅ sendMessage - Mensaje guardado:", message.id);

			// Preparar mensaje para enviar al frontend
			const messageData = {
				id: message.id,
				content: message.content,
				roomId: message.chat_room_id,
				senderType: message.sender_employee_id ? "employee" : message.sender_visitor_id ? "visitor" : "bot",
				senderId: message.sender_employee_id || message.sender_visitor_id || "",
				createdAt: message.created_at,
				sender: message.sender_employee || message.sender_visitor,
			};

			// Emitir mensaje a todos los clientes en esa sala
			const roomKey = `room:${data.roomId}`;
			this.server.to(roomKey).emit("newMessage", messageData);
			console.log("✅ sendMessage - Mensaje emitido a sala:", roomKey);

			return {
				status: "success",
				messageId: message.id,
				message: messageData,
			};
		} catch (error) {
			console.error("❌ Error en sendMessage:", error);
			return {
				status: "error",
				message: error.message || "Error al enviar mensaje",
			};
		}
	}

	@UseGuards(WsJwtGuard)
	@SubscribeMessage("sendMessageToBot")
	async sendMessageToBot(
		@ConnectedSocket() client: UserSocket,
		@MessageBody() data: { roomId: string; content: string; supplierId: string },
		@WsAuthUser() user: any,
	) {
		try {
			console.log("✅ sendMessageToBot - roomId:", data.roomId);

			if (!data?.roomId || !data?.content || !data?.supplierId) {
				return {
					status: "error",
					message: "roomId, content y supplierId son requeridos",
				};
			}

			const message = await this.supplierBotService.sendMessageToBot({
				roomId: data.roomId,
				prompt: data.content,
				supplierId: data.supplierId,
			});

			// Preparar mensaje para enviar al frontend
			const messageData = {
				id: message.id,
				content: message.content,
				roomId: message.chat_room_id,
				senderType: "bot",
				senderId: "",
				createdAt: message.created_at,
			};

			// Emitir respuesta del bot
			const roomKey = `room:${data.roomId}`;
			this.server.to(roomKey).emit("newMessage", messageData);

			return {
				status: "success",
				messageId: message.id,
				message: messageData,
			};
		} catch (error) {
			console.error("❌ Error en sendMessageToBot:", error);
			return {
				status: "error",
				message: error.message || "Error al enviar mensaje al bot",
			};
		}
	}

	@UseGuards(WsJwtGuard)
	@SubscribeMessage("createPrivateRoom")
	async createPrivateRoom(
		@ConnectedSocket() client: UserSocket,
		@MessageBody() data: { targetUserId: string; targetUserType: "employee" | "visitor" },
		@WsAuthUser() user: any,
	) {
		try {
			const { targetUserId, targetUserType } = data;
			const { id: userId, userType } = user;

			console.log("✅ createPrivateRoom - from:", userId, "to:", targetUserId);

			// Crear o recuperar sala privada
			const room = await this.chatService.getOrCreatePrivateRoom(
				userId,
				userType,
				targetUserId,
				targetUserType,
			);

			// Unir al socket del usuario a la sala
			const roomKey = `room:${room.id}`;
			client.join(roomKey);
			console.log("✅ createPrivateRoom - Cliente unido a sala:", roomKey);

			// Notificar a otros clientes de los usuarios involucrados
			const targetClientKey = `${targetUserType}:${targetUserId}`;
			const targetSockets = this.connectedClients.get(targetClientKey) || [];

			for (const socketId of targetSockets) {
				const socket = this.server.sockets.sockets.get(socketId);
				if (socket) {
					socket.join(roomKey);
					socket.emit("roomCreated", {
						id: room.id,
						name: room.name,
						type: room.type,
						supplier_id: room.supplier_id,
						is_active: room.is_active,
						created_at: room.created_at,
						updated_at: room.updated_at,
					});
					console.log("✅ createPrivateRoom - Socket objetivo notificado:", socketId);
				}
			}

			return {
				status: "success",
				room: {
					id: room.id,
					name: room.name,
					type: room.type,
					supplier_id: room.supplier_id,
					is_active: room.is_active,
					created_at: room.created_at,
					updated_at: room.updated_at,
				},
			};
		} catch (error) {
			console.error("❌ Error en createPrivateRoom:", error);
			return {
				status: "error",
				message: error.message || "Error al crear sala privada",
			};
		}
	}

	@UseGuards(WsJwtGuard)
	@SubscribeMessage("getRoomMessages")
	async getRoomMessages(
		@ConnectedSocket() client: UserSocket,
		@MessageBody() data: { roomId: string; limit?: number; cursor?: string },
		@WsAuthUser() user: any,
	) {
		try {
			const { roomId, limit = 50, cursor } = data;
			const { id, userType } = user;

			console.log("✅ getRoomMessages - userId:", id, "roomId:", roomId, "limit:", limit, "cursor:", cursor);

			// Obtener mensajes de la sala con paginación
			const result = await this.chatService.getRoomMessagesPaginated(
				roomId,
				id,
				userType,
				limit,
				cursor,
			);

			// Mapear mensajes al formato esperado por el frontend
			const mappedMessages = result.messages.map((msg) => ({
				id: msg.id,
				content: msg.content,
				roomId: msg.chat_room_id,
				senderType: msg.sender_employee_id ? "employee" : msg.sender_visitor_id ? "visitor" : "bot",
				senderId: msg.sender_employee_id || msg.sender_visitor_id || "",
				createdAt: msg.created_at,
				sender: msg.sender_employee || msg.sender_visitor,
			}));

			console.log("✅ getRoomMessages - Mensajes encontrados:", mappedMessages.length, "hasMore:", result.hasMore);

			return {
				status: "success",
				messages: mappedMessages,
				hasMore: result.hasMore,
				nextCursor: result.nextCursor,
			};
		} catch (error) {
			console.error("❌ Error en getRoomMessages:", error);
			return {
				status: "error",
				message: error.message || "Error al obtener mensajes",
			};
		}
	}
}
