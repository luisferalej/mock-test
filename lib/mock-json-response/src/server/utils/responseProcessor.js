const path = require('path');
const store = require('./store');


const getHeaderMatchedStubs = (reqHeaders, stubs) => {
    const incomingHeaders = Object.keys(reqHeaders);
    const files = Object.keys(stubs);
    const allMatchedMappings = [];
    let max_weight = 0;
    files.forEach((file) => {
        const headers = stubs[file];
        const matchedHeaders = headers
            .filter((header) => incomingHeaders.includes(header.header))
            .filter((header) => header.match(reqHeaders[header.header]))
            .map((header) => header.header);
        if (matchedHeaders.length === headers.length) {
            allMatchedMappings.push({ file, size: headers.length });
            if (headers.length > max_weight) max_weight = headers.length;
        }
    });
    return { allMatchedMappings, max_weight };
};


const processData = (file, req) => {
    if (typeof "String" !== typeof file) {
        return { data: file, status: 200 };
    }
    const logicFile = require(path.join(store.functionDirectory, file));
    const res = logicFile.response;
    if (res.inlineData) {
        res.data = res.inlineData;
    } else {
        res.data = require(path.join(store.dataDirectory, res.bodyFileName));
    }
    logicFile.logic && logicFile.logic(req, res);
    return res;
}

const urlMatcher = (URLpattern, incomingURL) => {
    const regex = RegExp(URLpattern);
    return regex.test(incomingURL)
}

const getMatchedStub = ({ url, headers, method }) => {
    const routes = store.routes;
    const scenarioMap = store.scenarioMap;
    const allstubs = store.stubs;
    let stubs = {}, urlsWithMethods;

    const matchedURLs = Object.keys(routes).filter(route => urlMatcher(route, url)).map(route => route);
    if (matchedURLs.length === 0) {
        return { error: "No matched URL" };
    } else {
        urlsWithMethods = matchedURLs.filter(url => routes[url][method]).map(url => url);
        if (urlsWithMethods.length === 0) return { error: "No Matched Request method" };
    }

    urlsWithMethods.forEach(route => {
        const multipleStubs = routes[route][method];
        Object.keys(multipleStubs).forEach(stubName => {
            stubs[stubName] = multipleStubs[stubName];
        })
    })

    const { allMatchedMappings, max_weight } = getHeaderMatchedStubs(headers, stubs);
    if (allMatchedMappings.length === 0) {
        return { warning: "No perfect headers match" }
    }
    if (allMatchedMappings.length === 1) {
        //perfect match of headers
        const matchedFile = allMatchedMappings[0].file;
        return processScenario(allstubs, scenarioMap, matchedFile);
    } else {
        //have multiple matches
        const processedScenarios = allMatchedMappings
            .filter(singleFile => allstubs[singleFile.file].request.scenario)
            .map(singleFile => processScenario(allstubs, scenarioMap, singleFile.file));
        if (processedScenarios.length !== 0) {
            const fileNames = processedScenarios
                .filter(processedScenario => typeof processedScenario === typeof "String")
                .map(files => files);
            if (fileNames.length === 0) {
                return {
                    warning: "there was a match, but ignored as it was not fulfilling the state",
                    tip: "if you didn't intend that to happen please remove scenario in request",
                    possibleMatches: allMatchedMappings
                }
            } else if (fileNames.length === 1) {
                return fileNames[0];
            } else {
                return {
                    warning: "There multiple matches for this request after scenarios are applied",
                    values: fileNames
                }
            }
        }
        const weighted_stubs = assignWeights(allMatchedMappings, max_weight);
        return {
            warning: "There multiple matches for this request",
            values: weighted_stubs
        }
    }
};

const assignWeights = (files, max_weight) => {
    const ret=[];
    files.forEach(file => {
        ret.push({file: file.file, weight:Math.ceil((file.size / max_weight) * 100) + '%'});
    })
    return ret;
}

const processScenario = (allstubs, scenarioMap, matchedFile) => {
    const presentScenario = allstubs[matchedFile].request.scenario;
    if (!presentScenario) return matchedFile;
    const presentStage = scenarioMap[presentScenario].presentState;
    const targetState = allstubs[matchedFile].request.targetState;
    if (!targetState) {
        //get stub match with the stage
        const stubState = allstubs[matchedFile].request.state;
        if (stubState === presentStage) {
            return matchedFile;
        } else {
            return {
                warning: "there was a match, but ignored as it was not fulfilling the state",
                tip: "if you didn't intend that to happen please remove scenario in request"
            }
        }
    } else {
        //increment the state of files  as present state and return the response
        scenarioMap[presentScenario].presentState = targetState;
        return matchedFile;
    }
}

exports.processData = processData;
exports.getMatchedStub = getMatchedStub;