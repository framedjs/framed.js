import { Column, Entity, PrimaryColumn } from "typeorm";
import Prefix from "./Prefix";

@Entity()
export default class Command {
	@PrimaryColumn()
	id!: string;
	
	@Column()
	defaultPrefix!: Prefix;

	@Column()
	prefixes!: Prefix[];
}