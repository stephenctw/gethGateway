const express = require("express");
const app = express();
const net = require("net");
const Web3 = require("web3");
const fs = require("fs");
const RateLimit = require("express-rate-limit");
const workerpool = require("workerpool");
const defaults = require("defaults");
const lodash = require("lodash");

// constants
const defaultPort = 3000;
const defaultRpc = "\\\\.\\pipe\\geth.ipc";
const defaultLimit = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    delayMs: 0, // disabled
    message: "Too many requests sent from this IP, please try again after 15 minutes"
};
const defaultWorker = {
    minWorkers: 1,
    maxWorkers: 1
};
const defaultConfig = {
    port: defaultPort,
    rpc: defaultRpc,
    nodeLimit: defaultLimit,
    blockLimit: defaultLimit,
    transactionLimit: defaultLimit,
    minerLimit: defaultLimit,
    worker: defaultWorker
};

// functions to validate configurations
function validateRateLimit(limit){
	if(!lodash.isObject(limit)){
		return false;
	}
	if(!limit.hasOwnProperty('windowMs') || !lodash.isNumber(limit.windowMs)){
		return false;
	}
	if(!limit.hasOwnProperty('max') || !lodash.isNumber(limit.max)){
		return false;
	}
	if(!limit.hasOwnProperty('delayMs') || !lodash.isNumber(limit.delayMs)){
		return false;
	}
	if(!limit.hasOwnProperty('message') || !lodash.isString(limit.message)){
		return false;
	}
	return true;
}

function validateWorker(worker){
	if(!lodash.isObject(worker)){
		return false;
	}
	if(!worker.hasOwnProperty('minWorkers') || !lodash.isNumber(worker.minWorkers)){
		return false;
	}
	if(!worker.hasOwnProperty('maxWorkers') || !lodash.isNumber(worker.maxWorkers)){
		return false;
	}
	return true;
}

function validateConfiguration() {
    if (!lodash.isObject(config)) {
        config = defaultConfig;
    }
    if (!config.hasOwnProperty('port') || !lodash.isNumber(config.port) || config.port > 65535 || config.port < 0) {
        config.port = defaultPort;
    }
	if(!config.hasOwnProperty('nodeLimit') || !validateRateLimit(config.nodeLimit)){
		config.nodeLimit = defaultLimit;
	}
	if(!config.hasOwnProperty('blockLimit') || !validateRateLimit(config.blockLimit)){
		config.blockLimit = defaultLimit;
	}
	if(!config.hasOwnProperty('transactionLimit') || !validateRateLimit(config.transactionLimit)){
		config.transactionLimit = defaultLimit;
	}
	if(!config.hasOwnProperty('minerLimit') || !validateRateLimit(config.minerLimit)){
		config.minerLimit = defaultLimit;
	}
	if(!config.hasOwnProperty('worker') || !validateWorker(config.worker)){
		config.worker = defaultWorker;
	}
}

// create web3 from rpc
function web3Factory(rpc) {
    if (rpc.length >= 4 && rpc.substring(0, 4) === 'http') {
        var web3 = new Web3(new Web3.providers.HttpProvider(rpc));
        web3.providers.HttpProvider.prototype.sendAsync = web3.providers.HttpProvider.prototype.send;
    }
    else {
        var web3 = new Web3(new Web3.providers.IpcProvider(rpc, net));
        web3.providers.IpcProvider.prototype.sendAsync = web3.providers.IpcProvider.prototype.send;
    }
    return web3;
}

// worker function to send Transaction
function transactionWorker(rpc, data) {
    const net = require("net");
    const Web3 = require("web3");
    let web3;

    if (rpc.length >= 4 && rpc.substring(0, 4) === 'http') {
        web3 = new Web3(new Web3.providers.HttpProvider(rpc));
        web3.providers.HttpProvider.prototype.sendAsync = web3.providers.HttpProvider.prototype.send;
    }
    else {
        web3 = new Web3(new Web3.providers.IpcProvider(rpc, net));
        web3.providers.IpcProvider.prototype.sendAsync = web3.providers.IpcProvider.prototype.send;
    }

    web3.eth.sendTransaction(data)
        .then(function (result) {
            console.log(result);
        })
        .catch(function (error) {
            console.error(error);
        });
}

