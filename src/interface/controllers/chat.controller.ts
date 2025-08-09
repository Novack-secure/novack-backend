import {
	Controller,
	Get,
	Post,
	Param,
	Body,
	UseGuards,
	Request,
	NotFoundException,
	BadRequestException,
} from "@nestjs/common";
import { AuthGuard } from "src/application/guards/auth.guard";
import { ChatService } from "src/application/services/chat.service";
import { SupplierBotService } from "src/application/services/supplier-bot.service";
import { CreateRoomDto } from "src/application/dtos/chat/create-room.dto";
import { CreateMessageDto } from "src/application/dtos/chat/create-message.dto";

@Controller("chat")
@UseGuards(AuthGuard)
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly supplierBotService: SupplierBotService,
  ) {}

	@Get("rooms")
	async getUserRooms(@Request() req) {
		const { id, userType } = req.user;
		return this.chatService.getUserRooms(id, userType || "employee");
	}

	@Get("rooms/:id/messages")
	async getRoomMessages(@Param("id") roomId: string, @Request() req) {
		const { id, userType } = req.user;
		return this.chatService.getRoomMessages(roomId, id, userType || "employee");
	}

	@Post("rooms")
	async createRoom(@Body() createRoomDto: CreateRoomDto, @Request() req) {
		return this.chatService.createRoom(createRoomDto);
	}

	@Post("messages")
	async createMessage(
		@Body() createMessageDto: CreateMessageDto,
		@Request() req,
	) {
		return this.chatService.addMessage(createMessageDto, req.user);
	}

  @Post("messages/bot/:supplierId")
  async sendMessageToBot(
    @Param("supplierId") supplierId: string,
    @Body() body: { roomId: string; content: string },
  ) {
    if (!body?.roomId || !body?.content) {
      throw new BadRequestException("roomId y content son requeridos");
    }
    return this.supplierBotService.sendMessageToBot({
      roomId: body.roomId,
      prompt: body.content,
      supplierId,
    });
  }

	@Post("rooms/supplier/:supplierId")
	async createSupplierGroupRoom(@Param("supplierId") supplierId: string) {
		return this.chatService.createSupplierGroupRoom(supplierId);
	}

	@Post("rooms/private")
	async createPrivateRoom(
		@Body()
		body: { targetUserId: string; targetUserType: "employee" | "visitor" },
		@Request() req,
	) {
		const { targetUserId, targetUserType } = body;
		const { id, userType } = req.user;

		if (!targetUserId || !targetUserType) {
			throw new BadRequestException(
				"Se requiere el ID y tipo del usuario destino",
			);
		}

		return this.chatService.getOrCreatePrivateRoom(
			id,
			userType || "employee",
			targetUserId,
			targetUserType,
		);
	}
}
