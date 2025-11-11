import { Global, Module } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

/**
 * Global module that ensures a single instance of `Reflector` is available
 * across the entire application. This prevents dependency-resolution issues
 * for third-party modules (e.g. `@nestjs/schedule`) that rely on `Reflector`.
 */
@Global()
@Module({
  providers: [Reflector],
  exports: [Reflector],
})
export class ReflectorModule {}
