var clu = require("../clu");

clu.createCluster({
	exec: './app',
	workers: 2,
	cli: true,
	silentWorkers: true
});

clu.use(clu.repl('./repl'));