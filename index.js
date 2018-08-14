const express = require('express');
const app = express();
var net = require('net');
var Web3 = require('web3');
var fs = require('fs');

// use for Geth
var web3 = new Web3(new Web3.providers.IpcProvider('\\\\.\\pipe\\geth.ipc', net));
web3.providers.IpcProvider.prototype.sendAsync = web3.providers.IpcProvider.prototype.send;

// use for testing with Ganache
//var web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:8545'));
//web3.providers.HttpProvider.prototype.sendAsync = web3.providers.HttpProvider.prototype.send;

// read port from configuration, set to 3000 if not defined
var config = fs.readFileSync('config.json', 'utf8');
var port = JSON.parse(config).port;
if(port == null || port > 65535 || port < 0)
	port = 3000;

app.listen(port, function () {
    console.log(`Example app is running on port ${port}`);
});

// Response format user get
// user first check success flag
// if true then use look for result in result, message will be empty in this case
// if false then look for error message in message, result will be empty in this case
function Response(success, message, result) {
    this.success = success;
    this.message = message;
    this.result = result;
}

app.get('/', function (req, res) {
    res.send('Welcome to Geth Gateway!');
});

// get nodeInfo
// GET:http://localhost:{port}/node
app.get('/node', function (req, res) {
    web3.currentProvider.sendAsync({
        method: "admin_nodeInfo",
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
});

// get block by block number
// GET:http://localhost:{port}/block/{block_number}
app.get('/block/:block_number', function (req, res) {
    web3.eth.getBlock(req.params.block_number)
		.then(function (result) {
		    res.send(new Response("true", "", result));
		})
		.catch(function (error) {
		    res.send(new Response("false", error, ""));
		});
});

// get transaction by transaction hash
// GET:http://localhost:{port}/transaction/{transation_hash}
app.get('/transaction/:transaction_hash', function (req, res) {
    web3.eth.getTransaction(req.params.transaction_hash)
		.then(function (result) {
		    res.send(new Response("true", "", result));
		})
		.catch(function (error) {
		    res.send(new Response("false", error, ""));
		});
});

// send transaction
// POST:http://localhost:{port}/transaction?from={from}&to={to}&value={value}
app.post('/transaction', function (req, res) {
	web3.eth.sendTransaction(req.query)
		.then(function (result) {
		    res.send(new Response("true", "", result));
		})
		.catch(function (error) {
		    res.send(new Response("false", error, ""));
		});
});

// start miner
// PUT:http://localhost:{port}/miner
app.put('/miner', function (req, res) {
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
});

// stop miner
// DELETE:http://localhost:{port}/miner
app.delete('/miner', function (req, res) {
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
});