import { SanitizationInterceptor } from '../sanitization.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';

describe('SanitizationInterceptor', () => {
  let interceptor: SanitizationInterceptor;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;
  let mockRequest: any;

  beforeEach(() => {
    interceptor = new SanitizationInterceptor();

    mockRequest = {
      body: {},
    };

    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
      }),
    } as unknown as ExecutionContext;

    mockCallHandler = {
      handle: jest.fn().mockReturnValue(of({})),
    } as unknown as CallHandler;
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should sanitize HTML in strings in request body', () => {
    // Preparar
    mockRequest.body = {
      name: 'Test <script>alert("XSS")</script>',
      description: 'Description with <img src="x" onerror="alert(\'XSS\')" />',
      nested: {
        field: '<div onclick="evil()">Click me</div>',
      },
      array: ['Text', '<script>bad()</script>'],
    };

    // Ejecutar
    interceptor.intercept(mockExecutionContext, mockCallHandler);

    // Verificar
    expect(mockRequest.body).toEqual({
      name: 'Test ',
      description: 'Description with ',
      nested: {
        field: 'Click me',
      },
      array: ['Text', ''],
    });
    expect(mockCallHandler.handle).toHaveBeenCalled();
  });

  it('should handle null and undefined values', () => {
    // Preparar
    mockRequest.body = {
      empty: null,
      notDefined: undefined,
      text: 'Normal text',
    };

    // Ejecutar
    interceptor.intercept(mockExecutionContext, mockCallHandler);

    // Verificar
    expect(mockRequest.body).toEqual({
      empty: null,
      notDefined: undefined,
      text: 'Normal text',
    });
    expect(mockCallHandler.handle).toHaveBeenCalled();
  });

  it('should not modify non-string values', () => {
    // Preparar
    const number = 42;
    const boolean = true;

    mockRequest.body = {
      number: number,
      boolean: boolean,
    };

    // Ejecutar
    interceptor.intercept(mockExecutionContext, mockCallHandler);

    // Verificar
    expect(mockRequest.body.number).toBe(number);
    expect(mockRequest.body.boolean).toBe(boolean);
    expect(mockCallHandler.handle).toHaveBeenCalled();
  });
});
