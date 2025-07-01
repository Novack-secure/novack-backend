import { Module } from '@nestjs/common';
import { DatabaseResetController } from '../../interface/controllers/database-reset.controller';

@Module({
  controllers: [DatabaseResetController],
  providers: [],
})
export class DatabaseResetModule {}
