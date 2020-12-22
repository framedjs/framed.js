import { Column, Entity, OneToMany, PrimaryColumn } from "typeorm";
import Command from "./Command";

@Entity()
export default class Group {
	@PrimaryColumn()
	id!: string;

	@OneToMany(() => Command, command => command.group)
	commands?: Command[];

	@Column({ nullable: true })
	emote?: string;

	@Column()
	name!: string;
}
