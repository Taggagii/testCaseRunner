const util = require('node:util');
const exec = util.promisify(require('child_process').exec);
const fs = require('fs');
const path = require('path')

class Image {
    static counter = 0;

    constructor(userCode, week, timeout = 0) {
        this.id = ++Image.counter;

        this.code = userCode;
        this.week = week;
        this.testersFolderPath = path.join(__dirname, 'testers');
        this.weekFolderPath = path.join(this.testersFolderPath, this.week.toString());
        this.timeout = timeout;

        this.imageName;
        this.tempImageSourceFolderPath = path.join(__dirname, `tempImageSource-${this.id}`);
    }

    async init() {
        fs.cpSync(path.join(__dirname, 'sourceImage'), this.tempImageSourceFolderPath, { recursive: true }); // copies the docker image source files
        fs.cpSync(this.weekFolderPath, this.tempImageSourceFolderPath, { recursive: true }); // copies the test code in
        fs.writeFileSync(path.join(this.tempImageSourceFolderPath, 'userCode.py'), this.code); // writes the user code

        const runnerName = `runner-${this.id}`;

        try {
            await exec(`docker build --rm --quiet ${this.tempImageSourceFolderPath} -t ${runnerName} --build-arg="RUNNER_TIMEOUT=${this.timeout}"`);

            this.imageName = runnerName;
            console.log('Created image:', this.imageName);
        } catch (error) {
            console.error('ENCOUNTERED ERROR WHILE BUILDING IMAGE', error);
        } finally {
            fs.rmSync(this.tempImageSourceFolderPath, { recursive: true });
        }
    }

    async remove() {
        await exec(`docker image rm -f ${this.imageName}`);
    }

}

class Container {
    constructor(image) {
        this.image = image;
        // this.memoryCap = '128m';
        this.memoryCap = '750m';
        this.cpuShares = 64;
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

        const { StartedAt, FinishedAt } = this.stats[0].State;

        const s = new Date(StartedAt);
        const e = new Date(FinishedAt);

        this.upTimeSeconds = (e - s) / 1000;
    }

    async getStats() {
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

    async getLogs() {
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

    async wait() {
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

    async init() {
        this.status = "Creating container";
        const { stdout, stderr } = await exec(`docker run --cpu-shares=${this.cpuShares} --memory=${this.memoryCap} --network=${this.network} --read-only --detach ${this.image.imageName}`);

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

const runTask = async (code, week, timeout) => {
    const image = new Image(code, week, timeout);
    await image.init();

    const container = new Container(image);
    await container.init();
    await container.wait();
    await container.calculateUpTime();
    await container.getLogs();

    await container.remove();
    await image.remove();

    const { exitCode, upTimeSeconds, logs } = container;

    return {
        timeout,
        exitCode,
        upTimeSeconds,
        logs,
    };
}

module.exports = {
    Image,
    Container,
    runTask,
}
