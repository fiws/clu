clu
========
cluster without ster... name might change

A cluster manager inspired by [cluster](https://github.com/LearnBoost/cluster).

Features:

* zero downtime restarts
* restarts workers one after another (to prevent performance hit)
* add or remove workers on the fly

## Usage
1. `npm install --save clu`
2. Create a server.js that starts your app.
``` JavaScript
	var clu = require("clu");

	clu.createCluster({
		workers: 2,
		silent: false,
		silentWorkers: true,
		cli: true
	});

	clu.use(clu.repl());
```
3. start your cluster via `node server start` or `node server &` (if you have cli disabled)

## Commands

usage: `node server [options] <verb>`
these only work if you have the 'cli' option enabled.

### start
Will start the server

### stop
Will stop all workers and the master

### reload
Respawns all workers one after another

### repl
Only works if you `clu.use(clu.repl())`
Throws you in a repl.

### scaleup <x>
Start x number of workers

### scaledown <x>
Stop x number of workers
Use --force to kill them


![](http://i.imgur.com/E5l57ct.png)