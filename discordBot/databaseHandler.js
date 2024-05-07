require('dotenv').config();
const db = require('mysql2/promise');

class WeeksTable {
    constructor() {
        this.connection;
    }

    async init() {
        this.connection = await db.createConnection({
            host: process.env.MYSQL_HOST,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE,
        });
          
        await this.connection.query(`
            CREATE TABLE IF NOT EXISTS weeks (
                userId varchar(36) NOT NULL,
                weekNumber int unsigned NOT NULL,
                executionTime float unsigned NOT NULL,
                finished tinyint NOT NULL DEFAULT '0',
                code mediumtext NOT NULL,
                PRIMARY KEY (userId,weekNumber)
            ); 
        `)
    }

    async updateRecord(userId, weekNumber, executionTime, finished, code) {
        userId = Number(userId);
        weekNumber = Number(weekNumber);
        executionTime = Number(executionTime);
        finished = Boolean(finished);
        code = String(code);

        try {
            await this.connection.query(`
                INSERT INTO weeks (userId, weekNumber, executionTime, finished, code)
                VALUES(?, ?, ?, ?, ?) as newWeek
                ON DUPLICATE KEY UPDATE executionTime=newWeek.executionTime, finished=newWeek.finished, code=newWeek.code;
            `, [userId, weekNumber, executionTime, finished, code]);
        } catch (error) {
            console.error(error);
        }
    }

    async getUserRecords(userId) {
        userId = Number(userId);

        const [data, types] = await this.connection.query(`
            SELECT weekNumber, executionTime, finished FROM weeks
            WHERE userId=? 
        `, [userId]);

        if (!data.length) {
            return undefined;
        }

        return data;
    }
    
    async getRecord(userId, weekNumber) {
        userId = Number(userId);
        weekNumber = Number(weekNumber)

        const [data, types] = await this.connection.query(`
            SELECT executionTime, finished FROM weeks
            WHERE (userId, weekNumber) = (?, ?)
            LIMIT 1; 
        `, [userId, weekNumber]);

        if (!data.length) {
            return undefined;
        }

        return data[0];
    }
}

const weeksTable = new WeeksTable();

// const main = async () => {
//     console.log('testing things')

//     await weeksTable.init();

//     await weeksTable.updateRecord(55555, 4, 124, 1);

//     console.log(await weeksTable.getRecord(55555, 4))
// }

// main()


module.exports = {
    weeksTable,
};
