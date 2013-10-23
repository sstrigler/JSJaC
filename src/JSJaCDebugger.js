/*exported JSJaCDebugger */
/*jshint unused: false */

/**
 * Interface debuggers (loggers) have to implement in order to be used by JSJaC for debugging.
 * @constructor
 */
function JSJaCDebugger() {}

/**
 * Log a message.
 * @param {string} message The message to be logged.
 * @param {int} [level] The loglevel of the message to be logged. 
 */
JSJaCDebugger.prototype.log = function(message, level) {};