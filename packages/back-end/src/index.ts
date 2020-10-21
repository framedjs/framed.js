// Tries to get environmental variables if it doesn't exist
// const dotenv = require("dotenv").config({ path: `${process.cwd()}/../.env` });
// if (dotenv.error) {
// 	throw dotenv.error;
// }
// console.log(dotenv.parsed);

// import { createUser, showUser, User } from 'shared';
// const user: User = createUser('t7yang', 18);
// showUser(user);

// Platforms
import * as Discord from "discord.js";

// Database and JSON imports
import * as TypeORM from "typeorm";

import * as Shared from "shared";
import FramedClient from "./FramedClient";
import settings from "../../../settings.json";
import { version } from "../../../package.json";

const logger = Shared.logger;
logger.info(`Launching Framed version ${version}...`);

export const framedClient = new FramedClient();
// import util from "util";
// logger.info(util.inspect(framedClient));
framedClient.login(settings.token);
