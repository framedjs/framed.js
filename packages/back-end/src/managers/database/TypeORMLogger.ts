import { logger } from "shared";
import { Logger, QueryRunner } from "typeorm";

export class TypeORMLogger implements Logger {

    log(level: "log" | "info" | "warn", message: any, queryRunner?: QueryRunner): any {
        switch (level) {
			case "info":
				logger.info(`${message} | ${queryRunner}`);
				break;

			case "warn":
				// logger.warn();
				break;
		
			default:
				break;
		}
    }

    logMigration(message: string, queryRunner?: QueryRunner): any {
        
    }

    logQuery(query: string, parameters?: any[], queryRunner?: QueryRunner): any {
        
    }

    logQueryError(error: string, query: string, parameters?: any[], queryRunner?: QueryRunner): any {
        
    }

    logQuerySlow(time: number, query: string, parameters?: any[], queryRunner?: QueryRunner): any {
        
    }

    logSchemaBuild(message: string, queryRunner?: QueryRunner): any {
        
    }
}