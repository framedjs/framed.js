import { Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, PrimaryColumn } from "typeorm";
import Group from "./Group";
import Prefix from "./Prefix";
import Response from "./Response";

@Entity()
export default class Command {
	@PrimaryColumn()
	id!: string;
	
	@ManyToOne(() => Group, category => category.commands)
	group!: Group;

	@ManyToOne(() => Prefix, prefix => prefix.defaultCommands)
	@JoinColumn()
	defaultPrefix!: Prefix;

	@ManyToMany(() => Prefix, prefix => prefix.commands)
	@JoinTable()
	prefixes!: Prefix[];

	@ManyToOne(() => Response, response => response.commandResponses)
	response!: Response;
}