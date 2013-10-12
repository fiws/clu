clu
========
*cluster without ster... name might change - Still under development!*

A cluster manager with a built in CLI and a simple API for plugins.
clu will spawn the requested number of workers, which will share the same port. This way the load gets distributed across all workers and multiple cores can be used effectively. It uses the [node cluster API](http://nodejs.org/api/cluster.html) to do this.

Inspired by [cluster](https://github.com/LearnBoost/cluster).


**Features:**

![](https://i.imgur.com/81MqBtB.png)

* built in CLI (optional)
* zero downtime restarts
* restarts workers one after another (to prevent performance hit)
* add or remove workers on the fly
* uses the node cluster API

[![Build Status](https://travis-ci.org/fiws/clu.png?branch=master)](https://travis-ci.org/fiws/clu) [![Dependency Status](https://david-dm.org/fiws/clu.png)](https://david-dm.org/fiws/clu)



## Getting Started
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

Start your cluster with `node server start` 

or just `node server` (if you have the cli disabled)

Important note from the node.js API docs:
> There is no shared state between the workers. Therefore, it is important to design your program such that it does not rely too heavily on in-memory data objects for things like sessions and login.

This applies to your 'app.js'.


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
Stops x amount of workers. Will cb after all workers have disconnected. Will throw if you stop more workers than available.

#### clu.workers(cb)
Calls back with an array of workers. Returns workesr if no callback is given.

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

#### clu.use(plugin)
Use given Plugin. This will just call it with `plugin.call(clu, clu)`


### Events
Event emited by clu. Uses the node EventEmitter. Listen on events like:
``` JavaScript
clu.on("progress", fuction(data){
	console.log(data);
});
```

#### progress

* data `Object` - Holds task progress

Emitted if a task makes progress. Example data from a scaleUp task:

``` JavaScript
{
	task: "scaleUp",
	total: 4, // scaling up by 4
	current: 2 // to new worker are online yet
}

```

### Attributes
clu.[attribute]

#### cluster
The underlying node cluster.

#### logger
A crappy logger. Uses util.format to output the message. It has the folling methods:

* logger.log(msg)
* logger.info(msg)
* logger.warn(msg)
* logger.debug(msg)

#### dir
Absolute `.clu` directory where the pids live.

#### options
The options the cluster was started with. Example:

``` JavaScript
{
	exec: '/tmp/test/app.js',
	workers: 2,
	silent: false,
	silentWorkers: true,
	cli: true
}
```



## Plugins
Plugins can be used like this:
``` JavaScript
var cluDnode = require("clu-dnode");
clu.use(cluDnode());
clu.use(clu.repl());
```

**Built in:**

* clu.repl() - a repl interface

**Own:**

* [clu-dnode](https://github.com/fiws/clu-dnode) - dnode interface for clu

**3rd Party:**
contact me if you create any :)


## License
MIT