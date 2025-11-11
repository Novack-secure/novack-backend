import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddBannerFieldToFormTemplates1731200000000
	implements MigrationInterface
{
	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.addColumn(
			"form_templates",
			new TableColumn({
				name: "banner",
				type: "text",
				isNullable: true,
			}),
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.dropColumn("form_templates", "banner");
	}
}
