import { Column, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToOne, PrimaryColumn } from "typeorm";
import Prefix from "./Prefix";
import Response from "./Response";

@Entity()
export default class Command {
	@PrimaryColumn()
	id!: string;
	
	@OneToOne(() => Prefix, prefix => prefix.commands)
	@JoinColumn()
	defaultPrefix!: Prefix;

	@ManyToMany(() => Prefix, prefix => prefix.commands)
	@JoinTable()
	prefixes!: Prefix[];

	@ManyToOne(() => Response, response => response.commandResponses)
	response!: Response;
}