// Response format user get
// user first check "success" flag
// if true then user look for result in "result" field, "message" will be empty in this case
// if false then look for error message in "message" field, "result" will be empty in this case
function Response(success, message, result) {
    this.success = success;
    this.message = message;
    this.result = result;
}

// program start from here
// read configuration, and check values, set to default if not valid
try {
    var config = defaults(JSON.parse(fs.readFileSync("config.json", "utf8")), defaultConfig);
}
catch (ex) {
    console.log("config.json file not found, load default.");
    var config = defaultConfig;
}
validateConfiguration();

var pool = workerpool.pool(config.worker);
var web3 = web3Factory(config.rpc);

app.listen(config.port, function () {
    console.log(`Gateway app is running on port ${config.port}`);
});

app.get("/", new RateLimit(defaultLimit), function (req, res) {
    res.send("Welcome to Geth Gateway!");
});

// get nodeInfo
// GET:http://localhost:{port}/node
app.get("/node", new RateLimit(config.nodeLimit), function (req, res) {
    web3.currentProvider.sendAsync({
        method: "admin_nodeInfo",
        jsonrpc: "2.0",
        id: new Date().getTime()
    }, function (error, result) {
        if (error) {
            res.status(404).send(new Response(false, "Fail to get nodeInfo", ""));
        }
        else {
            if ((lodash.isObject(result) && result.hasOwnProperty('result')) && (result.result !== null)) {
                res.send(new Response(true, "", result.result));
            }
            else {
                res.status(404).send(new Response(false, "Fail to get nodeInfo", ""));
            }
        }
    });
});

// get block by block number
// GET:http://localhost:{port}/block/{block_number}
app.get("/block/:block_number", new RateLimit(config.blockLimit), function (req, res) {
    web3.eth.getBlock(req.params.block_number)
        .then(function (result) {
            if (result === null) {
                return Promise.reject("Block not found");
            }
            res.send(new Response(true, "", result));
        })
        .catch(function (error) {
            res.status(404).send(new Response(false, error, ""));
        });
});

// get transaction by transaction hash
// GET:http://localhost:{port}/transaction/{transation_hash}
app.get("/transaction/:transaction_hash", new RateLimit(config.transactionLimit), function (req, res) {
    web3.eth.getTransaction(req.params.transaction_hash)
        .then(function (result) {
            if (result === null) {
                return Promise.reject("Transaction not found");
            }
            res.send(new Response(true, "", result));
        })
        .catch(function (error) {
            res.status(404).send(new Response(false, error, ""));
        });
});

// send transaction
// POST:http://localhost:{port}/transaction?from={from}&to={to}&value={value}
app.post("/transaction", new RateLimit(config.transactionLimit), function (req, res) {
    res.status(202).send(new Response(true, "", "Transaction sent."));

    pool.exec(transactionWorker, [config.rpc, req.query])
        .catch(function (error) {
            console.error(error);
        });
});

// start miner
// PUT:http://localhost:{port}/miner
app.put("/miner", new RateLimit(config.minerLimit), function (req, res) {
    web3.currentProvider.sendAsync({
        method: "miner_start",
        params: "1",
        jsonrpc: "2.0",
        id: new Date().getTime()
    }, function (error, result) {
        if (error) {
            res.send(new Response(false, error, ""));
        }
        else {
            if ((lodash.isObject(result) && result.hasOwnProperty('result'))) {
                res.status(201).send(new Response(true, "", result.result));
            }
            else {
                res.status(500).send(new Response(false, "Fail to start miner", ""));
            }
        }
    });
});

// stop miner
// DELETE:http://localhost:{port}/miner
app.delete("/miner", new RateLimit(config.minerLimit), function (req, res) {
    web3.currentProvider.sendAsync({
        method: "miner_stop",
        jsonrpc: "2.0",
        id: new Date().getTime()
    }, function (error, result) {
        if (error) {
            res.send(new Response(false, error, ""));
        }
        else {
            if ((lodash.isObject(result) && result.hasOwnProperty('result'))) {
                res.send(new Response(true, "", result.result));
            }
            else {
                res.status(500).send(new Response(false, "Fail to stop miner", ""));
            }
        }
    });
});
