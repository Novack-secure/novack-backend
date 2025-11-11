import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddArchivedFieldToAppointments1699999999999
	implements MigrationInterface
{
	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.addColumn(
			"appointments",
			new TableColumn({
				name: "archived",
				type: "boolean",
				default: false,
			}),
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.dropColumn("appointments", "archived");
	}
}
