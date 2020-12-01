import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import Command from "./Command";

@Entity()
export default class Group {
	@PrimaryGeneratedColumn()
	id!: string;
	
	@ManyToOne(() => Command, command => command.group)
	@JoinColumn()
	commands!: Command[];

	@Column()
	name!: string;
}