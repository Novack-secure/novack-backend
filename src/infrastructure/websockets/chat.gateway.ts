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
	},
	namespace: "chat",
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
			// Autenticación manejada por el guard WsJwtGuard
			console.log(`Cliente conectado: ${client.id}`);
		} catch (e) {
			client.disconnect();
		}
	}

	handleDisconnect(client: UserSocket) {
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

			console.log(`Cliente desconectado: ${client.id}`);
		}
	}

	@UseGuards(WsJwtGuard)
	@SubscribeMessage("registerUser")
	async registerUser(
		@ConnectedSocket() client: UserSocket,
		@WsAuthUser() user: any,
	) {
		const { id, userType } = user;
		const clientKey = `${userType}:${id}`;

		// Añadir socket a la lista de sockets del usuario
		const clientSockets = this.connectedClients.get(clientKey) || [];
		clientSockets.push(client.id);
		this.connectedClients.set(clientKey, clientSockets);

		client.user = user;

		// Subscribir al cliente a sus salas
		const rooms = await this.chatService.getUserRooms(id, userType);
		rooms.forEach((room) => {
			client.join(`room:${room.id}`);
		});

		return {
			status: "success",
			userId: id,
			userType,
		};
	}

	@UseGuards(WsJwtGuard)
	@SubscribeMessage("joinRoom")
	async joinRoom(
		@ConnectedSocket() client: UserSocket,
		@MessageBody() data: { roomId: string },
		@WsAuthUser() user: any,
	) {
		const { roomId } = data;
		const { id, userType } = user;

		try {
			// Verificar acceso a la sala
			await this.chatService.getRoomMessages(roomId, id, userType);

			// Unir al socket a la sala
			client.join(`room:${roomId}`);

			return {
				status: "success",
				roomId,
			};
		} catch (e) {
			return {
				status: "error",
				message: e.message,
			};
		}
	}

	@UseGuards(WsJwtGuard)
	@SubscribeMessage("leaveRoom")
	async leaveRoom(
		@ConnectedSocket() client: UserSocket,
		@MessageBody() data: { roomId: string },
	) {
		const { roomId } = data;

		// Eliminar socket de la sala
		client.leave(`room:${roomId}`);

		return {
			status: "success",
			roomId,
		};
	}

	@UseGuards(WsJwtGuard)
	@SubscribeMessage("sendMessage")
	async sendMessage(
		@ConnectedSocket() client: UserSocket,
		@MessageBody() data: CreateMessageDto,
		@WsAuthUser() user: any,
	) {
		try {
			// Guardar mensaje en la base de datos
			const message = await this.chatService.addMessage(data, user);

			// Emitir mensaje a todos los clientes en esa sala
			this.server.to(`room:${data.roomId}`).emit("newMessage", message);

			return {
				status: "success",
				messageId: message.id,
			};
		} catch (e) {
			return {
				status: "error",
				message: e.message,
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
      if (!data?.roomId || !data?.content || !data?.supplierId) {
        return { status: "error", message: "roomId, content y supplierId son requeridos" };
      }
      const message = await this.supplierBotService.sendMessageToBot({
        roomId: data.roomId,
        prompt: data.content,
        supplierId: data.supplierId,
      });
      // Emitir respuesta del bot
      this.server.to(`room:${data.roomId}`).emit("newMessage", message);
      return { status: "success", messageId: message.id };
    } catch (e: any) {
      return { status: "error", message: e.message };
    }
  }

	@UseGuards(WsJwtGuard)
	@SubscribeMessage("createPrivateRoom")
	async createPrivateRoom(
		@ConnectedSocket() client: UserSocket,
		@MessageBody()
		data: { targetUserId: string; targetUserType: "employee" | "visitor" },
		@WsAuthUser() user: any,
	) {
		try {
			const { targetUserId, targetUserType } = data;
			const { id: userId, userType } = user;

			// Crear o recuperar sala privada
			const room = await this.chatService.getOrCreatePrivateRoom(
				userId,
				userType,
				targetUserId,
				targetUserType,
			);

			// Unir al socket del usuario a la sala
			client.join(`room:${room.id}`);

			// Notificar a otros clientes de los usuarios involucrados
			const targetClientKey = `${targetUserType}:${targetUserId}`;
			const targetSockets = this.connectedClients.get(targetClientKey) || [];

			targetSockets.forEach((socketId) => {
				const socket = this.server.sockets.sockets.get(socketId);
				if (socket) {
					socket.join(`room:${room.id}`);
					socket.emit("roomCreated", room);
				}
			});

			return {
				status: "success",
				room,
			};
		} catch (e) {
			return {
				status: "error",
				message: e.message,
			};
		}
	}

	@UseGuards(WsJwtGuard)
	@SubscribeMessage("getRoomMessages")
	async getRoomMessages(
		@MessageBody() data: { roomId: string },
		@WsAuthUser() user: any,
	) {
		try {
			const { roomId } = data;
			const { id, userType } = user;

			// Obtener mensajes de la sala
			const messages = await this.chatService.getRoomMessages(
				roomId,
				id,
				userType,
			);

			return {
				status: "success",
				messages,
			};
		} catch (e) {
			return {
				status: "error",
				message: e.message,
			};
		}
	}

	@UseGuards(WsJwtGuard)
	@SubscribeMessage("getUserRooms")
	async getUserRooms(@WsAuthUser() user: any) {
		try {
			const { id, userType } = user;

			// Obtener salas del usuario
			const rooms = await this.chatService.getUserRooms(id, userType);

			return {
				status: "success",
				rooms,
			};
		} catch (e) {
			return {
				status: "error",
				message: e.message,
			};
		}
	}
}
