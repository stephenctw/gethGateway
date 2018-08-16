#Prerequisite
1. Have [Geth]https://github.com/ethereum/go-ethereum) installed
2. Have [Node JS](https://nodejs.org/en/) installed

#How to use
1. Run Geth and take note of the IPC endpoint.
2. Open config.json and modify values per needs.
```json
{
	"port":"3000",  // This is the port number the Geth Gateway will run.
	"ipc":"\\\\.\\pipe\\geth.ipc",  // Confirm the previos noted IPC endpoint value here.
	"nodeLimit":{  // This is the configuration of API rate limit for get nodeInfo.
		"windowMs": "900000", // Time windows in ms, 900000ms = 15*60*1000ms = 15 minutes.
		"max": "10", // Maximum requests allowed in the given time window.
		"delayMs": "0",
		"message": "Too many accounts created from this IP, please try again after 15 minutes" // Message to send when maximum requests reached.
	},
	"blockLimit":{  // This is the configuration of API rate limit for get block.
		"windowMs": "900000",
		"max": "10",
		"delayMs": "0",
		"message": "Too many accounts created from this IP, please try again after 15 minutes"
	},
	"transactionLimit":{  // This is the configuration of API rate limit for get transaction or send transaction.
		"windowMs": "900000",
		"max": "10",
		"delayMs": "0",
		"message": "Too many accounts created from this IP, please try again after 15 minutes"
	},
	"minerLimit":{  // This is the configuration of API rate limit for start miner or stop miner.
		"windowMs": "900000",
		"max": "10",
		"delayMs": "0",
		"message": "Too many accounts created from this IP, please try again after 15 minutes"
	}
}
```
3. Double click **restore.cmd** to resotre node packages.
4. Double click **start.cmd** to start Geth Gateway.

#API usage

// get nodeInfo
// GET:http://localhost:{port}/node
// get block by block number
// GET:http://localhost:{port}/block/{block_number}
// get transaction by transaction hash
// GET:http://localhost:{port}/transaction/{transation_hash}
// send transaction
// POST:http://localhost:{port}/transaction?from={from}&to={to}&value={value}
// start miner
// PUT:http://localhost:{port}/miner
// stop miner
// DELETE:http://localhost:{port}/miner
