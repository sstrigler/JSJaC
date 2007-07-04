
function FirebugLogger(level) {
  this.level = level || 4;

  // api compat
  this.start = function() {};
  this.log = function(msg, level) {
    if (level > this.level)
      return;
    switch (level) {
      case 1:
      console.error(msg);
      break;
      default:
      console.log(msg);
      break;
    }
  };
}
