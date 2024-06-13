"use strict";
/**
 * Route Mappings
 * (sails.config.routes)
 *
 * Your routes map URLs to views and controllers.
 *
 * If Sails receives a URL that doesn't match any of the routes below,
 * it will check for matching files (images, scripts, stylesheets, etc.)
 * in your assets directory.  e.g. `http://localhost:1337/images/foo.jpg`
 * might match an image file: `/assets/images/foo.jpg`
 *
 * Finally, if those don't match either, the default 404 handler is triggered.
 * See `api/responses/notFound.js` to adjust your app's 404 logic.
 *
 * Note: Sails doesn't ACTUALLY serve stuff from `assets`-- the default Gruntfile in Sails copies
 * flat files from `assets` to `.tmp/public`.  This allows you to do things like compile LESS or
 * CoffeeScript for the front-end.
 *
 * For more information on configuring custom routes, check out:
 * http://sailsjs.org/#/documentation/concepts/Routes/RouteTargetSyntax.html
 */

module.exports.routes = {

  /***************************************************************************
  *                                                                          *
  * Make the view located at `views/homepage.ejs` (or `views/homepage.jade`, *
  * etc. depending on your default view engine) your home page.              *
  *                                                                          *
  * (Alternatively, remove this and add an `index.html` file in your         *
  * `assets` directory)                                                      *
  *                                                                          *
  ***************************************************************************/

  'get /' : {
    controller : 'home',
    action: 'index'
  },

  'get /u/:user' : {
    controller: 'home',
    action: 'reference'
  },

  'get /user/get/:name' : {
    controller : 'user',
    action     : 'get'
  },

  'post /user/addNote' : {
    controller : 'user',
    action     : 'addNote'
  },

  'post /user/delNote' : {
    controller : 'user',
    action     : 'delNote'
  },

  'get /login' : {
    controller : 'auth',
    action     : 'index'
  },

  'get /logout' : {
    controller : 'auth',
    action     : 'logout'
  },

  'get /auth/reddit': {
    controller: 'auth',
    action: 'reddit'
  },

  'get /auth/reddit/callback' : {
    controller : 'auth',
    action     : 'callback'
  },

  'post /reference/add' : {
    controller : 'reference',
    action     : 'add'
  },

  'post /reference/edit' : {
    controller : 'reference',
    action     : 'edit'
  },

  'post /reference/approve' : {
    controller : 'reference',
    action     : 'approve'
  },

  'post /reference/approve/all' : {
    controller : 'reference',
    action     : 'approveAll'
  },

  'post /reference/delete' : {
    controller : 'reference',
    action     : 'deleteRef'
  },

  'post /reference/comment/add' : {
    controller : 'reference',
    action     : 'comment'
  },

  'post /reference/comment/del' : {
    controller : 'reference',
    action     : 'delComment'
  },

  'post /reference/rejectWithNote' : {
    controller : 'reference',
    action     : 'rejectWithNote'
  },

  'get /flair/all' : {
    controller : 'reference',
    action     : 'getFlairs'
  },

  'post /flair/save' : {
    controller : 'reference',
    action     : 'saveFlairs'
  },

  'post /flair/apply' : {
    controller : 'flair',
    action     : 'apply'
  },

  'get /flair/apps/all' : {
    controller : 'flair',
    action     : 'getApps'
  },

  'post /flair/app/approve' :{
    controller : 'flair',
    action     : 'approveApp'
  },

  'post /flair/app/deny' :{
    controller : 'flair',
    action     : 'denyApp'
  },

  'post /flair/app/refreshClaim': {
    controller: 'flair',
    action: 'refreshClaim'
  },

  'post /flair/setText': {
    controller: 'flair',
    action: 'setText'
  },

  'post /user/edit' : {
    controller : 'user',
    action     : 'edit'
  },

  'post /user/ban' : {
    controller : 'user',
    action     : 'ban'
  },

  'post /mod/setlocalban' : {
    controller : 'user',
    action     : 'setLocalBan'
  },

  'get /mod/banuser' : {
    controller  : 'home',
    action      : 'banuser'
  },
  'get /user/banned' : {
    controller : 'user',
    action     : 'bannedUsers'
  },

  'post /clearsession/:name' : {
    controller : 'user',
    action     : 'clearSession'
  },

  'get /mod/applist' : {
    controller : 'home',
    action     : 'applist'
  },

  'get /mod/banlist' : {
    controller : 'home',
    action     : 'banlist'
  },

  'get /event/get': {
    controller: 'event',
    action: 'get'
  },

  'get /info' : {
    controller : 'home',
    action     : 'info'
  },

  'get /tools' : {
    controller : 'home',
    action     : 'tools'
  },

  'get /version' : {
    controller : 'home',
    action     : 'version'
  },
  
  'get /discord' : {
    controller : 'home',
    action     : 'discord'
  },
  
  'get /discord/callback' : {
    controller  : 'auth',
    action      : 'discordCallback'
  }
};

var searchTypes = require("../assets/search/types.js");

for (let i = 0; i < searchTypes.length; i++) {
  // Programatically add the routes for searches
  let type = searchTypes[i];
  module.exports.routes['get /search/' + type.short] = {
    controller: 'search',
    action: type.short
  };
  module.exports.routes['get /search/' + type.short + "/:searchterm"] = {
    controller: 'search',
    action: type.short + "View"
  };
}
