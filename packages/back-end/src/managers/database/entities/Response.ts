import { Column, Entity, OneToMany, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";
import ResponseData from "../interfaces/ResponseData";
import Command from "./Command";

@Entity()
export default class Response {
	@PrimaryColumn()
	id!: string;

	@Column({ type: "simple-json" })
	responseData?: {
		description: string;
		list: ResponseData[];
	};

	@OneToMany(() => Command, command => command.response)
	commandResponses?: Command[];
}
