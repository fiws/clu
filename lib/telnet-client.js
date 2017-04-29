var net = require('net');
 

var connect = exports.connect = port => {
	if (!port) port = "./.clu/repl.sock";
	var sock = net.connect(port);
 
	process.stdin.pipe(sock);
	sock.pipe(process.stdout);
	 
	sock.on('connect', () => {
		process.stdin.setRawMode(true);
	});
	 
	process.stdin.on('end', () => {
		sock.destroy();
		console.log();
		process.exit();
	});

	sock.on("end", () => {
		sock.end();
		process.exit();
	});
	 
	process.stdin.on('data', b => {
	  if (b.length === 1 && b[0] === 4) {
	    process.stdin.emit('end');
	  }
	});
};

if(require.main === module) connect();