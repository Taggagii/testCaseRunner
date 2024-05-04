const { constants } = require('node:buffer');
const util = require('node:util');
const exec = util.promisify(require('child_process').exec);
const fs = require('fs');

class Image {
    static counter = 0;

    constructor (code, timeout = 250) {
        this.id = ++Image.counter;

        this.code = code;
        this.timeout = timeout;

        this.imageName;
        this.folderName = `tempImageSource-${this.id}`;
    }

    async init() {
        fs.cpSync('sourceImage', this.folderName, { recursive: true });
        fs.writeFileSync(`${this.folderName}/main.py`, this.code);

        const runnerName = `runner-${this.id}`;

        try {
            await exec(`docker build --rm --quiet ${this.folderName} -t ${runnerName} --build-arg="RUNNER_TIMEOUT=${this.timeout}"`);

            this.imageName = runnerName;
            console.log('Created image:', this.imageName);
        } catch (error) {
            console.error('ENCOUNTERED ERROR WHILE BUILDING IMAGE', error);
        } finally {
            fs.rmSync(this.folderName, { recursive: true });
        }
    }

    async remove() {
        await exec(`docker image rm -f ${this.imageName}`);
    }

}

class Container {
    constructor (image) {
        this.image = image;
        this.memoryCap = '256m';
        this.cpuShares = 256;
        this.network = 'none';

        this.containerId;
        this.exitCode;
        this.status = 'Empty';
        this.logs = "";
        this.stats = "";

        this.upTimeSeconds = 0;

    }

    async calculateUpTime() {
        if (!this.stats || this.stats[0].State.Running) {
            await this.getStats();
        }

        const {StartedAt, FinishedAt} = this.stats[0].State;

        const s = new Date(StartedAt);
        const e = new Date(FinishedAt);

        this.upTimeSeconds = (e - s) / 1000;        
    }

    async getStats () {
        const { stdout, stderr } = await exec(`docker container inspect ${this.containerId}`);

        if (stderr.length) {
            this.status = `ENCOUNTERED ERROR GETTING STATS FOR ${this.containerId}: ${stderr}`;
            console.error(this.status);
            this.exitCode = -1;
            return;
        }

        this.status = "Stats retrieved";
        this.stats = JSON.parse(stdout);
    }

    async getLogs () {
        const { stdout, stderr } = await exec(`docker container logs ${this.containerId}`);

        if (stderr.length) {
            this.status = `ENCOUNTERED ERROR GETTING LOGS FOR ${this.containerId}: ${stderr}`;
            console.error(this.status);
            this.exitCode = -1;
            return;
        }

        this.status = "Logs retrieved";
        this.logs = stdout;
    }

    async wait () {
        this.status = `Waiting for ${this.containerId}`;
        // console.log(this.status);

        const { stdout, stderr } = await exec(`docker container wait ${this.containerId}`);

        if (stderr.length) {
            this.status = `ENCOUNTERED ERROR WAITING ON ${this.containerId}: ${stderr}`;
            console.error(this.status);
            this.exitCode = -1;
            return;
        }

        this.status = "Finished waiting";
        this.exitCode = Number(stdout.trim());
    }

    async init () {
        this.status = "Creating container";
        const { stdout, stderr } = await exec(`docker run --memory=${this.memoryCap} --cpu-shares=${this.cpuShares} --network=${this.network} --detach ${this.image.imageName}`);

        this.startTime = Date.now()

        if (stderr.length) {
            this.status = `ENCOUNTERED AN ERROR ${stderr}`;
            console.log(this.status);
            return;
        }

        this.containerId = stdout.trim();
        this.status = `Created container: ${this.containerId}`;
        console.log(this.status)
    }

    async remove() {
        await exec(`docker container rm -f ${this.containerId}`);
    }
}

const runTask = async (code) => {
    const image = new Image(code);
    await image.init();

    const container = new Container(image);
    await container.init();
    await container.wait();
    await container.calculateUpTime();
    // await container.getLogs();

    await container.remove();
    await image.remove();

    const { exitCode, upTimeSeconds } = container;

    return {
        timeout: image.timeout,
        exitCode,
        upTimeSeconds,
        logs,
    };
}

const main = async () => {
    console.log('starting testing')
    const inputs = [
        `
import time
import sys


counter = 1
while (counter < 5):
    print('Counter', counter)
    counter += 1
    time.sleep(1)

    
print('leaving')
        `
    ];

    const tasks = inputs.map((input) => {
        return runTask(input);
    });

    console.log(await Promise.all(tasks));
}

main();




