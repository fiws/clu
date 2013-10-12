var clu = require("../clu");

clu.createCluster({
	exec: './app',
	workers: 2,

});

clu.use(clu.repl('./repl'));