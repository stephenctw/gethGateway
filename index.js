const express = require("express");
const app = express();
const net = require("net");
const Web3 = require("web3");
const fs = require("fs");
const RateLimit = require("express-rate-limit");
const queue = require("express-queue");
const defaults = require("defaults");

// read configuration, and check values, reset to default if not invalid
const defaultLimit = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    delayMs: 0, // disabled
    message: "Too many accounts created from this IP, please try again after 15 minutes"
};
const defaultConfig = {
    port: "3000",
    ipc: "\\\\.\\pipe\\geth.ipc",
    nodeLimit: defaultLimit,
    blockLimit: defaultLimit,
    transactionLimit: defaultLimit,
    minerLimit: defaultLimit
};
try {
    var config = defaults(JSON.parse(fs.readFileSync("config.json", "utf8")), defaultConfig);
}
catch (ex) {
    console.log("config.json file not found, load default.");
    var config = defaultConfig;
}

// use for Geth
//var web3 = new Web3(new Web3.providers.IpcProvider(config.ipc, net));
//web3.providers.IpcProvider.prototype.sendAsync = web3.providers.IpcProvider.prototype.send;

// use for testing with Ganache
var web3 = new Web3(new Web3.providers.HttpProvider("http://127.0.0.1:8545"));
web3.providers.HttpProvider.prototype.sendAsync = web3.providers.HttpProvider.prototype.send;

app.listen(config.port, function () {
    console.log(`Gateway app is running on port ${config.port}`);
});

// Response format user get
// user first check "success" flag
// if true then user look for result in "result" field, "message" will be empty in this case
// if false then look for error message in "message" field, "result" will be empty in this case
function Response(success, message, result) {
    this.success = success;
    this.message = message;
    this.result = result;
}

app.get("/", new RateLimit(defaultLimit), function (req, res) {
    res.send("Welcome to Geth Gateway!");
});

// get nodeInfo
// GET:http://localhost:{port}/node
app.get("/node", new RateLimit(config.nodeLimit), function (req, res) {
    if (web3.currentProvider.isConnected) {
        web3.currentProvider.sendAsync({
            method: "admin_nodeInfo",
            jsonrpc: "2.0",
            id: new Date().getTime()
        }, function (error, result) {
            if (error || result.result == null) {
                res.status(404).send(new Response("false", "Fail to get nodeInfo", ""));
            }
            else {
                res.send(new Response("true", "", result.result));
            }
        });
    }
    else {
        res.status(502).send(new Response("false", "Fail connecting to Geth", ""));
    }
});

// get block by block number
// GET:http://localhost:{port}/block/{block_number}
app.get("/block/:block_number", new RateLimit(config.blockLimit), function (req, res) {
    if (web3.currentProvider.isConnected) {
        web3.eth.getBlock(req.params.block_number)
			.then(function (result) {
			    if (result == null) {
			        return Promise.reject("Block not found");
			    }
			    res.send(new Response("true", "", result));
			})
			.catch(function (error) {
			    res.status(404).send(new Response("false", error, ""));
			});
    }
    else {
        res.status(502).send(new Response("false", "Fail connecting to Geth", ""));
    }
});

// get transaction by transaction hash
// GET:http://localhost:{port}/transaction/{transation_hash}
app.get("/transaction/:transaction_hash", new RateLimit(config.transactionLimit), function (req, res) {
    if (web3.currentProvider.isConnected) {
        web3.eth.getTransaction(req.params.transaction_hash)
            .then(function (result) {
                if (result == null) {
                    return Promise.reject("Transaction not found");
                }
                res.send(new Response("true", "", result));
            })
            .catch(function (error) {
                res.status(404).send(new Response("false", error, ""));
            });
    }
    else {
        res.status(502).send(new Response("false", "Fail connecting to Geth", ""));
    }
});

// send transaction
// POST:http://localhost:{port}/transaction?from={from}&to={to}&value={value}
app.post("/transaction", queue({ activeLimit: 1, queuedLimit: -1 }), new RateLimit(config.transactionLimit), function (req, res) {
    if (web3.currentProvider.isConnected) {
        web3.eth.sendTransaction(req.query)
            .then(function (result) {
                res.send(new Response("true", "", result));
            })
            .catch(function (error) {
                res.send(new Response("false", error, ""));
            });
    }
    else {
        res.status(502).send(new Response("false", "Fail connecting to Geth", ""));
    }
});

// start miner
// PUT:http://localhost:{port}/miner
app.put("/miner", new RateLimit(config.minerLimit), function (req, res) {
    if (web3.currentProvider.isConnected) {
        web3.currentProvider.sendAsync({
            method: "miner_start",
            params: "1",
            jsonrpc: "2.0",
            id: new Date().getTime()
        }, function (error, result) {
            if (error) {
                res.send(new Response("false", error, ""));
            }
            else {
                res.send(new Response("true", "", result.result));
            }
        });
    }
    else {
        res.status(502).send(new Response("false", "Fail connecting to Geth", ""));
    }
});

// stop miner
// DELETE:http://localhost:{port}/miner
app.delete("/miner", new RateLimit(config.minerLimit), function (req, res) {
    if (web3.currentProvider.isConnected) {
        web3.currentProvider.sendAsync({
            method: "miner_stop",
            jsonrpc: "2.0",
            id: new Date().getTime()
        }, function (error, result) {
            if (error) {
                res.send(new Response("false", error, ""));
            }
            else {
                res.send(new Response("true", "", result.result));
            }
        });
    }
    else {
        res.status(502).send(new Response("false", "Fail connecting to Geth", ""));
    }
});