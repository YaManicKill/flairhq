/* global module, Application, User, Reddit */
var moment = require('moment');
var refreshToken = sails.config.reddit.adminRefreshToken;
var _ = require("lodash");

module.exports = {

  apply: async function (req, res) {
    try {
      var allFlairs = await Flair.find();
      var userRefs = await Reference.find({user: req.user.name});
      var appData = {user: req.user.name, flair: req.allParams().flair, sub: req.allParams().sub};
      if (await Application.findOne(appData)) {
        return res.status(400).json({error: 'You have already applied for that flair'});
      }
      var flairIndex = allFlairs.map(function (flairObj) {
        return flairObj.name;
      }).indexOf(req.allParams().flair);
      if (flairIndex === -1) {
        return res.status(400).json({error: 'That flair does not exist'});
      }
      var applicationFlair = allFlairs[flairIndex];
      if (!Flairs.canUserApply(userRefs, applicationFlair, Flairs.getUserFlairs(req.user, allFlairs))) {
        return res.status(400).json({error: 'You do not qualify for that flair'});
      }
      return res.ok(await Application.create(appData));
    } catch (err) {
      return res.serverError(err);
    }
  },

  denyApp: async function (req, res) {
    try {
      var matching_apps = await Application.destroy(req.allParams().id);
      var apps = await Flairs.getApps();
      if (!matching_apps.length) {
        return res.status(404).json(apps);
      }
      return res.ok(apps);
    } catch (err) {
      return res.serverError(err);
    }
  },

  approveApp: async function (req, res) {
    try {
      var app = await Application.findOne(req.allParams().id);
      if (!app) {
        return res.status(404).json(await Flairs.getApps());
      }
      var user = await User.findOne(app.user);
      var shortened = app.sub === 'pokemontrades' ? 'ptrades' : 'svex';
      var css_flair = Flairs.makeNewCSSClass(_.get(user, 'flair.' + shortened + '.flair_css_class') || '', app.flair, app.sub);
      user.flair[shortened].flair_css_class = css_flair;   
      let current_text = user.flair[shortened].flair_text.replace(/:[a-zA-Z0-9_-]*:/g,'');
      let flair_text = Flairs.makeNewFlairText(css_flair, current_text, shortened);

      // Check length of flair_text and give a warning message
      var warning = '';
      if (flair_text.length > 64) {
        warning = ' However, the length of your flair was too long, so your flair text was trimmed automatically. Please go to [FHQ](https://hq.porygon.co) to set your flair again.';
        flair_text = Flairs.makeNewFlairText(css_flair, current_text.slice(0,55), shortened);
      }

      // Set the user's flair
      await Reddit.setUserFlair(req.user.redToken, user.name, css_flair, flair_text, app.sub);
      var promises = [];
      promises.push(user.save());
      promises.push(Event.create({type: "flairTextChange", user: req.user.name,content: "Changed " + user.name + "'s flair to " + css_flair}));

      // Send a PM to let them know application was accepted.
      var pmContent = 'Your application for ' + Flairs.formattedName(app.flair) + ' flair on /r/' + app.sub + ' has been approved.' + warning;
      promises.push(Reddit.sendPrivateMessage(refreshToken, 'FlairHQ Notification', pmContent, user.name));
      promises.push(Application.destroy({id: req.allParams().id}));
      await* promises;
      sails.log.info("/u/" + req.user.name + ": Changed " + user.name + "'s flair to " + css_flair);
      return res.ok(await Flairs.getApps());
    } catch (err) {
      return res.serverError(err);
    }
  },

  setText: async function (req, res) {
    var flairs;
    try {
      flairs = Flairs.flairCheck(req.allParams().ptrades, req.allParams().svex);
    } catch (e) {
      return res.status(400).json({error: e});
    }
    try {
      var appData = {
        limit: 1,
        sort: "createdAt DESC",
        user: req.user.name,
        type: "flairTextChange"
      };
      var events = await Event.find(appData);
      var now = moment();
      if (events.length) {
        var then = moment(events[0].createdAt);
        then.add(2, 'minutes');
        if (then.isAfter(now)) {
          return res.status(400).json({error: "You set your flair too recently, please try again in a few minutes."});
        }
      }

      var blockReport = _.isEqual(flairs.fcs, req.user.loggedFriendCodes.slice(0, flairs.fcs.length));

      var flagged = _.reject(flairs.fcs, Flairs.validFC);
      var ipAddress = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.ip;
      // Get IP matches with banned users
      var events_with_ip = await Event.find({content: RegExp('IP: '+ipAddress.replace(/\./,'\\.')+'$'), user: {not: req.user.name}});

      var matching_ip_usernames = _.uniq(_.map(events_with_ip, 'user'));
      var matching_ip_users = await User.find({name: matching_ip_usernames});
      var matching_ip_banned_users = matching_ip_users.filter(user => user.banned);

      var ignoredAlts = ['0000-0000-0000', '1111-1111-1111'];
      var users_with_matching_fcs = await User.find({loggedFriendCodes: flairs.fcs.filter((fc) => !ignoredAlts.includes(fc)), name: {not: req.user.name}});
      var logged_fcs = _.flatten(_.map(users_with_matching_fcs, 'loggedFriendCodes'));
      var matching_friend_codes = _.intersection(flairs.fcs, logged_fcs);
      var matching_fc_usernames = _.map(users_with_matching_fcs, 'name');

      // Get friend codes that are similar (have a low edit distance) to banned friend codes
      var similar_banned_fcs = _.flatten(await* flairs.fcs.map(Flairs.getSimilarBannedFCs));
      // Get friend codes that are identical to banned users' friend codes
      var identical_banned_fcs = _.intersection(flairs.fcs, similar_banned_fcs);

      var friend_codes = _.union(flairs.fcs, req.user.loggedFriendCodes);

      var pFlair = _.get(req, "user.flair.ptrades.flair_css_class") || "default";
      var svFlair = _.get(req, "user.flair.svex.flair_css_class") || "";
      svFlair = svFlair.replace(/2/, "");
      
      // Build flair text for ptrades and svex from css class
      var ptrades_current_text = flairs.ptrades;
      var ptrades_flair_text = Flairs.makeNewFlairText(pFlair, ptrades_current_text, 'ptrades');
      
      var svex_current_text = flairs.svex;
      var svex_flair_text = Flairs.makeNewFlairText(svFlair, svex_current_text, 'svex');

      var promises = [];
      var eventFlair = null; // Change to req.allParams().eventFlair during events

      if (eventFlair) {
        if (_.includes(Flairs.eventFlair, eventFlair) && !(pFlair.match(Flairs.eventFlairRegExp))) {
          let team = await Team.find({"members": req.user.name});
          if (team.length) {
            return res.status(400).json({error: "You have already selected a starter!"});
          }
          req.user.team = _.includes(Flairs.kantoFlair, eventFlair) ? "kanto" : "alola";
          pFlair = Flairs.makeNewCSSClass(pFlair, `kva-${eventFlair}-1`, "PokemonTrades");
          module.exports.addMembershipPoints(req, res, "add").then(() => {
            promises.push(Reddit.setUserFlair(refreshToken, req.user.name, pFlair, ptrades_flair_text, "PokemonTrades").catch((err) => {
              sails.log.warn(`Reverting team ${req.user.team} join for ${req.user.name} due to the following error:`);
              sails.log.warn(err);
              module.exports.addMembershipPoints(req, res, "remove");
              throw err;
            }));
          });
        } else {
          return res.status(400).json({error: "Unexpected extra flair."});
        }
      } else {
        promises.push(Reddit.setUserFlair(refreshToken, req.user.name, pFlair, ptrades_flair_text, "PokemonTrades"));
      }
      promises.push(Reddit.setUserFlair(refreshToken, req.user.name, svFlair, svex_flair_text, "SVExchange"));
      promises.push(User.update({name: req.user.name}, {loggedFriendCodes: friend_codes}));

      if (!blockReport && (users_with_matching_fcs.length !== 0 || matching_ip_usernames.length !== 0 || flagged.length)) {
        var message = 'The user /u/' + req.user.name + ' set the following flairs:\n\n' + ptrades_flair_text + '\n\n' + svex_flair_text + '\n\n';
        if (users_with_matching_fcs.length !== 0) {
          message += 'This flair contains a friend code that matches ' + '/u/' + matching_fc_usernames.join(', /u/') + '\'s friend code: ' + matching_friend_codes + '\n\n';
          var altNote = "Alt of " + matching_fc_usernames;
          promises.push(await Usernotes.addUsernote(refreshToken, 'FlairHQ', 'pokemontrades', req.user.name, altNote, 'spamwarn', ''));
          var otherAltNote = "Alt of " + req.user.name;
          matching_fc_usernames.forEach(async function(entry){
            promises.push(await Usernotes.addUsernote(refreshToken, 'FlairHQ', 'pokemontrades', entry, otherAltNote, 'spamwarn', ''));
          });
          if (identical_banned_fcs.length) {
            message += '**This flair contains a banned friend code: ' + identical_banned_fcs + '**\n\n';
          } else if (flagged.length && similar_banned_fcs.length) {
            message += '**This flair contains a friend code similar to the following banned friend code' + (  similar_banned_fcs.length > 1 ? 's: ' : ': ') + similar_banned_fcs.join(', ') + '**\n\n';
          }
        }
        if (matching_ip_usernames.length !== 0) {
          message += 'This user may be an alt of the user' + (matching_ip_usernames.length === 1 ? '' : 's') + ' /u/' + matching_ip_usernames.join(', /u/') + '.\n\n';
          promises.push(await Usernotes.addUsernote(refreshToken, 'FlairHQ', 'pokemontrades', req.user.name, altNote, 'spamwarn', ''));
          matching_ip_usernames.forEach(async function(entry){
            promises.push(await Usernotes.addUsernote(refreshToken, 'FlairHQ', 'pokemontrades', entry, otherAltNote, 'spamwarn', ''));
          });
          if (matching_ip_banned_users.length) {
            message += '**' + '/u/' + matching_ip_banned_users.map(user => user.name).join(', /u/') + ' is banned.**\n\n';
          }
        }
        if (flagged.length) {
          message += 'The friend code' + (flagged.length === 1 ? ' ' + flagged + ' is' : 's ' + flagged.join(', ') + ' are') + ' invalid.\n\n';
          var formattedNote = "Invalid friend code" + (flagged.length == 1 ? "" : "s") + ": " + flagged.join(', ');
          promises.push(await Usernotes.addUsernote(refreshToken, 'FlairHQ', 'pokemontrades', req.user.name, formattedNote, 'spamwarn', ''));
        }
        message = message.slice(0,-2);
        promises.push(Reddit.sendPrivateMessage(refreshToken, "FlairHQ notification", message, "/r/pokemontrades"));
      }
      Promise.all(promises).then(function () {
        Event.create([{
          type: "flairTextChange",
          user: req.user.name,
          content: "Changed PokemonTrades flair text to: " + req.allParams().ptrades + ". IP: " + ipAddress
        }, {
          type: "flairTextChange",
          user: req.user.name,
          content: "Changed SVExchange flair text to: " + req.allParams().svex + ". IP: " + ipAddress
        }]).exec(function () {});
        User.native(function(err, collection) {
          collection.update({"_id": req.user.name}, {
            $set:{
              "flair.ptrades.flair_text": ptrades_flair_text,
              "flair.ptrades.flair_css_class": pFlair,
              "flair.svex.flair_text": svex_flair_text,
              "flair.svex.flair_css_class": svFlair
            }
          });
        });
        return res.ok();
      });
      
    } catch (err) {
      return res.serverError(err);
    }
  },

  getApps: async function (req, res) {
    try {
      return res.ok(await Flairs.getApps());
    } catch (err) {
      return res.serverError(err);
    }
  },

  refreshClaim: async function (req, res) {
    try {
      await Flairs.refreshAppClaim(req.allParams(), req.user.name);
      return res.ok();
    } catch (err) {
      return res.serverError(err);
    }
  },

  addMembershipPoints: async function (req, res, action) {

    try {
      var promises = [];

      promises.push(PointLog.create({
        time: new Date(),
        team: req.user.team,
        from: req.user.name,
        pointType: "membershipPoints",
        reason: action === "add" ? "Joined team" : "Reverted join",
        points: action === "add" ? 1 : -1
      }));

      promises.push(Team.native(function(err, collection) {
        collection.update(
          {"_id": req.user.team},
          action === "add" ? {$push: {"members": req.user.name}, $inc: {"membershipPoints": 1}} : {$pull: {"members": req.user.name}, $inc: {"membershipPoints": -1}}
        );
      }));

      if (action === "remove") {
        promises.push(ContestStats.native(function(err, collection) {
          collection.deleteOne({
            _id: req.user.name
          });
        }));
      } else {
        promises.push(ContestStats.create({
          user: req.user.name,
          expPoints: 1,
          battleWins: 0
        }));
      }

      await* promises;

    } catch (err) {
      return res.serverError(err);
    }

  }
};
