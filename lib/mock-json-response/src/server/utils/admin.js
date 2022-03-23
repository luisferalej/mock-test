const store = require('./store');

module.exports = (req) => {
    let response={error: "InValid Admin Route"}, status=200;
    if (req.method !== "POST") {
        status = 400;
        response = {
            error: "You have reached an invalid admin route",
            tip: "check request method"
        }
    } else {
        if (RegExp('/__admin/(.*)/reset').test(req.url)) {
            resetScenario(response, status);
        }

    }
    return { status, response };
}

const resetScenario = (response, status) => {
    const scenario = RegExp('/__admin/(.*)/reset').exec(req.url)[1];
    logger.info({ message: "Received an admin request to reset scenario", scenario });

    if (store.scenarioMap[decodeURI(scenario)]) {

        store.scenarioMap[decodeURI(scenario)].presentState = 'init';
        status = 200;
        response = { message: "Succefully reset state of scenario: " + decodeURI(scenario) }
    }
    else if (scenario === 'all') {
        response = { message: "All scenarios are succefully reset" }
        status = 200;
    } else {
        status = 404;
        response = {
            message: "Error while resetting state",
            tip: decodeURI(scenario) + " scenario was not found"
        }
    }
}