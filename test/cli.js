/* globals describe, it, before */
var should = require("should");

describe("cli", function(){
	describe("require", function(){

		it("should NOT throw if master is not running", function(){
			// command line tools should not *throw* for simple stuff like that (?)
			(function(){
				require("../cli");
			}).should.not.throw(/not running/);
		});

	});

});