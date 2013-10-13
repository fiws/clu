clu
========
*cluster without ster... name might change - Still under development!*

A cluster manager with a built in CLI and a simple API for plugins.
clu will spawn the requested number of workers, which will share the same port. This way the load gets distributed across all workers and multiple cores can be used effectively. It uses the [node cluster API](http://nodejs.org/api/cluster.html) to do this.

Inspired by [cluster](https://github.com/LearnBoost/cluster).

![](https://i.imgur.com/81MqBtB.png)



**Features:**

* built in CLI (optional)
* zero downtime restarts
* restarts workers one after another
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

3. **Start your cluster with `node server start`**

**Use `node server --help` for a list of all commands.**


You can also start the server with `node server`. This will start the server in the foreground.


## Documentation

* [Command Line](https://github.com/fiws/clu/wiki/Commands)
* [API](https://github.com/fiws/clu/wiki/API)


## Plugins
Plugins can be used like this:
``` JavaScript
var cluDnode = require("clu-dnode");
clu.use(cluDnode());
clu.use(clu.repl('myRepl.sock'));
```

**Built in:**

* clu.repl() - a repl interface

**Official:**

* [clu-dnode](https://github.com/fiws/clu-dnode) - dnode interface for clu

**3rd Party:**
contact me if you create any :)


## License
MIT
