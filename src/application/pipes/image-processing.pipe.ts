import {
	PipeTransform,
	Injectable,
	ArgumentMetadata,
	BadRequestException,
	Logger,
} from "@nestjs/common";
import * as sharp from "sharp";

// Asegúrate de tener instalado @types/multer si usas TypeScript
// npm install --save-dev @types/multer

// Opciones de compresión (ajusta según tus necesidades)
const COMPRESSION_OPTIONS = {
	quality: 80, // Calidad JPEG/WEBP (1-100)
	// Opcional: Redimensionar
	resize: {
		width: 800, // Ancho máximo
		// height: 600, // Alto máximo (opcional, sharp mantiene aspect ratio)
		fit: sharp.fit.inside, // 'cover', 'contain', 'fill', 'inside', 'outside'
		withoutEnlargement: true, // No agrandar si ya es más pequeña
	},
};

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

@Injectable()
export class ImageProcessingPipe
	implements PipeTransform<Express.Multer.File, Promise<Express.Multer.File>>
{
	private readonly logger = new Logger(ImageProcessingPipe.name);

	async transform(
		value: Express.Multer.File,
		metadata: ArgumentMetadata,
	): Promise<Express.Multer.File> {
		// Verificar si el valor es un archivo Multer válido
		if (!value || !value.buffer || !value.mimetype) {
			throw new BadRequestException("Se esperaba un archivo.");
		}

		const file: Express.Multer.File = value;

		// 1. Validar tipo MIME
		if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
			throw new BadRequestException(
				`Tipo de archivo no permitido. Solo se aceptan: ${ALLOWED_MIME_TYPES.join(", ")}`,
			);
		}

		try {
			// 2. Comprimir y procesar imagen con sharp
			let processedBuffer = await sharp(file.buffer)
				.resize(COMPRESSION_OPTIONS.resize)
				.jpeg({ quality: COMPRESSION_OPTIONS.quality, mozjpeg: true }) // Forzar JPEG y aplicar calidad
				// .webp({ quality: COMPRESSION_OPTIONS.quality }) // O usar WEBP
				// .png({ compressionLevel: 9, quality: COMPRESSION_OPTIONS.quality }) // Opciones para PNG
				.toBuffer();

			// Devolver el archivo Multer modificado con el buffer procesado
			// y actualizando el mimetype si lo cambiamos (ej. a image/jpeg)
			return {
				...file,
				buffer: processedBuffer,
				size: processedBuffer.length,
				mimetype: "image/jpeg", // Actualiza si conviertes a JPEG
				// originalname se mantiene o lo puedes modificar
			};
		} catch (error) {
			throw new BadRequestException("Error al procesar la imagen.");
		}
	}
}
