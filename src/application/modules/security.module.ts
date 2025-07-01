import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { CustomThrottlerGuard } from '../guards/throttler.guard';
import { SanitizationInterceptor } from '../interceptors/sanitization.interceptor';
import { SessionSecurityMiddleware } from '../middlewares/session-security.middleware';

@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: SanitizationInterceptor,
    },
  ],
})
export class SecurityModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SessionSecurityMiddleware).forRoutes('*'); // Aplicar a todas las rutas
  }
}
