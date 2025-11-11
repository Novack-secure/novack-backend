/**
 * Índice de entidades del dominio
 *
 * Este archivo centraliza la exportación de todas las entidades del dominio
 * para facilitar su importación en otros módulos.
 */

// Entidades principales del negocio
export * from "./employee.entity";
export * from "./visitor.entity";
export * from "./supplier.entity";
export * from "./card.entity";
export * from "./card-location.entity";
export * from "./appointment.entity";

// Entidades de comunicación y chat
export * from "./chat-room.entity";
export * from "./chat-message.entity";

// Entidades de seguridad y auditoría
export * from "./audit-log.entity";
export * from "./refresh-token.entity";
export * from "./supplier-subscription.entity";
export * from "./login-attempt.entity";
export * from "./employee-credentials.entity";
export * from "./role.entity";
export * from "./permission.entity";

// Entidades de configuración de usuario
export * from "./user-preference.entity";

// Entidades de formularios dinámicos
export * from "./form-template.entity";
export * from "./form-field.entity";
export * from "./form-submission.entity";
export * from "./form-answer.entity";
