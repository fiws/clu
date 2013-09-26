var net = require('net');
 
var sock = net.connect('./.clu/repl.sock');
 
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