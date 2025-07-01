import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const WsAuthUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const wsContext = ctx.switchToWs();
    const client = wsContext.getClient();
    const user = client['user'] || wsContext.getData().user;

    if (!user) {
      throw new Error(
        'El usuario no está autenticado o no se encontró en el contexto',
      );
    }

    return user;
  },
);
