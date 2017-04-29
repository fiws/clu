/* globals describe, it, before */
var should = require("should");

describe("cli", () => {
	describe("require", () => {

		// will not throw anyway because there are not enough paramters
		it("should NOT throw if master is not running", () => {
			// command line tools should not *throw* for simple stuff like that (?)
			((() => {
				require("../cli");
			})).should.not.throw(/not running/);
		});

	});

});