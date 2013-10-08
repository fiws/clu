clu
========
*cluster without ster... name might change*

A cluster manager inspired by [cluster](https://github.com/LearnBoost/cluster). *Still under development!*


**Features:**

![](https://i.imgur.com/nPBT1eS.png)

* built in CLI (optional)
* zero downtime restarts
* restarts workers one after another (to prevent performance hit)
* add or remove workers on the fly
* uses the node cluster API

> [![Build Status](https://travis-ci.org/fiws/clu.png?branch=master)](https://travis-ci.org/fiws/clu)


## Setup
1. `npm install --save clu`
2. Create a server.js that starts your app.

``` JavaScript
var clu = require("clu");

clu.createCluster({
	exec: "./app.js",
	workers: 2,
	silent: false,
	silentWorkers: true,
	cli: true
});
// short: clu.createCluster("./app.js");

clu.use(clu.repl());
```
Start your cluster with `node server start` or `node server &` (if you have the cli disabled)


## Commands

**`node server --help`** will output all available commands

These only work if you have the 'cli' option enabled.

### repl
Only works if you `clu.use(clu.repl())`
Throws you in a repl.
![](https://i.imgur.com/nrJRC2S.png)

### start
Will start the server and throw you back into your terminal.

### stop
Will stop all workers and the master.

### restart
Respawns all workers one after another.

### restart-master
Will restart the master process. (This will cause a downtime!).

### scaleup x
Start x number of workers

### scaledown x
Stop x number of workers
Use --force to kill them


## API

### Methods

#### clu.createCluster(options)
Creates a new cluster.

**Options**

* `exec` - the file to execute (required)
* `workers` - Number of workers, will default to the number of cores
* `silent` - Boolean: Makes the master & workers silent (default: false)
* `silentWorkers` - Boolean: If true workers output won't be displayed (default: true)
* `cli` - Boolean: Enables the CLI. (default: true)


#### clu.restart(cb)
Respawns all workers one after one and calls the callback after all workers have been respawned.


#### clu.restartMaster(cb)
Restarts the master process. Calls the callback when all workers have disconnected.


#### clu.stop(cb)
Stops the master process and all workers. Callback gets called when all workers disconnect.

#### clu.stopWorkers(cb)
Stops the all workers but not the master process. Callback gets called when all workers disconnect.


#### clu.scaleUp(num, cb)
Spawns x new workers. Will cb after all new workers are listening.


#### clu.scaleDown(num, cb)
Stops x amount of workers. Will cb after all workers have disconnected. Will throw if you stop more workers than available or you try to stop all (use `clu.stop() or clu.stopWorkers()` for that).

#### clu.workers(cb)
Calls back with an array of workers. Returns if no callback is given.

#### clu.status()
Returns some status data. Example:
```JavaScript
{ 
	workers: { 
		total: 2,
		active: 2,
		pending: 0,
		averageUptime: 22.2365 
	},
	master: {
		uptime: 22.4090,
		memoryUsage: {
			rss: 17698816,
			heapTotal: 12376832,
			heapUsed: 4889800 
		}
	}
}
```




## Plugins
Plugins can be used like this:
``` JavaScript
var cluAwesome = require("clu-awesome");
clu.use(cluAwesome());
clu.use(clu.repl());
```

**Built in:**

* clu.repl() - a repl interface

**Own:**

* [clu-dnode](https://github.com/fiws/clu-dnode) - dnode interface for clu

**3rd Party:**
contact me if you create any :)


## Licence
MIT