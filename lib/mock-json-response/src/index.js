const fs = require("fs");
const express = require("express");
const app = express();
const processor = require('./server/utils/responseProcessor');
const process = require("process");
const store = require('./server/utils/store');
const logger = require('./server/utils/log');
const handleAdmin = require('./server/utils/admin')
const loadRoutes = require('./server/routes')
let server;
express.json();

class MockJSONResponse {
    constructor(logicDir, dataDir, opts) {
        this.logicDir = logicDir;
        this.dataDir = dataDir;
        this.opts = opts;
        if (!this.validateArguments()) return process.exitCode = 1;
        loadRoutes();
        this.listen();
        this.startServer();
    }

    listen() {
        app.use((req, res, next) => {
            if (RegExp('/__admin').test(req.url)) {
                this.listenAdmin(req, res);
            } else {
                this.listenNonAdmin(req, res);
            }
        });
    }

    validateArguments() {
        this.opts = this.opts || {};
        if (!fs.existsSync(this.logicDir)) {
            logger.info({ message: "logicDir: " + this.logicDir + " path doesn't exist" });
            this.logicDir = undefined;
        }
        if (!fs.existsSync(this.dataDir)) {
            logger.info({ message: "dataDir " + this.dataDir + " path doesn't exist" });
            this.dataDir = undefined;
        }

        //if dir path isn't valid exit the process
        if (!(this.logicDir && this.dataDir)) return false;

        //store the directories
        store.functionDirectory = this.logicDir;
        store.dataDirectory = this.dataDir;
        return true;
    }

    startServer() {
        const port = this.opts.port ? this.opts.port : 3000;
        server = app.listen(port, () => logger.info({ message: `Server started at ${port}` }));
    }

    stopServer() {
        server.close();
    }

    listenAdmin(req, res) {
        const { status, response } = handleAdmin(req);
        res.status(status ? status : 200).send(response);
    }

    listenNonAdmin(req, res) {
        const response = processor.processData(processor.getMatchedStub(req), req);
        res.status(response.status ? response.status : 200).set(response.headers ? { ...response.headers } : {}).json(response.data);
    }
}
module.exports = (logicDir, dataDir, opts) => new MockJSONResponse(logicDir, dataDir, opts);