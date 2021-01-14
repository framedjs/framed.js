import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity()
export default class Plugin {
	@PrimaryColumn()
	id!: string;

	@Column({ type: "simple-json" })
	data!: Record<string, unknown>;
}
