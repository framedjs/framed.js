import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity()
export default class Prefix {
	@PrimaryColumn()
	id!: string;

	@Column()
	prefix!: string
}
