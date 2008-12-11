
var JSJAC_HAVEKEYS = true;          // whether to use keys
var JSJAC_NKEYS    = 16;            // number of keys to generate
var JSJAC_INACTIVITY = 300;         // qnd hack to make suspend/resume 
                                    // work more smoothly with polling
var JSJAC_ERR_COUNT = 10;           // number of retries in case of connection errors

var JSJAC_ALLOW_PLAIN = true;       // whether to allow plaintext logins

var JSJAC_CHECKQUEUEINTERVAL = 1;   // msecs to poll send queue
var JSJAC_CHECKINQUEUEINTERVAL = 1; // msecs to poll incoming queue
var JSJAC_TIMERVAL = 2000;          // default polling interval

// Options specific to HTTP Binding (BOSH)
var JSJACHBC_MAX_HOLD = 1;          // default for number of connctions held by 
                                    // connection maanger 
var JSJACHBC_MAX_WAIT = 300;        // default 'wait' param - how long an idle connection
                                    // should be held by connection manager

var JSJACHBC_BOSH_VERSION  = "1.6";
var JSJACHBC_USE_BOSH_VER  = true;

var JSJACHBC_MAXPAUSE = 120;        // how long a suspend/resume cycle may take

/*** END CONFIG ***/

