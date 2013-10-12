var net = require('net');
 

var connect = exports.connect = function(port){
	if (!port) port = "./.clu/repl.sock";
	var sock = net.connect(port);
 
	process.stdin.pipe(sock);
	sock.pipe(process.stdout);
	 
	sock.on('connect', function () {
		process.stdin.setRawMode(true);
	});
	 
	process.stdin.on('end', function () {
		sock.destroy();
		console.log();
		process.exit();
	});

	sock.on("end", function(){
		sock.end();
		process.exit();
	});
	 
	process.stdin.on('data', function (b) {
	  if (b.length === 1 && b[0] === 4) {
	    process.stdin.emit('end');
	  }
	});
};

if(require.main === module) connect();