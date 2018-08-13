const express = require('express');
const app = express();
var net = require('net');
var Web3 = require('web3');

var web3 = new Web3(new Web3.providers.IpcProvider('\\\\.\\pipe\\geth.ipc', net));
web3.providers.IpcProvider.prototype.sendAsync = web3.providers.IpcProvider.prototype.send;

app.listen(3000, function () {
    console.log('Example app is running on port 3000');
});

function Response(success, message, result){
	this.success = success;
	this.message = message;
	this.result = result;
}

app.get('/', function (req, res) {
    res.send('Welcome to Geth Gateway!');
});

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

app.get('/block/:blocknumber', function (req, res) {
    web3.eth.getBlock(req.params.blocknumber, function (error, result) {
        if (error) {
            res.send(new Response("false", error, ""));
        }
        else {
            res.send(new Response("true", "", result));
        }
    });
});

app.get('/transaction/:transaction_hash', function (req, res) {
    web3.eth.getTransaction(req.params.transaction_hash, function (error, result) {
        if (error) {
            res.send(new Response("false", error, ""));
        }
        else {
            res.send(new Response("true", "", result));
        }
    });
});
