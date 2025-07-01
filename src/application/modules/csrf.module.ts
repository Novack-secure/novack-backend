import { Module } from '@nestjs/common';
import { CsrfMiddleware } from '../middlewares/csrf.middleware';
import { CsrfService } from '../services/csrf.service';
import { CsrfController } from '../../interface/controllers/csrf.controller';

@Module({
  controllers: [CsrfController],
  providers: [CsrfService, CsrfMiddleware],
  exports: [CsrfService, CsrfMiddleware],
})
export class CsrfModule {}
