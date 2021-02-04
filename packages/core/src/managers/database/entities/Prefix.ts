import { Platform } from "../../../types/Platform";
import { Column, Entity, ManyToMany, OneToMany, PrimaryColumn } from "typeorm";
import Command from "./Command";

@Entity()
export default class Prefix {
	@PrimaryColumn()
	id!: string;

	@PrimaryColumn()
	placeId!: string;

	@PrimaryColumn()
	platform!: Platform;

	@Column()
	prefix!: string;

	@OneToMany(() => Command, command => command.defaultPrefix)
	defaultCommands!: Command[];

	@ManyToMany(() => Command, command => command.prefixes)
	commands?: Command[];
}
