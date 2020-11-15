// Tries to get environmental variables if it doesn't exist
// const dotenv = require("dotenv").config({ path: `${process.cwd()}/../.env` });
// if (dotenv.error) {
// 	throw dotenv.error;
// }
// console.log(dotenv.parsed);

// import { createUser, showUser, User } from 'shared';
// const user: User = createUser('t7yang', 18);
// showUser(user);

import { logger } from "shared";
import { version } from "../../../package.json";
import { version as backEndVersion } from "../package.json";

import FramedClient from "./structures/FramedClient";
import settings from "../../../settings.json";

logger.info(`Launching Framed v${version}, back-end v${backEndVersion}.`);

export const framedClient = new FramedClient({
	defaultPrefix: ".",
	backEndVersion: backEndVersion,
});
framedClient.login(settings.token);
