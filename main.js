const { constants } = require('node:buffer');
const util = require('node:util');
const exec = util.promisify(require('child_process').exec);
const fs = require('fs');

class Image {
    static counter = 0;

    constructor (code, timeout = 45) {
        this.id = ++Image.counter;

        this.code = code;
        this.timeout = timeout;

        this.imageName;
        this.folderName = `tempImageSource-${this.id}`;
    }

    async init() {
        fs.cpSync('sourceImage', this.folderName, { recursive: true });
        fs.writeFileSync(`${this.folderName}/userCode.py`, this.code);

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
        // this.memoryCap = '512m';
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

const runTask = async (code) => {
    const image = new Image(code);
    await image.init();

    const container = new Container(image);
    await container.init();
    await container.wait();
    await container.calculateUpTime();
    await container.getLogs();

    await container.remove();
    await image.remove();

    const { exitCode, upTimeSeconds } = container;

    console.log({
        timeout: image.timeout,
        exitCode,
        upTimeSeconds,
        logs: container.logs,
    })
    
    return {
        timeout: image.timeout,
        exitCode,
        upTimeSeconds,
        logs: container.logs,
    };
}

const main = async () => {
    console.log('starting testing')
    const inputs = [
        `
import math

def findMaxLine(coords, n): # O(n^2)
    if not n: return 0
    lineMap = {}
    maxPointCount = 0

    for a in range(n):
        for b in range(a + 1, n):
            A = coords[a]
            B = coords[b]
           
            rise = B[1] - A[1]
            run = B[0] - A[0]
            if not run:
                # if we have a vertical line we'll describe it by its infinite slope and x intercept
                m = float('inf')
                y = A[0]
            else: 
                m = rise / run
                y = (A[1] - m * A[0])
            
            lineMap[(m, y)] = lineMap.get((m, y), 0) + 2

            maxPointCount = max(maxPointCount, lineMap[(m, y)])

    return math.floor((1 + math.sqrt(4 * maxPointCount + 1)) / 2)
        `,
        `
def findMaxLine(coords, n): # O(n^2)
    lineMap = {}
    maxPointCount = 0

    for a in range(n):
        for b in range(n):
            A = coords[a]
            B = coords[b]
           
            rise = B[1] - A[1]
            run = B[0] - A[0]
            if not run:
                # if we have a vertical line we'll describe it by its infinite slope and x intercept
                m = float('inf')
                y = A[0]
            else: 
                m = rise / run
                y = (A[1] - m * A[0])

            if (m, y) not in lineMap:
                lineMap[(m, y)] = set()

            lineMap[(m, y)].add(A)
            lineMap[(m, y)].add(B)

            maxPointCount = max(maxPointCount, len(lineMap[(m, y)]))

    return maxPointCount
        `,
        `
def findMaxLine(coords, n):
    
    # create a map to hold the number of points on each line
    # the key is (slope, y_intercept)
    line_maps = {}
    for i in range(n):
        x1 = coords[i][0]
        y1 = coords[i][1]
        for j in range(i + 1, n):
            x2 = coords[i][0]
            y2 = coords[i][1]
            m = (y2 - y1)/(x2 - x1)
            b = y2 - m*x1
            
            line_key = (m, b)
            
            if (m, b) in line_maps:
                line_maps[(m, b)] += 1
            else:
                line_maps[(m, b)] = 2
    max_count = 1
    
    for a in line_maps:
        if line_maps[a] > max_count:
            max_count = line_maps[a]
    
    return max_count
        `
    ];

    const tasks = inputs.map((input) => {
        return runTask(input);
    });

    console.log(await Promise.all(tasks));
}

main();




