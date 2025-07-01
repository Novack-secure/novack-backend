import { JwtService } from "@nestjs/jwt";

// Test simplificado que verifica la funcionalidad básica sin depender de la infraestructura
describe("JWT Functionality", () => {
	let jwtService: JwtService;

	beforeEach(() => {
		// Configurar variables de entorno para pruebas
		process.env.JWT_SECRET = "test-secret-key";
		process.env.JWT_EXPIRATION = "1h";
		process.env.JWT_AUDIENCE = "test-audience";
		process.env.JWT_ISSUER = "test-issuer";

		// Crear instancia directa del servicio para pruebas
		jwtService = new JwtService({
			secret: process.env.JWT_SECRET,
			signOptions: {
				expiresIn: process.env.JWT_EXPIRATION,
				audience: process.env.JWT_AUDIENCE,
				issuer: process.env.JWT_ISSUER,
			},
		});
	});

	afterEach(() => {
		// Eliminar variables de entorno después de las pruebas
		delete process.env.JWT_SECRET;
		delete process.env.JWT_EXPIRATION;
		delete process.env.JWT_AUDIENCE;
		delete process.env.JWT_ISSUER;
	});

	it("should be defined", () => {
		expect(jwtService).toBeDefined();
	});

	it("should generate a valid token with correct claims", () => {
		// Preparar datos para el token
		const payload = {
			sub: "user-123",
			email: "test@example.com",
			roles: ["admin"],
		};

		// Generar token
		const token = jwtService.sign(payload);
		expect(token).toBeDefined();
		expect(typeof token).toBe("string");

		// Verificar token
		const decoded = jwtService.verify(token);

		// Verificar que el token contenga las claims correctas
		expect(decoded).toBeDefined();
		expect(decoded.sub).toBe(payload.sub);
		expect(decoded.email).toBe(payload.email);
		expect(decoded.roles).toEqual(payload.roles);
		expect(decoded.iss).toBe(process.env.JWT_ISSUER);
		expect(decoded.aud).toBe(process.env.JWT_AUDIENCE);

		// Verificar que el token tenga expiración
		expect(decoded.exp).toBeDefined();
		expect(decoded.iat).toBeDefined();
	});

	it("should throw error when token is invalid", () => {
		const invalidToken = "invalid.token.here";

		expect(() => {
			jwtService.verify(invalidToken);
		}).toThrow();
	});
});
