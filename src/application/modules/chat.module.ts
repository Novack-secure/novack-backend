import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  ChatRoom,
  ChatMessage,
  Employee,
  Visitor,
  Supplier,
} from 'src/domain/entities';
import { ChatService } from '../services/chat.service';
import { ChatController } from '../../interface/controllers/chat.controller';
import { ChatGateway } from '../../infrastructure/websockets/chat.gateway';
import { WsJwtGuard } from '../guards/ws-jwt.guard';
import { RedisDatabaseModule } from '../../infrastructure/database/redis/redis.database.module';
import { AuthModule } from './auth.module';
import { TokenModule } from './token.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChatRoom,
      ChatMessage,
      Employee,
      Visitor,
      Supplier,
    ]),
    RedisDatabaseModule,
    AuthModule,
    TokenModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: '1d' },
      }),
    }),
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway, WsJwtGuard],
  exports: [ChatService],
})
export class ChatModule {}
