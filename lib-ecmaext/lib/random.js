require.modify(
    "ecmaext",
    "ecmaext/random",
    function(){

/**
 * Appends a random number with a specified length to this String instance.
 *
 * @see randomGenerator
 * @param {Number} length
 * @type  {String}
 */
String.prototype.appendRandomNumber = function(length) {
    for (var arr = [], i = 1; i <= length; i++)
        arr.push(Math.randomGenerator.generate(1, 9));
    // Create a new string from the old one, don't just create a copy
    return this.toString() + arr.join("");
};

/**
 * Prepends a random number with a specified length to this String instance.
 *
 * @see randomGenerator
 * @param {Number} length
 * @type  {String}
 */
String.prototype.prependRandomNumber = function(length) {
    for (var arr = [], i = 1; i <= length; i++)
        arr.push(Math.randomGenerator.generate(1, 9));
    // Create a new string from the old one, don't just create a copy
    return arr.join("") + this.toString();
};

/**
 * This random number generator has been added to provide a more robust and
 * reliable random number spitter than the native Ecmascript Math.random()
 * function.
 * is an implementation of the Park-Miller algorithm. (See 'Random Number
 * Generators: Good Ones Are Hard to Find', by Stephen K. Park and Keith W.
 * Miller, Communications of the ACM, 31(10):1192-1201, 1988.)
 * @author David N. Smith of IBM's T. J. Watson Research Center.
 * @author Mike de Boer (mike AT javeline DOT com)
 * @class randomGenerator
 */
Math.randomGenerator = {
    d: new Date(),
    seed: null,
    A: 48271,
    M: 2147483647,
    Q: null,
    R: null,
    oneOverM: null,

    /**
     * Generates a random Number between a lower and upper boundary.
     * The algorithm uses the system time, in minutes and seconds, to 'seed'
     * itself, that is, to create the initial values from which it will generate
     * a sequence of numbers. If you are familiar with random number generators,
     * you might have reason to use some other value for the seed. Otherwise,
     * you should probably not change it.
     * @param {Number} lnr Lower boundary
     * @param {Number} unr Upper boundary
     * @result A random number between <i>lnr</i> and <i>unr</i>
     * @type Number
     */
    generate: function(lnr, unr) {
        if (this.seed == null)
            this.seed = 2345678901 + (this.d.getSeconds() * 0xFFFFFF) + (this.d.getMinutes() * 0xFFFF);
        this.Q = this.M / this.A;
        this.R = this.M % this.A;
        this.oneOverM = 1.0 / this.M;
        return Math.floor((unr - lnr + 1) * this.next() + lnr);
    },

    /**
     * Returns a new random number, based on the 'seed', generated by the
     * <i>generate</i> method.
     * @type Number
     */
    next: function() {
        var hi = this.seed / this.Q;
        var lo = this.seed % this.Q;
        var test = this.A * lo - this.R * hi;
        if (test > 0)
            this.seed = test;
        else
            this.seed = test + this.M;
        return (this.seed * this.oneOverM);
    }
};

});