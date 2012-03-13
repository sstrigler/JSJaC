/**
 * @fileoverview Contains all the Facebook Application configurations.
 * @author Andrea Cammarata - acammarata@simacs.com - http://www.andreacammarata.com
 * @version 1.00
 */

/**
 * Creates a new Facebook application object to use if 
 * the JSJaCConnection authtype is set to x-facebook-platform.
 * @class Somewhat abstract base class that keeps all the Facebook auth params.
 * @constructor
 * @param {JSON http://www.json.org/index} oArg JSON with properties: <br>
 * * <code>appID</code> The Facebook Application ID
 * * <code>apiKey</code> The Facebook Application Key
 * * <code>apiKey</code> The Facebook Secret Key
 */
function JSJaCFBApplication(oArg){

	if (oArg && oArg.appID)
		this._appID = oArg.appID;

	if (oArg && oArg.apiKey)
		this._apiKey = oArg.apiKey;

	if (oArg && oArg.apiSecret)
		this._apiSecret = oArg.apiSecret;

	this._perms = '';
		
	this._session = undefined;
	
};

/**
 * @private
 */
JSJaCFBApplication.prototype.Login = function(conn, oArg) {

	var me = this;

	FB.init({ 
		appId: this._appID, 
        status: true
    });

	FB.login(function(response) {
	
		if (response.session) {
			
			if (response.perms) {

				me._perms = response.perms;
				me._session = response.session;

				conn.connect(oArg);

			}
		}
		
	 },{
		perms:'xmpp_login'
	 }
	);
	
};

/**
 * Get the Facebook Application ID.
 * @return string The Facebook Application ID.
 */
JSJaCFBApplication.prototype.getAppID = function(){ return this._appID; };

/**
 * Get the Facebook Api Key.
 * @return string The Facebook Api Key.
 */
JSJaCFBApplication.prototype.getApiKey = function(){ return this._apiKey; };

/**
 * Get the Facebook Api Secret.
 * @return string The Facebook Api Secret.
 */
JSJaCFBApplication.prototype.getApiSecret = function(){ return this._apiSecret; };

/**
 * Get the Facebook Session object.
 * @return object The Facebook Session object retrived after the user
 * has correctly login inside his Facebook account and granted 
 * the xmpp_login privileges to the Facebook Application.
 */
JSJaCFBApplication.prototype.getSession = function(){ return this._session; };