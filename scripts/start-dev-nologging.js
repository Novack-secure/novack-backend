#!/usr/bin/env node

/**
 * Script para iniciar la aplicación en modo desarrollo sin logging
 *
 * Este script configura variables de entorno para desactivar el logging
 * antes de iniciar la aplicación con NestJS
 */

console.log("Iniciando aplicación en modo desarrollo sin logging...");

// Configurar variables de entorno para desactivar logging
process.env.NODE_ENV = "development";
process.env.LOG_LEVEL = "none";
process.env.LOG_TO_FILE = "false";
process.env.ELK_ENABLED = "false";
process.env.LOG_FALLBACK_CONSOLE = "false";

// JWT y seguridad
process.env.JWT_SECRET = "test_token";
process.env.JWT_EXPIRATION = "24h";

// Importar NestJS y ejecutar la aplicación
require("../dist/main");
