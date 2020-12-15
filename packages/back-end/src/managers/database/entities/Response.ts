import { Column, Entity, OneToMany, PrimaryColumn } from "typeorm";
import { ResponseData } from "../interfaces/ResponseData";
import Command from "./Command";

@Entity()
export default class Response {
	@PrimaryColumn()
	id!: string;

	@Column({ nullable: true })
	description?: string;

	@Column({ type: "simple-json" })
	responseData?: {
		list: ResponseData[];
	};

	@OneToMany(() => Command, command => command.response)
	commandResponses?: Command[];
}
