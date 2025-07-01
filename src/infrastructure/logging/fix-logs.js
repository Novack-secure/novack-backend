/**
 * Script para corregir los problemas de log en todos los archivos del proyecto.
 *
 * Este script busca todas las llamadas a los métodos log, warn, error y debug
 * del objeto this.logger y modifica las llamadas para usar JSON.stringify
 * con los objetos que se pasan como tercer parámetro.
 *
 * Uso: node fix-logs.js
 */

const fs = require("fs");
const path = require("path");

// Directorios a excluir
const excludeDirs = ["node_modules", "dist", ".git"];

// Extensiones de archivos a procesar
const extensions = [".ts"];

// Buscar archivos de forma recursiva
function findFiles(dir, fileList = []) {
	const files = fs.readdirSync(dir);

	files.forEach((file) => {
		const filePath = path.join(dir, file);
		const stat = fs.statSync(filePath);

		if (stat.isDirectory() && !excludeDirs.includes(file)) {
			fileList = findFiles(filePath, fileList);
		} else if (stat.isFile() && extensions.includes(path.extname(file))) {
			fileList.push(filePath);
		}
	});

	return fileList;
}

// Corregir logs en un archivo
function fixLogs(filePath) {
	let content = fs.readFileSync(filePath, "utf8");
	let modified = false;

	// Buscar patrones como this.logger.log('mensaje', { objeto })
	// this.logger.warn('mensaje', { objeto })
	// this.logger.error('mensaje', { objeto })
	// this.logger.debug('mensaje', { objeto })

	// Crear una expresión regular para encontrar todas las llamadas a los métodos del logger
	const loggerMethodsRegex =
		/this\.logger\.(log|warn|error|debug)\(['"](.+?)['"]\s*,\s*(\{[^}]+\})/g;

	// Reemplazar las llamadas encontradas
	content = content.replace(
		loggerMethodsRegex,
		(match, method, message, object) => {
			modified = true;
			return `this.logger.${method}('${message}', undefined, JSON.stringify(${object})`;
		},
	);

	if (modified) {
		fs.writeFileSync(filePath, content, "utf8");
		console.log(`Fixed logs in ${filePath}`);
	}
}

// Ejecutar el script
const rootDir = path.resolve(__dirname, "../../");
console.log(`Searching files in ${rootDir}...`);
const files = findFiles(rootDir);
console.log(`Found ${files.length} files.`);

files.forEach((file) => {
	try {
		fixLogs(file);
	} catch (error) {
		console.error(`Error processing ${file}: ${error.message}`);
	}
});

console.log("Done!");
