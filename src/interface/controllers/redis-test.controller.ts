import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { RedisDatabaseService } from '../../infrastructure/database/redis/redis.database.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { Public } from '../../application/decorators/public.decorator';

@ApiTags('Redis Test')
@Controller('redis-test')
@Public()
export class RedisTestController {
  constructor(private readonly redisService: RedisDatabaseService) {}

  @Post()
  @ApiOperation({ summary: 'Guardar un dato en Redis' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        key: { type: 'string', example: 'test:key' },
        value: { type: 'object', example: { name: 'Test Data', value: 123 } },
        ttl: { type: 'number', example: 3600 },
      },
      required: ['key', 'value'],
    },
  })
  @ApiResponse({ status: 201, description: 'Dato guardado correctamente' })
  async saveData(
    @Body('key') key: string,
    @Body('value') value: any,
    @Body('ttl') ttl?: number,
  ) {
    await this.redisService.set(key, value, ttl);
    return { success: true, message: 'Dato guardado correctamente', key };
  }

  @Get(':key')
  @ApiOperation({ summary: 'Obtener un dato de Redis' })
  @ApiResponse({ status: 200, description: 'Dato recuperado correctamente' })
  async getData(@Param('key') key: string) {
    const data = await this.redisService.get(key);
    return { success: !!data, data };
  }

  @Delete(':key')
  @ApiOperation({ summary: 'Eliminar un dato de Redis' })
  @ApiResponse({ status: 200, description: 'Dato eliminado correctamente' })
  async deleteData(@Param('key') key: string) {
    await this.redisService.delete(key);
    return { success: true, message: 'Dato eliminado correctamente', key };
  }

  @Post('location')
  @ApiOperation({ summary: 'Guardar una ubicación de tarjeta' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        cardId: { type: 'string', example: 'card123' },
        location: {
          type: 'object',
          properties: {
            latitude: { type: 'number', example: 40.7128 },
            longitude: { type: 'number', example: -74.006 },
          },
        },
      },
      required: ['cardId', 'location'],
    },
  })
  @ApiResponse({ status: 201, description: 'Ubicación guardada correctamente' })
  async saveLocation(
    @Body('cardId') cardId: string,
    @Body('location') location: { latitude: number; longitude: number },
  ) {
    await this.redisService.saveCardLocation(cardId, location);
    return {
      success: true,
      message: 'Ubicación guardada correctamente',
      cardId,
    };
  }

  @Get('location/:cardId')
  @ApiOperation({ summary: 'Obtener la ubicación de una tarjeta' })
  @ApiResponse({
    status: 200,
    description: 'Ubicación recuperada correctamente',
  })
  async getLocation(@Param('cardId') cardId: string) {
    const location = await this.redisService.getCardLocation(cardId);
    return { success: !!location, location };
  }

  @Get('nearby')
  @ApiOperation({ summary: 'Obtener tarjetas cercanas a una ubicación' })
  @ApiResponse({
    status: 200,
    description: 'Tarjetas cercanas recuperadas correctamente',
  })
  async getNearbyCards(
    @Query('latitude') latitude: number,
    @Query('longitude') longitude: number,
    @Query('radius') radius: number = 100,
  ) {
    try {
      console.log(
        `Buscando tarjetas cercanas en: lat=${latitude}, lon=${longitude}, radius=${radius}`,
      );
      const cards = await this.redisService.getNearbyCards(
        parseFloat(String(latitude)),
        parseFloat(String(longitude)),
        radius,
      );
      return { success: true, count: cards?.length || 0, cards };
    } catch (error) {
      console.error('Error al buscar tarjetas cercanas:', error);
      return {
        success: false,
        error: {
          message: error.message || 'Error desconocido',
          name: error.name,
          stack: error.stack?.split('\n') || [],
        },
      };
    }
  }

  @Post('chat/:roomId/message')
  @ApiOperation({ summary: 'Guardar un mensaje de chat' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'msg123' },
        content: {
          type: 'string',
          example: 'Hola, este es un mensaje de prueba',
        },
        sender: { type: 'string', example: 'user1' },
        timestamp: { type: 'string', example: '2025-05-11T22:00:00Z' },
      },
      required: ['id', 'content', 'sender'],
    },
  })
  @ApiResponse({ status: 201, description: 'Mensaje guardado correctamente' })
  async saveChatMessage(@Param('roomId') roomId: string, @Body() message: any) {
    try {
      await this.redisService.saveChatMessage(roomId, message);
      return {
        success: true,
        message: 'Mensaje guardado correctamente',
        roomId,
      };
    } catch (error) {
      console.error('Error al guardar mensaje:', error);
      return { success: false, error: error.message };
    }
  }

  @Get('chat/:roomId/messages')
  @ApiOperation({ summary: 'Obtener mensajes de un chat' })
  @ApiResponse({
    status: 200,
    description: 'Mensajes recuperados correctamente',
  })
  async getChatMessages(
    @Param('roomId') roomId: string,
    @Query('limit') limit: number = 50,
  ) {
    try {
      const messages = await this.redisService.getChatMessages(roomId, limit);
      return { success: true, count: messages.length, messages };
    } catch (error) {
      console.error('Error al recuperar mensajes:', error);
      return { success: false, error: error.message };
    }
  }

  @Post('chat/room')
  @ApiOperation({ summary: 'Guardar información de una sala de chat' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'room123' },
        name: { type: 'string', example: 'Sala de Pruebas' },
        participants: {
          type: 'array',
          items: { type: 'string' },
          example: ['user1', 'user2'],
        },
      },
      required: ['id', 'name'],
    },
  })
  @ApiResponse({ status: 201, description: 'Sala guardada correctamente' })
  async saveChatRoom(@Body() room: any) {
    try {
      await this.redisService.saveChatRoom(room);
      return {
        success: true,
        message: 'Sala guardada correctamente',
        roomId: room.id,
      };
    } catch (error) {
      console.error('Error al guardar sala:', error);
      return { success: false, error: error.message };
    }
  }

  @Get('chat/room/:roomId')
  @ApiOperation({ summary: 'Obtener información de una sala de chat' })
  @ApiResponse({ status: 200, description: 'Sala recuperada correctamente' })
  async getChatRoom(@Param('roomId') roomId: string) {
    try {
      const room = await this.redisService.getChatRoom(roomId);
      return { success: !!room, room };
    } catch (error) {
      console.error('Error al recuperar sala:', error);
      return { success: false, error: error.message };
    }
  }

  @Post('user/rooms')
  @ApiOperation({ summary: 'Guardar las salas de chat de un usuario' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'user123' },
        userType: { type: 'string', example: 'visitor' },
        rooms: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
            },
          },
        },
      },
      required: ['id', 'userType', 'rooms'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Salas de usuario guardadas correctamente',
  })
  async saveUserRooms(
    @Body('id') userId: string,
    @Body('userType') userType: string,
    @Body('rooms') rooms: any[],
  ) {
    try {
      await this.redisService.saveUserRooms(userId, userType, rooms);
      return {
        success: true,
        message: 'Salas de usuario guardadas correctamente',
        userId,
        userType,
      };
    } catch (error) {
      console.error('Error al guardar salas de usuario:', error);
      return { success: false, error: error.message };
    }
  }

  @Get('user/:userType/:userId/rooms')
  @ApiOperation({ summary: 'Obtener las salas de chat de un usuario' })
  @ApiResponse({
    status: 200,
    description: 'Salas de usuario recuperadas correctamente',
  })
  async getUserRooms(
    @Param('userId') userId: string,
    @Param('userType') userType: string,
  ) {
    try {
      const rooms = await this.redisService.getUserRooms(userId, userType);
      return { success: true, count: rooms.length, rooms };
    } catch (error) {
      console.error('Error al recuperar salas de usuario:', error);
      return { success: false, error: error.message };
    }
  }
}
