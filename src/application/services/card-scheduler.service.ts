import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, MoreThanOrEqual, Repository, Between } from 'typeorm';
import { Card, CardLocation, Visitor, Appointment } from 'src/domain/entities';
import { CardService } from './card.service';

@Injectable()
export class CardSchedulerService {
  private readonly logger = new Logger(CardSchedulerService.name);

  constructor(
    @InjectRepository(Card)
    private readonly cardRepository: Repository<Card>,
    @InjectRepository(CardLocation)
    private readonly cardLocationRepository: Repository<CardLocation>,
    @InjectRepository(Visitor)
    private readonly visitorRepository: Repository<Visitor>,
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    private readonly cardService: CardService,
  ) {}

  /**
   * Ejecuta cada minuto para verificar las citas que comienzan pronto
   * y asignar tarjetas automáticamente
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async assignCardsToUpcomingAppointments() {
    this.logger.log('Verificando citas próximas para asignar tarjetas...');

    // Obtener citas que comienzan en los próximos 15 minutos
    const now = new Date();
    const fifteenMinutesLater = new Date(now.getTime() + 15 * 60 * 1000);

    const upcomingAppointments = await this.appointmentRepository.find({
      where: {
        check_in_time: Between(now, fifteenMinutesLater),
        status: 'pendiente',
      },
      relations: ['visitor', 'visitor.card'],
    });

    this.logger.log(
      `Encontradas ${upcomingAppointments.length} citas próximas`,
    );

    // Procesar cada cita
    for (const appointment of upcomingAppointments) {
      try {
        // Verificar si el visitante ya tiene tarjeta asignada
        if (appointment.visitor && !appointment.visitor.card) {
          const availableCards = await this.cardService.findAvailableCards();

          if (availableCards.length > 0) {
            await this.cardService.assignToVisitor(
              availableCards[0].id,
              appointment.visitor.id,
            );
            this.logger.log(
              `Tarjeta ${availableCards[0].id} asignada automáticamente al visitante ${appointment.visitor.id}`,
            );

            // Actualizar el estado de la cita
            appointment.status = 'en_progreso';
            await this.appointmentRepository.save(appointment);
          } else {
            this.logger.warn('No hay tarjetas disponibles para asignar');
          }
        }
      } catch (error) {
        this.logger.error(
          `Error al asignar tarjeta para la cita ${appointment.id}: ${error.message}`,
        );
      }
    }
  }

  /**
   * Ejecuta cada minuto para verificar citas que han terminado
   * y liberar las tarjetas automáticamente
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async releaseCardsFromCompletedAppointments() {
    this.logger.log('Verificando citas finalizadas para liberar tarjetas...');

    // Obtener citas que deberían haber terminado
    const now = new Date();

    const completedAppointments = await this.appointmentRepository.find({
      where: {
        check_out_time: LessThan(now),
        status: 'en_progreso',
      },
      relations: ['visitor', 'visitor.card'],
    });

    this.logger.log(
      `Encontradas ${completedAppointments.length} citas finalizadas`,
    );

    // Procesar cada cita
    for (const appointment of completedAppointments) {
      try {
        if (appointment.visitor && appointment.visitor.card) {
          // Liberar la tarjeta
          await this.cardService.unassignFromVisitor(
            appointment.visitor.card.id,
          );
          this.logger.log(
            `Tarjeta ${appointment.visitor.card.id} liberada automáticamente del visitante ${appointment.visitor.id}`,
          );

          // Actualizar estado de la cita y visitante
          appointment.status = 'completado';
          await this.appointmentRepository.save(appointment);

          appointment.visitor.state = 'completado';
          await this.visitorRepository.save(appointment.visitor);
        }
      } catch (error) {
        this.logger.error(
          `Error al liberar tarjeta para la cita ${appointment.id}: ${error.message}`,
        );
      }
    }
  }

  /**
   * Recibe coordenadas de las tarjetas ESP32 y las registra en el sistema
   * @param cardNumber Número de la tarjeta
   * @param latitude Latitud
   * @param longitude Longitud
   * @param accuracy Precisión en metros
   * @param companyId Identificador de la empresa
   * @param batteryLevel Nivel de batería (opcional)
   * @param signalStrength Intensidad de la señal (opcional)
   * @param inUse Si la tarjeta está en uso (opcional)
   */
  async receiveCardLocation(
    cardNumber: string,
    latitude: number,
    longitude: number,
    accuracy: number,
    companyId: string,
    batteryLevel?: number,
    signalStrength?: number,
    inUse?: boolean,
  ) {
    try {
      // Buscar la tarjeta por su número y empresa
      // Primero intentamos buscar la tarjeta específica de la empresa
      this.logger.log(
        `Buscando tarjeta ${cardNumber} de la empresa ${companyId}`,
      );

      // Usamos additional_info de Card para almacenar datos como company_id
      // Nota: En una implementación completa, sería mejor tener una relación directa con una entidad Company
      let card = await this.cardRepository.findOne({
        where: {
          card_number: cardNumber,
          // Verificar si additional_info contiene el company_id correcto
        },
      });

      if (!card) {
        this.logger.warn(
          `Tarjeta con número ${cardNumber} no encontrada, intentando crearla para la empresa ${companyId}`,
        );

        // Para este ejemplo, creamos automáticamente la tarjeta si no existe
        // En producción, deberías tener un proceso más controlado para la creación de tarjetas
        card = this.cardRepository.create({
          card_number: cardNumber,
          is_active: true,
          additional_info: {
            company_id: companyId,
            last_battery_level: batteryLevel,
            last_signal_strength: signalStrength,
            in_use: inUse || false,
          },
        });

        // Guardar la nueva tarjeta
        card = await this.cardRepository.save(card);
        this.logger.log(
          `Tarjeta ${cardNumber} creada automáticamente para empresa ${companyId}`,
        );
      } else {
        // Actualizar información de la tarjeta existente
        if (!card.additional_info) {
          card.additional_info = {};
        }

        // Asegurarnos de que pertenece a la empresa correcta
        if (
          card.additional_info.company_id &&
          card.additional_info.company_id !== companyId
        ) {
          this.logger.warn(
            `La tarjeta ${cardNumber} está asignada a otra empresa (${card.additional_info.company_id})`,
          );
        }

        // Actualizar información
        card.additional_info.company_id = companyId;
        if (batteryLevel !== undefined)
          card.additional_info.last_battery_level = batteryLevel;
        if (signalStrength !== undefined)
          card.additional_info.last_signal_strength = signalStrength;
        if (inUse !== undefined) card.additional_info.in_use = inUse;

        await this.cardRepository.save(card);
      }

      // Registrar la ubicación utilizando el servicio existente
      const location = await this.cardService.recordLocation(
        card.id,
        latitude,
        longitude,
        accuracy,
      );

      // Añadir información adicional a la respuesta
      this.logger.log(
        `Ubicación registrada para tarjeta ${cardNumber} (Empresa: ${companyId}): [${latitude}, ${longitude}]`,
      );
      return {
        success: true,
        location,
        company_id: companyId,
        card_info: {
          id: card.id,
          card_number: card.card_number,
          battery_level: batteryLevel,
          signal_strength: signalStrength,
          in_use: inUse,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error al registrar ubicación de tarjeta ${cardNumber} de empresa ${companyId}: ${error.message}`,
      );
      return { success: false, message: error.message };
    }
  }
}
