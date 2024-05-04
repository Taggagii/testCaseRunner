import random, time, math, glob, sys
import numpy as np
from ast import literal_eval


MAX_INT = 2147483647

try:
    from userCode import findMaxLine

    testCaseFiles = glob.glob('testcases/*')
    times = []
    for testCaseFile in testCaseFiles:
        file = open(testCaseFile, 'r')
        coords = literal_eval(file.readline())
        solution = int(file.readline())
        file.close()

        s = time.time()
        usersSolution = findMaxLine(coords, len(coords))
        e = time.time()

        if (usersSolution != solution):
            print('Failed test case', testCaseFile)
            sys.exit(1)

        times.append([testCaseFile, e - s])
except Exception as e:
    print("USERS CODE THREW AN ERROR", e)
    sys.exit(2)

# print('Times:', times)
print('Average Time:', sum([i[1] for i in times]) / len(times))
