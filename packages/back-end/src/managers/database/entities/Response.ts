import Discord from "discord.js";
import {
	Column,
	Entity,
	JoinTable,
	OneToMany,
	PrimaryColumn,
	PrimaryGeneratedColumn,
} from "typeorm";
import ResponseData from "../interfaces/ResponseData";
import Command from "./Command";

@Entity()
export default class Response {
	@PrimaryGeneratedColumn()
	id!: number;

	@Column({ type: "simple-json" })
	responseData?: {
		list: ResponseData[];
	};

	@OneToMany(() => Command, command => command.response)
	@JoinTable()
	commandResponses?: Command[];
}
