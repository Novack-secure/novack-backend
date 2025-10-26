import {
	Injectable,
	BadRequestException,
	NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import {
	ChatRoom,
	ChatMessage,
	Employee,
	Visitor,
	Supplier,
	ChatRoomType,
} from "src/domain/entities";
import { CreateMessageDto } from "../dtos/chat/create-message.dto";
import { CreateRoomDto } from "../dtos/chat/create-room.dto";
import { v4 as uuidv4 } from "uuid";

@Injectable()
export class ChatService {
	constructor(
		@InjectRepository(ChatRoom)
		private readonly chatRoomRepository: Repository<ChatRoom>,
		@InjectRepository(ChatMessage)
		private readonly chatMessageRepository: Repository<ChatMessage>,
		@InjectRepository(Employee)
		private readonly employeeRepository: Repository<Employee>,
		@InjectRepository(Visitor)
		private readonly visitorRepository: Repository<Visitor>,
		@InjectRepository(Supplier)
		private readonly supplierRepository: Repository<Supplier>,
	) {}

	// Crear una sala de chat
	async createRoom(createRoomDto: CreateRoomDto): Promise<ChatRoom> {
		const { name, type, supplierId, employeeIds, visitorIds } = createRoomDto;

		// Verificar que el proveedor existe
		if (supplierId) {
			const supplier = await this.supplierRepository.findOne({
				where: { id: supplierId },
			});
			if (!supplier) {
				throw new BadRequestException("El proveedor especificado no existe");
			}
		}

		// Crear la sala
		const room = this.chatRoomRepository.create({
			name,
			type,
			supplier_id: supplierId,
			employees: [],
			visitors: [],
		});

		// Verificar y añadir empleados
		if (employeeIds && employeeIds.length > 0) {
			const employees = await this.employeeRepository.findBy({
				id: In(employeeIds),
			});
			if (employees.length !== employeeIds.length) {
				throw new BadRequestException(
					"Algunos empleados especificados no existen",
				);
			}
			room.employees = employees;
		}

		// Verificar y añadir visitantes para chats con visitantes
		if (visitorIds && visitorIds.length > 0) {
			const visitors = await this.visitorRepository.findBy({
				id: In(visitorIds),
			});
			if (visitors.length !== visitorIds.length) {
				throw new BadRequestException(
					"Algunos visitantes especificados no existen",
				);
			}
			room.visitors = visitors;
		}

		// Guardar la sala
		return this.chatRoomRepository.save(room);
	}

	// Crear un grupo general para un proveedor
	async createSupplierGroupRoom(supplierId: string): Promise<ChatRoom> {
		const supplier = await this.supplierRepository.findOne({
			where: { id: supplierId },
			relations: ["employees"],
		});

		if (!supplier) {
			throw new BadRequestException("El proveedor especificado no existe");
		}

		// Verificar si ya existe un grupo general para este proveedor
		const existingRoom = await this.chatRoomRepository.findOne({
			where: {
				supplier_id: supplierId,
				type: ChatRoomType.SUPPLIER_GROUP,
			},
		});

		if (existingRoom) {
			return existingRoom;
		}

		// Crear la sala y asociar a todos los empleados del proveedor
		const room = this.chatRoomRepository.create({
			name: `Grupo ${supplier.supplier_name}`,
			type: ChatRoomType.SUPPLIER_GROUP,
			supplier_id: supplierId,
			employees: supplier.employees || [],
			visitors: [],
		});

		return this.chatRoomRepository.save(room);
	}

	// Añadir un mensaje a una sala
	async addMessage(
		createMessageDto: CreateMessageDto,
		user: any,
	): Promise<ChatMessage> {
		const { content, roomId, senderType } = createMessageDto;
		const senderId = createMessageDto.senderId || user.id;

		// Verificar que la sala existe
		const room = await this.chatRoomRepository.findOne({
			where: { id: roomId },
			relations: ["employees", "visitors"],
		});

		if (!room) {
			throw new NotFoundException("La sala de chat no existe");
		}

		// Verificar que el remitente (employee o visitor) existe y tiene acceso a la sala
		let senderEmployee = null;
		let senderVisitor = null;

		if (
			senderType === "visitor" ||
			(!senderType && room.type === ChatRoomType.EMPLOYEE_TO_VISITOR)
		) {
			senderVisitor = await this.visitorRepository.findOne({
				where: { id: senderId },
			});
			if (!senderVisitor) {
				throw new BadRequestException("El visitante remitente no existe");
			}

			// Verificar que el visitante tiene acceso a la sala
			const hasAccess = room.visitors.some(
				(visitor) => visitor.id === senderId,
			);
			if (!hasAccess) {
				throw new BadRequestException(
					"El visitante no tiene acceso a esta sala de chat",
				);
			}
		} else {
			// Por defecto asumimos que es un empleado
			senderEmployee = await this.employeeRepository.findOne({
				where: { id: senderId },
				relations: ["supplier"],
			});
			if (!senderEmployee) {
				throw new BadRequestException("El empleado remitente no existe");
			}

			// Verificar que el empleado tiene acceso a la sala
			const hasAccess = room.employees.some((emp) => emp.id === senderId);
			if (!hasAccess && room.type !== ChatRoomType.SUPPLIER_GROUP) {
				throw new BadRequestException(
					"El empleado no tiene acceso a esta sala de chat",
				);
			}

			// Para salas de grupo de proveedor, verificar que el empleado pertenece al proveedor
			if (
				room.type === ChatRoomType.SUPPLIER_GROUP &&
				senderEmployee.supplier?.id !== room.supplier_id
			) {
				throw new BadRequestException(
					"El empleado no pertenece al proveedor de esta sala de chat",
				);
			}
		}

		// Crear y guardar el mensaje
		const message = this.chatMessageRepository.create({
			content,
			chat_room_id: roomId,
			sender_employee_id: senderEmployee?.id,
			sender_visitor_id: senderVisitor?.id,
			is_read: false,
		});

		return this.chatMessageRepository.save(message);
	}

	// Obtener mensajes de una sala
	async getRoomMessages(
		roomId: string,
		userId: string,
		userType: "employee" | "visitor",
	): Promise<ChatMessage[]> {
		// Verificar que la sala existe
		const room = await this.chatRoomRepository.findOne({
			where: { id: roomId },
			relations: ["employees", "visitors"],
		});

		if (!room) {
			throw new NotFoundException("La sala de chat no existe");
		}

		// Verificar acceso del usuario a la sala
		if (userType === "visitor") {
			const hasAccess = room.visitors.some((visitor) => visitor.id === userId);
			if (!hasAccess) {
				throw new BadRequestException(
					"El visitante no tiene acceso a esta sala de chat",
				);
			}
		} else {
			// empleado
			// Para salas de tipo grupo, verificar pertenencia al proveedor
			if (room.type === ChatRoomType.SUPPLIER_GROUP) {
				const employee = await this.employeeRepository.findOne({
					where: { id: userId },
					relations: ["supplier"],
				});
				if (!employee || employee.supplier?.id !== room.supplier_id) {
					throw new BadRequestException(
						"El empleado no pertenece al proveedor de esta sala de chat",
					);
				}
			} else {
				// Para otros tipos de salas, verificar pertenencia directa
				const hasAccess = room.employees.some((emp) => emp.id === userId);
				if (!hasAccess) {
					throw new BadRequestException(
						"El empleado no tiene acceso a esta sala de chat",
					);
				}
			}
		}

		// Obtener los mensajes
		const messages = await this.chatMessageRepository.find({
			where: { chat_room_id: roomId },
			order: { created_at: "ASC" },
			relations: ["sender_employee", "sender_visitor"],
		});

		// Marcar mensajes como leídos si no son del usuario actual
		const unreadMessages = messages.filter((message) => {
			if (userType === "employee") {
				return !message.is_read && message.sender_employee_id !== userId;
			} else {
				return !message.is_read && message.sender_visitor_id !== userId;
			}
		});

		if (unreadMessages.length > 0) {
			await Promise.all(
				unreadMessages.map((message) => {
					message.is_read = true;
					return this.chatMessageRepository.save(message);
				}),
			);
		}

		return messages;
	}

	// Obtener salas de chat de un usuario
	async getUserRooms(
		userId: string,
		userType: "employee" | "visitor",
	): Promise<ChatRoom[]> {
		console.log("✅ ChatService.getUserRooms - userId:", userId, "userType:", userType);

		try {
			if (userType === "employee") {
				// Verificar si el empleado existe
				const employee = await this.employeeRepository.findOne({
					where: { id: userId },
					relations: ["supplier"],
				});

				console.log("✅ ChatService.getUserRooms - Employee found:", !!employee);
				console.log("✅ ChatService.getUserRooms - Employee supplier:", employee?.supplier?.id);

				if (!employee) {
					throw new BadRequestException("El empleado no existe");
				}

				// Buscar salas donde el empleado es miembro directamente
				const directRooms = await this.chatRoomRepository
					.createQueryBuilder("room")
					.leftJoinAndSelect("room.employees", "employee")
					.leftJoinAndSelect("room.visitors", "visitor")
					.where("employee.id = :userId", { userId })
					.andWhere("room.is_active = :isActive", { isActive: true })
					.orderBy("room.updated_at", "DESC")
					.getMany();

				console.log("✅ ChatService.getUserRooms - Direct rooms found:", directRooms.length);

				// Si el empleado tiene proveedor, también buscar la sala de grupo del proveedor
				if (employee.supplier) {
					console.log("✅ ChatService.getUserRooms - Looking for supplier room for:", employee.supplier.id);

					const supplierRoom = await this.chatRoomRepository.findOne({
						where: {
							supplier_id: employee.supplier.id,
							type: ChatRoomType.SUPPLIER_GROUP,
							is_active: true,
						},
						relations: ["employees", "visitors"],
					});

					console.log("✅ ChatService.getUserRooms - Supplier room found:", !!supplierRoom);
					if (supplierRoom) {
						console.log("✅ ChatService.getUserRooms - Supplier room details:", {
							id: supplierRoom.id,
							name: supplierRoom.name,
							type: supplierRoom.type
						});
					}

					if (
						supplierRoom &&
						!directRooms.some((room) => room.id === supplierRoom.id)
					) {
						directRooms.push(supplierRoom);
						console.log("✅ ChatService.getUserRooms - Added supplier room to direct rooms");
					}
				}

				console.log("✅ ChatService.getUserRooms - Total rooms to return:", directRooms.length);
				return directRooms;
			} else {
				// Para visitantes, solo buscar salas donde son miembros directamente
				const rooms = await this.chatRoomRepository
					.createQueryBuilder("room")
					.leftJoinAndSelect("room.employees", "employee")
					.leftJoinAndSelect("room.visitors", "visitor")
					.where("visitor.id = :userId", { userId })
					.andWhere("room.is_active = :isActive", { isActive: true })
					.orderBy("room.updated_at", "DESC")
					.getMany();

				console.log("✅ ChatService.getUserRooms - Visitor rooms found:", rooms.length);
				return rooms;
			}
		} catch (error) {
			console.error("❌ ChatService.getUserRooms - Error:", error);
			throw error;
		}
	}

	// Crear o recuperar una sala de chat privada entre dos usuarios
	async getOrCreatePrivateRoom(
		user1Id: string,
		user1Type: "employee" | "visitor",
		user2Id: string,
		user2Type: "employee" | "visitor",
	): Promise<ChatRoom> {
		// Determinar el tipo de sala
		let roomType = ChatRoomType.EMPLOYEE_TO_EMPLOYEE;
		if (
			user1Type !== user2Type ||
			user1Type === "visitor" ||
			user2Type === "visitor"
		) {
			roomType = ChatRoomType.EMPLOYEE_TO_VISITOR;
		}

		// Verificar si los usuarios existen
		let user1, user2;

		if (user1Type === "employee") {
			user1 = await this.employeeRepository.findOne({
				where: { id: user1Id },
				relations: ["supplier"],
			});
			if (!user1) throw new BadRequestException("El primer empleado no existe");
		} else {
			user1 = await this.visitorRepository.findOne({ where: { id: user1Id } });
			if (!user1)
				throw new BadRequestException("El primer visitante no existe");
		}

		if (user2Type === "employee") {
			user2 = await this.employeeRepository.findOne({
				where: { id: user2Id },
				relations: ["supplier"],
			});
			if (!user2)
				throw new BadRequestException("El segundo empleado no existe");
		} else {
			user2 = await this.visitorRepository.findOne({ where: { id: user2Id } });
			if (!user2)
				throw new BadRequestException("El segundo visitante no existe");
		}

		// Buscar si ya existe una sala privada entre estos usuarios
		const existingRoom = await this.findPrivateRoomBetweenUsers(
			user1Id,
			user1Type,
			user2Id,
			user2Type,
		);

		if (existingRoom) {
			return existingRoom;
		}

		// Crear una nueva sala
		const roomName = this.generatePrivateRoomName(
			user1,
			user2,
			user1Type,
			user2Type,
		);

		const newRoom = this.chatRoomRepository.create({
			name: roomName,
			type: roomType,
			employees: [],
			visitors: [],
		});

		// Añadir usuarios a la sala según su tipo
		if (user1Type === "employee") {
			newRoom.employees.push(user1 as Employee);
		} else {
			newRoom.visitors.push(user1 as Visitor);
		}

		if (user2Type === "employee") {
			newRoom.employees.push(user2 as Employee);
		} else {
			newRoom.visitors.push(user2 as Visitor);
		}

		// Si es una sala empleado-empleado del mismo proveedor, establecer el proveedor
		if (
			roomType === ChatRoomType.EMPLOYEE_TO_EMPLOYEE &&
			user1Type === "employee" &&
			user2Type === "employee" &&
			(user1 as Employee).supplier?.id &&
			(user1 as Employee).supplier?.id === (user2 as Employee).supplier?.id
		) {
			newRoom.supplier_id = (user1 as Employee).supplier.id;
		}

		return this.chatRoomRepository.save(newRoom);
	}

	// Método auxiliar para buscar una sala privada entre dos usuarios
	private async findPrivateRoomBetweenUsers(
		user1Id: string,
		user1Type: "employee" | "visitor",
		user2Id: string,
		user2Type: "employee" | "visitor",
	): Promise<ChatRoom | null> {
		// Determinar el tipo de sala
		if (user1Type === "employee" && user2Type === "employee") {
			// Buscar salas con exactamente estos dos empleados
			const rooms = await this.chatRoomRepository
				.createQueryBuilder("room")
				.leftJoinAndSelect("room.employees", "employee")
				.leftJoinAndSelect("room.visitors", "visitor")
				.where("room.type = :roomType", {
					roomType: ChatRoomType.EMPLOYEE_TO_EMPLOYEE,
				})
				.getMany();

			// Filtrar manualmente para encontrar la sala con exactamente estos dos usuarios
			for (const room of rooms) {
				if (
					room.employees.length === 2 &&
					room.employees.some((emp) => emp.id === user1Id) &&
					room.employees.some((emp) => emp.id === user2Id)
				) {
					return room;
				}
			}
			return null;
		} else if (user1Type === "visitor" && user2Type === "visitor") {
			// Buscar salas con exactamente estos dos visitantes
			const rooms = await this.chatRoomRepository
				.createQueryBuilder("room")
				.leftJoinAndSelect("room.employees", "employee")
				.leftJoinAndSelect("room.visitors", "visitor")
				.where("room.type = :roomType", {
					roomType: ChatRoomType.EMPLOYEE_TO_VISITOR,
				})
				.getMany();

			// Filtrar manualmente para encontrar la sala con exactamente estos dos usuarios
			for (const room of rooms) {
				if (
					room.visitors.length === 2 &&
					room.visitors.some((vis) => vis.id === user1Id) &&
					room.visitors.some((vis) => vis.id === user2Id)
				) {
					return room;
				}
			}
			return null;
		} else {
			// Caso de empleado-visitante
			const employeeId = user1Type === "employee" ? user1Id : user2Id;
			const visitorId = user1Type === "visitor" ? user1Id : user2Id;

			const rooms = await this.chatRoomRepository
				.createQueryBuilder("room")
				.leftJoinAndSelect("room.employees", "employee")
				.leftJoinAndSelect("room.visitors", "visitor")
				.where("room.type = :roomType", {
					roomType: ChatRoomType.EMPLOYEE_TO_VISITOR,
				})
				.andWhere("employee.id = :employeeId", { employeeId })
				.andWhere("visitor.id = :visitorId", { visitorId })
				.getMany();

			// Verificar que solo haya estos dos usuarios en la sala
			for (const room of rooms) {
				if (
					room.employees.length === 1 &&
					room.visitors.length === 1
				) {
					return room;
				}
			}
			return null;
		}
	}

	// Método auxiliar para generar un nombre para una sala de chat privada
	private generatePrivateRoomName(
		user1: any,
		user2: any,
		user1Type: "employee" | "visitor",
		user2Type: "employee" | "visitor",
	): string {
		let user1Name = "Usuario Desconocido";
		let user2Name = "Usuario Desconocido";

		console.log("🔍 generatePrivateRoomName - user1Type:", user1Type, "user1:", JSON.stringify(user1));
		console.log("🔍 generatePrivateRoomName - user2Type:", user2Type, "user2:", JSON.stringify(user2));

		if (user1Type === "employee") {
			user1Name = user1?.first_name && user1?.last_name
				? `${user1.first_name} ${user1.last_name}`.trim()
				: user1?.email || `Usuario ${user1?.id?.slice(0, 8) || 'Desconocido'}`;
		} else if (user1?.name) {
			user1Name = user1.name;
		} else if (user1?.email) {
			user1Name = user1.email;
		}

		if (user2Type === "employee") {
			user2Name = user2?.first_name && user2?.last_name
				? `${user2.first_name} ${user2.last_name}`.trim()
				: user2?.email || `Usuario ${user2?.id?.slice(0, 8) || 'Desconocido'}`;
		} else if (user2?.name) {
			user2Name = user2.name;
		} else if (user2?.email) {
			user2Name = user2.email;
		}

		// Para mejorar la visual, usar un nombre más descriptivo
		const roomName = `Chat privado: ${user1Name} - ${user2Name}`;
		console.log("🔍 generatePrivateRoomName - final roomName:", roomName);

		return roomName;
	}
}
