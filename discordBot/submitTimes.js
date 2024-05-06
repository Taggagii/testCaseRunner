const submitTimes = {};

const msPerMinute = 60 * 1000;
const timeRange = 10 * msPerMinute;
const maxCumulativeExecutionTime = timeRange / 2;

const updateUser = (userId) => {
    const curTime = Date.now();
    if (!Object.prototype.hasOwnProperty.call(submitTimes, userId)) {
        submitTimes[userId] = {
            lastClearedTime: curTime,
            cumulativeExecutionTime: 0,
            currentlyRunningCode: false,
        }
        return;
    }

    if (curTime - submitTimes[userId].lastClearedTime > timeRange) {
        submitTimes[userId].lastClearedTime = curTime;
        submitTimes[userId].cumulativeExecutionTime = 0;
    }
}

const canUserSubmit = (userId) => {
    updateUser(userId);

    if (submitTimes[userId].currentlyRunningCode) {
        return false;
    }

    return submitTimes[userId].cumulativeExecutionTime < maxCumulativeExecutionTime;
}

const timeUntilClear = (userId) => {
    updateUser(userId);
    const curTime = Date.now();

    const timeSinceLastCleared = curTime - submitTimes[userId].lastClearedTime;

    return timeRange - timeSinceLastCleared;
}

const remainingTime = (userId) => {
    updateUser(userId);

    console.log(submitTimes[userId], maxCumulativeExecutionTime)

    return maxCumulativeExecutionTime - submitTimes[userId].cumulativeExecutionTime;
}

module.exports = {
    submitTimes,
    timeUntilClear,
    canUserSubmit,
    remainingTime,
};
