#!/bin/bash

# Script para compilar y iniciar la aplicación en modo desarrollo sin logging

echo "Compilando la aplicación..."
npm run build

echo "Iniciando la aplicación sin logging en modo desarrollo..."
npm run start:dev:nologging 