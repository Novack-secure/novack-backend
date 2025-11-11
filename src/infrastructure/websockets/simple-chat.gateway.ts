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
import { Injectable, Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Employee } from "src/domain/entities/employee.entity";
import { Visitor } from "src/domain/entities/visitor.entity";
import { ChatService } from "src/application/services/chat.service";

interface AuthenticatedSocket extends Socket {
	userId?: string;
	userType?: string;
	user?: any;
}

@Injectable()
@WebSocketGateway({
	cors: {
		origin: "*",
		credentials: true,
	},
	namespace: "/chat",
})
export class SimpleChatGateway
	implements OnGatewayConnection, OnGatewayDisconnect
{
	@WebSocketServer()
	server: Server;

	private readonly logger = new Logger(SimpleChatGateway.name);
	private connectedClients = new Map<string, AuthenticatedSocket>();

	constructor(
		private readonly jwtService: JwtService,
		private readonly chatService: ChatService,
		@InjectRepository(Employee)
		private readonly employeeRepository: Repository<Employee>,
		@InjectRepository(Visitor)
		private readonly visitorRepository: Repository<Visitor>,
	) {}

	async handleConnection(client: AuthenticatedSocket) {
		this.logger.log(`🔌 Cliente intentando conectar: ${client.id}`);

		try {
			// Extraer token del handshake
			const token =
				client.handshake.auth?.token ||
				client.handshake.query?.token ||
				client.handshake.headers?.authorization?.split(" ")[1];

			if (!token) {
				this.logger.error("❌ No se proporcionó token");
				client.disconnect();
				return;
			}

			// Verificar el token
			const payload = await this.jwtService.verifyAsync(token as string);

			// Cargar información del usuario
			const userType = payload.userType || "employee";
			let user;

			if (userType === "employee") {
				user = await this.employeeRepository.findOne({
					where: { id: payload.sub },
					relations: ["supplier"],
				});
			} else {
				user = await this.visitorRepository.findOne({
					where: { id: payload.sub },
					relations: ["supplier"],
				});
			}

			if (!user) {
				this.logger.error("❌ Usuario no encontrado");
				client.disconnect();
				return;
			}

			// Guardar información del usuario en el socket
			client.userId = payload.sub;
			client.userType = userType;
			client.user = { id: payload.sub, userType, ...user };

			// Guardar conexión
			this.connectedClients.set(client.id, client);

			this.logger.log(
				`✅ Cliente autenticado: ${client.id} - User: ${payload.sub} (${userType})`,
			);

			// Crear sala de grupo del supplier si es empleado
			if (userType === "employee" && user.supplier?.id) {
				try {
					await this.chatService.createSupplierGroupRoom(user.supplier.id);
					this.logger.log(
						`✅ Sala de grupo verificada para supplier: ${user.supplier.id}`,
					);
				} catch (error) {
					this.logger.error("❌ Error al crear sala de grupo:", error.message);
				}
			}

			// Unir al usuario a sus salas automáticamente
			try {
				const rooms = await this.chatService.getUserRooms(
					payload.sub,
					userType as "employee" | "visitor",
				);
				for (const room of rooms) {
					client.join(`room:${room.id}`);
					this.logger.log(
						`✅ Cliente ${client.id} unido a sala: ${room.name} (room:${room.id})`,
					);
				}
			} catch (error) {
				this.logger.error("❌ Error al unir a salas:", error.message);
			}

			// Enviar confirmación de conexión
			client.emit("connected", {
				success: true,
				userId: payload.sub,
				userType,
			});
		} catch (error) {
			this.logger.error(`❌ Error en autenticación: ${error.message}`);
			client.emit("error", { message: "Error de autenticación" });
			client.disconnect();
		}
	}

	handleDisconnect(client: AuthenticatedSocket) {
		this.logger.log(`🔌 Cliente desconectado: ${client.id}`);
		this.connectedClients.delete(client.id);
	}

	@SubscribeMessage("getRooms")
	async handleGetRooms(
		@ConnectedSocket() client: AuthenticatedSocket,
	): Promise<any> {
		try {
			if (!client.userId) {
				return { success: false, error: "No autenticado" };
			}

			this.logger.log(`📡 getRooms - userId: ${client.userId}`);

			const rooms = await this.chatService.getUserRooms(
				client.userId,
				(client.userType as "employee" | "visitor") || "employee",
			);

			this.logger.log(`✅ getRooms - Salas encontradas: ${rooms.length}`);

			return {
				success: true,
				data: rooms,
			};
		} catch (error) {
			this.logger.error(`❌ getRooms error: ${error.message}`);
			return { success: false, error: error.message };
		}
	}

	@SubscribeMessage("getMessages")
	async handleGetMessages(
		@ConnectedSocket() client: AuthenticatedSocket,
		@MessageBody() data: { roomId: string },
	): Promise<any> {
		try {
			if (!client.userId) {
				return { success: false, error: "No autenticado" };
			}

			this.logger.log(
				`📡 getMessages - userId: ${client.userId}, roomId: ${data.roomId}`,
			);

			const messages = await this.chatService.getRoomMessages(
				data.roomId,
				client.userId,
				(client.userType as "employee" | "visitor") || "employee",
			);

			this.logger.log(`✅ getMessages - Mensajes encontrados: ${messages.length}`);

			return {
				success: true,
				data: messages,
			};
		} catch (error) {
			this.logger.error(`❌ getMessages error: ${error.message}`);
			return { success: false, error: error.message };
		}
	}

	@SubscribeMessage("getRoomMessages")
	async handleGetRoomMessages(
		@ConnectedSocket() client: AuthenticatedSocket,
		@MessageBody() data: { roomId: string; limit?: number; cursor?: string },
	): Promise<any> {
		try {
			if (!client.userId) {
				return { status: "error", error: "No autenticado" };
			}

			const { roomId, limit = 50, cursor } = data;

			this.logger.log(
				`📡 getRoomMessages - userId: ${client.userId}, roomId: ${roomId}, limit: ${limit}, cursor: ${cursor}`,
			);

			// Get paginated messages
			const result = await this.chatService.getRoomMessagesPaginated(
				roomId,
				client.userId,
				(client.userType as "employee" | "visitor") || "employee",
				limit,
				cursor,
			);

			this.logger.log(
				`✅ getRoomMessages - Mensajes encontrados: ${result.messages.length}, hasMore: ${result.hasMore}`,
			);

			// Map messages to frontend format
			const mappedMessages = result.messages.map((msg) => ({
				id: msg.id,
				content: msg.content,
				roomId: msg.chat_room_id,
				senderType: msg.sender_employee_id
					? "employee"
					: msg.sender_visitor_id
						? "visitor"
						: "bot",
				senderId: msg.sender_employee_id || msg.sender_visitor_id || "",
				createdAt: msg.created_at,
				sender: msg.sender_employee || msg.sender_visitor,
			}));

			return {
				status: "success",
				messages: mappedMessages,
				hasMore: result.hasMore,
				nextCursor: result.nextCursor,
			};
		} catch (error) {
			this.logger.error(`❌ getRoomMessages error: ${error.message}`);
			return {
				status: "error",
				error: error.message || "Error al obtener mensajes",
			};
		}
	}

	@SubscribeMessage("sendMessage")
	async handleSendMessage(
		@ConnectedSocket() client: AuthenticatedSocket,
		@MessageBody() data: { roomId: string; content: string },
	): Promise<any> {
		try {
			if (!client.userId) {
				return { success: false, error: "No autenticado" };
			}

			this.logger.log(
				`📡 sendMessage - userId: ${client.userId}, roomId: ${data.roomId}`,
			);

			// Guardar mensaje
			const message = await this.chatService.addMessage(
				{
					roomId: data.roomId,
					content: data.content,
					senderType: client.userType as any,
				},
				client.user,
			);

			this.logger.log(`✅ sendMessage - Mensaje guardado: ${message.id}`);

			// Broadcast a todos los clientes en la sala
			this.server.to(`room:${data.roomId}`).emit("newMessage", {
				id: message.id,
				content: message.content,
				roomId: data.roomId,
				senderId: client.userId,
				senderType: client.userType,
				createdAt: message.created_at,
				sender: {
					id: client.userId,
					first_name: client.user.first_name,
					last_name: client.user.last_name,
					email: client.user.email,
				},
			});

			return {
				success: true,
				data: message,
			};
		} catch (error) {
			this.logger.error(`❌ sendMessage error: ${error.message}`);
			return { success: false, error: error.message };
		}
	}

	@SubscribeMessage("joinRoom")
	async handleJoinRoom(
		@ConnectedSocket() client: AuthenticatedSocket,
		@MessageBody() data: { roomId: string },
	): Promise<any> {
		try {
			if (!client.userId) {
				return { success: false, error: "No autenticado" };
			}

			this.logger.log(
				`📡 joinRoom - userId: ${client.userId}, roomId: ${data.roomId}`,
			);

			// Verificar acceso a la sala
			await this.chatService.getRoomMessages(
				data.roomId,
				client.userId,
				(client.userType as "employee" | "visitor") || "employee",
			);

			// Unir al socket a la sala
			client.join(`room:${data.roomId}`);

			this.logger.log(`✅ joinRoom - Cliente unido a room:${data.roomId}`);

			return {
				success: true,
				roomId: data.roomId,
			};
		} catch (error) {
			this.logger.error(`❌ joinRoom error: ${error.message}`);
			return { success: false, error: error.message };
		}
	}

	@SubscribeMessage("leaveRoom")
	async handleLeaveRoom(
		@ConnectedSocket() client: AuthenticatedSocket,
		@MessageBody() data: { roomId: string },
	): Promise<any> {
		try {
			this.logger.log(
				`📡 leaveRoom - userId: ${client.userId}, roomId: ${data.roomId}`,
			);

			client.leave(`room:${data.roomId}`);

			this.logger.log(`✅ leaveRoom - Cliente salió de room:${data.roomId}`);

			return {
				success: true,
				roomId: data.roomId,
			};
		} catch (error) {
			this.logger.error(`❌ leaveRoom error: ${error.message}`);
			return { success: false, error: error.message };
		}
	}

	@SubscribeMessage("createPrivateRoom")
	async handleCreatePrivateRoom(
		@ConnectedSocket() client: AuthenticatedSocket,
		@MessageBody() data: { targetUserId: string; targetUserType: string },
	): Promise<any> {
		try {
			if (!client.userId) {
				return { success: false, error: "No autenticado" };
			}

			this.logger.log(
				`📡 createPrivateRoom - from: ${client.userId}, to: ${data.targetUserId}`,
			);

			const room = await this.chatService.getOrCreatePrivateRoom(
				client.userId,
				client.userType as any,
				data.targetUserId,
				data.targetUserType as any,
			);

			// Unir ambos usuarios a la sala
			client.join(`room:${room.id}`);

			// Buscar socket del otro usuario y unirlo también
			for (const [socketId, socket] of this.connectedClients.entries()) {
				if (socket.userId === data.targetUserId) {
					socket.join(`room:${room.id}`);
					socket.emit("roomCreated", room);
				}
			}

			this.logger.log(`✅ createPrivateRoom - Sala creada: ${room.id}`);

			return {
				success: true,
				data: room,
			};
		} catch (error) {
			this.logger.error(`❌ createPrivateRoom error: ${error.message}`);
			return { success: false, error: error.message };
		}
	}
}
