import { S3Client, ListBucketsCommand } from "@aws-sdk/client-s3";
import * as dotenv from "dotenv";
import * as path from "path";

// Cargar variables de entorno desde .env
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

async function testS3Connection() {
	console.log("Iniciando prueba de conexión a AWS S3...");
	console.log("AWS_REGION:", process.env.AWS_REGION);
	console.log(
		"AWS_ACCESS_KEY_ID:",
		process.env.AWS_ACCESS_KEY_ID ? "Configurado" : "No configurado",
	);
	console.log(
		"AWS_SECRET_ACCESS_KEY:",
		process.env.AWS_SECRET_ACCESS_KEY ? "Configurado" : "No configurado",
	);

	try {
		const s3Client = new S3Client({
			region: process.env.AWS_REGION || "us-east-1",
			credentials: {
				accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
				secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
			},
		});

		console.log("Cliente S3 inicializado. Intentando listar buckets...");

		const command = new ListBucketsCommand({});
		const response = await s3Client.send(command);

		console.log("Conexión exitosa! Buckets disponibles:");
		console.log(
			response.Buckets?.map((bucket) => bucket.Name).join(", ") ||
				"No hay buckets disponibles",
		);

		// Verificar si los buckets configurados existen
		const configuredBuckets = [
			process.env.AWS_S3_EMPLOYEE_BUCKET_NAME,
			process.env.AWS_S3_SUPPLIER_BUCKET_NAME,
			process.env.AWS_S3_VISITOR_BUCKET_NAME,
		].filter(Boolean);

		console.log("\nVerificando buckets configurados en .env:");
		configuredBuckets.forEach((bucket) => {
			const exists = response.Buckets?.some((b) => b.Name === bucket);
			console.log(`- ${bucket}: ${exists ? "Existe ✅" : "No existe ❌"}`);
		});

		return true;
	} catch (error) {
		console.error("Error al conectar con AWS S3:");
		console.error(error);
		return false;
	}
}

testS3Connection().then((success) => {
	if (success) {
		console.log("\nPrueba de conexión completada exitosamente.");
	} else {
		console.log("\nPrueba de conexión falló.");
		console.log("\nPosibles soluciones:");
		console.log(
			"1. Verifica que AWS_ACCESS_KEY_ID y AWS_SECRET_ACCESS_KEY estén configurados en .env",
		);
		console.log("2. Confirma que la región AWS_REGION sea correcta");
		console.log("3. Asegúrate que las credenciales tengan permisos para S3");
		console.log("4. Revisa la conectividad a internet");
	}
	process.exit(success ? 0 : 1);
});
