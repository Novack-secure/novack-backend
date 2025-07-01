import 'express-session';

declare module 'express-session' {
  interface Session {
    csrfSecret?: string;
    user?: {
      id: string;
      email: string;
    };
  }
}

declare module 'express' {
  interface Request {
    csrfToken?: () => string;
  }
}
