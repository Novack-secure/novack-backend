import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateFormTables1730815200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create form_templates table
    await queryRunner.createTable(
      new Table({
        name: 'form_templates',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'slug',
            type: 'varchar',
            length: '255',
            isUnique: true,
          },
          {
            name: 'is_public',
            type: 'boolean',
            default: true,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'requires_approval',
            type: 'boolean',
            default: true,
          },
          {
            name: 'notification_emails',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'settings',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'supplier_id',
            type: 'uuid',
          },
          {
            name: 'created_by',
            type: 'uuid',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create form_fields table
    await queryRunner.createTable(
      new Table({
        name: 'form_fields',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'form_template_id',
            type: 'uuid',
          },
          {
            name: 'field_type',
            type: 'enum',
            enum: [
              'text',
              'email',
              'phone',
              'number',
              'textarea',
              'select',
              'radio',
              'checkbox',
              'date',
              'time',
              'datetime',
              'file',
            ],
            default: "'text'",
          },
          {
            name: 'label',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'placeholder',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'help_text',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'is_required',
            type: 'boolean',
            default: false,
          },
          {
            name: 'order',
            type: 'integer',
            default: 0,
          },
          {
            name: 'validation_rules',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'options',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create form_submissions table
    await queryRunner.createTable(
      new Table({
        name: 'form_submissions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'form_template_id',
            type: 'uuid',
          },
          {
            name: 'supplier_id',
            type: 'uuid',
          },
          {
            name: 'visitor_name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'visitor_email',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'visitor_phone',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'visitor_company',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'approved', 'rejected', 'completed', 'cancelled'],
            default: "'pending'",
          },
          {
            name: 'admin_notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'approved_by',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'approved_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'submitted_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create form_answers table
    await queryRunner.createTable(
      new Table({
        name: 'form_answers',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'form_submission_id',
            type: 'uuid',
          },
          {
            name: 'form_field_id',
            type: 'uuid',
          },
          {
            name: 'value',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'value_json',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Add foreign keys
    await queryRunner.createForeignKey(
      'form_templates',
      new TableForeignKey({
        columnNames: ['supplier_id'],
        referencedTableName: 'suppliers',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'form_templates',
      new TableForeignKey({
        columnNames: ['created_by'],
        referencedTableName: 'employees',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'form_fields',
      new TableForeignKey({
        columnNames: ['form_template_id'],
        referencedTableName: 'form_templates',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'form_submissions',
      new TableForeignKey({
        columnNames: ['form_template_id'],
        referencedTableName: 'form_templates',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'form_submissions',
      new TableForeignKey({
        columnNames: ['supplier_id'],
        referencedTableName: 'suppliers',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'form_submissions',
      new TableForeignKey({
        columnNames: ['approved_by'],
        referencedTableName: 'employees',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'form_answers',
      new TableForeignKey({
        columnNames: ['form_submission_id'],
        referencedTableName: 'form_submissions',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'form_answers',
      new TableForeignKey({
        columnNames: ['form_field_id'],
        referencedTableName: 'form_fields',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Add form_submission_id to appointments table
    await queryRunner.query(`
      ALTER TABLE appointments
      ADD COLUMN IF NOT EXISTS form_submission_id uuid REFERENCES form_submissions(id) ON DELETE SET NULL;
    `);

    // Create indexes for better query performance
    await queryRunner.query(`
      CREATE INDEX idx_form_templates_supplier ON form_templates(supplier_id);
      CREATE INDEX idx_form_templates_slug ON form_templates(slug);
      CREATE INDEX idx_form_fields_template ON form_fields(form_template_id);
      CREATE INDEX idx_form_submissions_supplier ON form_submissions(supplier_id);
      CREATE INDEX idx_form_submissions_template ON form_submissions(form_template_id);
      CREATE INDEX idx_form_submissions_status ON form_submissions(status);
      CREATE INDEX idx_form_answers_submission ON form_answers(form_submission_id);
      CREATE INDEX idx_appointments_form_submission ON appointments(form_submission_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_appointments_form_submission;
      DROP INDEX IF EXISTS idx_form_answers_submission;
      DROP INDEX IF EXISTS idx_form_submissions_status;
      DROP INDEX IF EXISTS idx_form_submissions_template;
      DROP INDEX IF EXISTS idx_form_submissions_supplier;
      DROP INDEX IF EXISTS idx_form_fields_template;
      DROP INDEX IF EXISTS idx_form_templates_slug;
      DROP INDEX IF EXISTS idx_form_templates_supplier;
    `);

    // Remove form_submission_id from appointments
    await queryRunner.query(`
      ALTER TABLE appointments
      DROP COLUMN IF EXISTS form_submission_id;
    `);

    // Drop tables in reverse order
    await queryRunner.dropTable('form_answers', true);
    await queryRunner.dropTable('form_submissions', true);
    await queryRunner.dropTable('form_fields', true);
    await queryRunner.dropTable('form_templates', true);
  }
}
