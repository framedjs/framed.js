import { Column, Entity, ManyToMany, PrimaryColumn } from "typeorm";
import Command from "./Command";

@Entity()
export default class Prefix {
	@PrimaryColumn()
	id!: string;

	@Column()
	prefix!: string;

	@ManyToMany(() => Command, command => command.prefixes)
	commands?: Command[]
}
