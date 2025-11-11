import {
	Injectable,
	NestInterceptor,
	ExecutionContext,
	CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import sanitizeHtml from "sanitize-html";

/**
 * Interceptor que sanitiza las entradas para prevenir ataques XSS.
 * Limpia las cadenas de texto en el cuerpo de la solicitud.
 */
@Injectable()
export class SanitizationInterceptor implements NestInterceptor {
	/**
	 * Intercepta las solicitudes y sanitiza las cadenas de texto para evitar XSS.
	 * @param context El contexto de ejecución
	 * @param next El manejador para continuar con la ejecución
	 * @returns Observable con la respuesta sanitizada
	 */
	intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		const request = context.switchToHttp().getRequest();

		if (request.body) {
			request.body = this.sanitizeObject(request.body);
		}

		return next.handle();
	}

	/**
	 * Sanitiza recursivamente un objeto completo
	 * @param obj El objeto a sanitizar
	 * @returns El objeto sanitizado
	 */
	private sanitizeObject(obj: any): any {
		if (obj === null || obj === undefined) {
			return obj;
		}

		if (typeof obj === "string") {
			return this.sanitizeString(obj);
		}

		if (Array.isArray(obj)) {
			return obj.map((item) => this.sanitizeObject(item));
		}

		if (typeof obj === "object") {
			const result = {};
			for (const key in obj) {
				if (Object.prototype.hasOwnProperty.call(obj, key)) {
					result[key] = this.sanitizeObject(obj[key]);
				}
			}
			return result;
		}

		return obj;
	}

	/**
	 * Sanitiza una cadena de texto para prevenir XSS
	 * @param text El texto a sanitizar
	 * @returns El texto sanitizado
	 */
	private sanitizeString(text: string): string {
		return sanitizeHtml(text, {
			allowedTags: [], // No permitir ninguna etiqueta HTML
			allowedAttributes: {}, // No permitir ningún atributo
			parser: {
				decodeEntities: true,
			},
		});
	}
}
