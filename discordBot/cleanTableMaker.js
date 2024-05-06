
const { Console } = require('node:console');
const { Transform } = require('node:stream');

const ts = new Transform({
    transform(chunk, enc, cb) {
        cb(null, chunk)
    }
});

const logger = new Console({ stdout: ts });

const makeCleanTable = (data) => {
    logger.table(data);
    const table = (ts.read() || '').toString();
    
    const tableLines = table.trim().split('\n')
    const firstBreak = tableLines[0].split('').findIndex((c) => c === '┬');
    
    const newTableLines = tableLines.map((line) => {
        const newLine = line.slice(firstBreak + 1);
        let startingCharacter = line[firstBreak];
    
        switch (startingCharacter) {
            case '┬':
                startingCharacter = '┌';
                break;
            case '┼':
                startingCharacter = '├';
                break;
            case '┴':
                startingCharacter = '└';
                break;
        }
    
        return ' ' + startingCharacter + newLine;
    })
    
    const newTable = newTableLines.join('\n');

    return newTable;
}

module.exports = {
    makeCleanTable,
}
