
function FirebugLogger(level) {
  this.level = level || 4;

  // api compat
  this.start = function() {};
  this.log = function(msg, level) {
    level = level || 0;
    if (level > this.level)
      return;
    if (typeof(console) == 'undefined') 
      return;
    switch (level) {
    case 0:
      console.warn(msg);
      break;
    case 1:
      console.error(msg);
      break;
    case 2:
      console.info(msg);
      break;
    case 4:
      console.debug(msg);
      break;
    default:
      console.log(msg);
      break;
    }
  };
}
