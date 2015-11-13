/**
 * UserController
 *
 * @description :: Server-side logic for managing Users
 */

var Q = require('q');
var _ = require('lodash');

module.exports = {

  edit: function (req, res) {
    req.params = req.allParams();
    User.findOne(req.params.username, function (err, user) {
      if (!user) {
        return res.notFound("Can't find user");
      } else if (user.name !== req.user.name && !req.user.isMod) {
        return res.forbidden("You can't edit another user's information unless you are a mod.");
      } else {
        var updatedUser = {};
        if (req.params.intro !== undefined) {
          updatedUser.intro = req.params.intro;
        }
        if (req.params.fcs !== undefined) {
          updatedUser.friendCodes = req.params.fcs;
        }

        User.update(user.name, updatedUser).exec(function (err, up) {
          if (err) {
            res.serverError(err);
          }

          var promises = [],
            games = [];

          Game.find().where({user: user.name}).exec(function (err, games) {
            games.forEach(function (game) {
              var deleteGame = true;
              req.params.games.forEach(function (game2) {
                if (game.id === game2.id) {
                  deleteGame = false;
                }
              });
              if (deleteGame) {
                promises.push(Game.destroy(game.id));
              }
            });
          });

          req.params.games.forEach(function (game) {
            if (game.id && (game.tsv || game.ign)) {
              promises.push(Game.update(
                {id: game.id},
                {tsv: parseInt(game.tsv), ign: game.ign}).exec(function (err, game) {
                  if (err) {
                    console.log(err);
                    res.serverError(err);
                  } else {
                    games.push(game);
                  }
                }
                ));
            } else if (!game.id && (game.tsv || game.ign)) {
              promises.push(Game.create({user: user.name, tsv: parseInt(game.tsv), ign: game.ign}).exec(function (err, game) {
                if (err) {
                  console.log(err);
                  res.serverError(err);
                } else {
                  games.push(game);
                }
              }));
            }
          });

          Q.all(promises).then(function () {
            up.games = games;
            res.ok(up);
          });
        });
      }
    });
  },

  mine: function (req, res) {
    Game.find()
      .where({user: req.user.name})
      .exec(function (err, games) {
        req.user.games = games;

        var appData = {
          user: req.user.name
        };

        Application.find(appData).exec(function (err, app) {
          if (err) {
            return res.serverError(err);
          }
          req.user.apps = app;
          res.ok(req.user);
        });
      });
  },

  get: function (req, res) {
    User.findOne(req.params.name, function (err, user) {
      if (!user) {
        return res.notFound();
      }
      Game.find()
        .where({user: user.name})
        .sort({createdAt: "desc"})
        .exec(function (err, games) {

          Reference.find()
            .where({user: user.name})
            .sort({type: "asc", createdAt: "desc"})
            .exec(function (err, references) {

              Comment.find()
                .where({user: user.name})
                .sort({createdAt: "desc"})
                .exec(function (err, comments) {

                  ModNote.find()
                    .where({refUser: user.name})
                    .sort({createdAt: "desc"})
                    .exec(function (err, notes) {

                      if (req.user && user.name === req.user.name) {
                        user.isMod = req.user.isMod;
                      }
                      var publicReferences = references;
                      //Censor confidential/classified info
                      publicReferences.forEach(function (entry) {
                        if (!req.user || req.user.name !== req.params.name) {
                          entry.privatenotes = undefined;
                        }
                        if (!req.user || !req.user.isMod) {
                          entry.approved = undefined;
                          entry.verified = undefined;
                        }
                      });
                      if (req.user && req.user.isMod) {
                        user.modNotes = notes;
                      } else {
                        user.loggedFriendCodes = undefined;
                      }
                      user.references = publicReferences;
                      user.games = games;
                      user.comments = comments;
                      user.redToken = undefined;
                      return res.ok(user);
                    });
                });
            });
        });
    });
  },

  addNote: function (req, res) {
    ModNote.create({
      user: req.user.name,
      refUser: req.allParams().username,
      note: req.allParams().note
    }).exec(function (err, note) {
      if (err) {
        return res.serverError(err);
      }
      return res.ok(note);
    });
  },

  delNote: function (req, res) {
    ModNote.destroy(req.allParams().id).exec(function (err, note) {
      if (err) {
        return res.serverError(err);
      }
      return res.ok(note);
    });
  },

  ban: async function (req, res) {
    /*  Form parameters:
          req.params.username: The user who is being banned (String)
          req.params.banNote: The ban reason to go on the mod log (not visible to banned user, 300 characters max) (String)
          req.params.banMessage: The note that gets sent with the "you are banned" PM (String)
          req.params.banlistEntry: The ban reason to appear on the public banlist (String)
          req.params.duration: The number of days that the user will be banned for. (Integer)
          req.params.knownAlt: Known alt of the user for the public banlist (String)
          req.params.additionalFCs: A list of additional friend codes that should be banned. (Array of Strings)
        Ban process:
          1. Ban user from /r/pokemontrades
          2. Ban user from /r/SVExchange
          3. Add "BANNED USER" to user's flair on /r/pokemontrades
          4. Add "BANNED USER" to user's flair on /r/SVExchange
          5. Add user's friend code to /r/pokemontrades AutoModerator config (2 separate lists)
          6. Add user's friend code to /r/SVExchange AutoModerator config (2 separate lists)
          7. Add a usernote for the user on /r/pokemontrades
          8. Add a usernote for the user on /r/SVExchange
          9. Remove all of the user's TSV threads on /r/SVExchange
          10. Add user's info to banlist wiki on /r/pokemontrades
          11. Locally ban user from FlairHQ
    */

    req.params = req.allParams();

    if (typeof req.params.username !== 'string' || !req.params.username.match(/^[A-Za-z0-9_-]{1,20}$/)) {
      return res.status(400).json({error: "Invalid username"});
    }

    if (typeof req.params.banNote !== 'string') {
      return res.status(400).json({error: "Invalid ban note"});
    }
    if (req.params.banNote.length > 300) {
      return res.status(400).json({error: "Ban note too long"});
    }

    if (typeof req.params.banMessage !== 'string') {
      return res.status(400).json({error: "Invalid ban message"});
    }

    if (typeof req.params.banlistEntry !== 'string') {
      return res.status(400).json({error: "Invalid banlist entry"});
    }

    if (req.params.duration && (typeof req.params.duration !== 'number' || req.params.duration < 0 || req.params.duration > 999 || req.params.duration % 1 !== 0)) {
      return res.status(400).json({error: "Invalid duration"});
    }

    if (req.params.knownAlt && (typeof req.params.knownAlt !== 'string' || !req.params.knownAlt.match(/^[A-Za-z0-9_-]{1,20}$/))) {
      return res.status(400).json({error: "Invalid username of alt"});
    }

    if (!(req.params.additionalFCs instanceof Array)) {
      return res.status(400).json({error: "Invalid friendcode list"});
    }
    for (var FC = 0; FC < req.params.additionalFCs.length; FC++) {
      if (typeof req.params.additionalFCs[FC] !== 'string' || !req.params.additionalFCs[FC].match(/^(\d{4}-){2}\d{4}$/g)) {
        return res.status(400).json({error: "Invalid friendcode list"});
      }
    }
    console.log("/u/" + req.user.name + ": Started process to ban /u/" + req.params.username);
    var user;
    try {
      user = await User.findOne(req.params.username);
      if (!user) {
        if (await Reddit.checkUsernameAvailable(req.params.username)) {
          console.log("Ban aborted (user does not exist)");
          return res.status(404).json({error: "That user does not exist."});
        }
      }
    } catch (err) {
      console.log(err);
      return res.status(500).json(err);
    }
    Reddit.getBothFlairs(req.user.redToken, req.params.username).then(function (flairs) {
      var logged_fcs = user ? user.loggedFriendCodes : [];
      var fc_match = /(\d{4}-){2}\d{4}/g;
      var unique_fcs = _.union(flairs[0].flair_text.match(fc_match), flairs[1].flair_text.match(fc_match), logged_fcs, req.params.additionalFCs);
      var igns = flairs[0].flair_text.substring(flairs[0].flair_text.indexOf("||") + 3);
      var promises = [];
      promises.push(Ban.banFromSub(req.user.redToken, req.params.username, req.params.banMessage, req.params.banNote, 'pokemontrades', req.params.duration));
      promises.push(Ban.banFromSub(req.user.redToken, req.params.username, req.params.banMessage, req.params.banNote, 'SVExchange', req.params.duration));
      if (!req.params.duration) {
        promises.push(Ban.giveBannedUserFlair(req.user.redToken, req.params.username, flairs[0] && flairs[0].flair_css_class, flairs[0] && flairs[0].flair_text, 'pokemontrades'));
        promises.push(Ban.giveBannedUserFlair(req.user.redToken, req.params.username, flairs[0] && flairs[1].flair_css_class, flairs[1] && flairs[1].flair_text, 'SVExchange'));
        promises.push(Ban.updateAutomod(req.user.redToken, req.params.username, 'pokemontrades', unique_fcs));
        promises.push(Ban.updateAutomod(req.user.redToken, req.params.username, 'SVExchange', unique_fcs));
        promises.push(Ban.addUsernote(req.user.redToken, req.user.name, 'pokemontrades', req.params.username, req.params.banNote));
        promises.push(Ban.addUsernote(req.user.redToken, req.user.name, 'SVExchange', req.params.username, req.params.banNote));
        promises.push(Ban.removeTSVThreads(req.user.redToken, req.params.username));
        promises.push(Ban.updateBanlist(req.user.redToken, req.params.username, req.params.banlistEntry, unique_fcs, igns, req.params.knownAlt));
        promises.push(Ban.localBanUser(req.params.username));
      }
      Promise.all(promises).then(function(result) {
        console.log('Process to ban /u/' + req.params.username + 'was completed successfully.');
        res.ok();
      }, function(error) {
        console.log(error);
        res.status(error.statusCode || 500).json(error);
      });
      Event.create({
        user: req.user.name,
        type: "banUser",
        content: "Banned /u/" + req.params.username
      });
    }, function (err) {
      console.log(err);
      res.status(500).json(err);
    });
  },

  setLocalBan: function (req, res) {
    User.update(req.allParams().username, {banned: req.allParams().ban}).exec(function (err, users) {
      if (err) {
        console.log(err);
        return res.serverError(err);
      }
      if (!users.length) {
        return res.notFound();
      }
      return res.ok(users[0]);
    });
  },

  bannedUsers: function (req, res) {
    User.find({banned: true}).exec(function (err, users) {
      if (err) {
        return res.serverError(err);
      }
      return res.ok(users);
    });
  },

  clearSession: function (req, res) {
    Reddit.checkModeratorStatus(sails.config.reddit.adminRefreshToken, req.user.name, 'pokemontrades').then(function (modStatus) {
      if (modStatus) { //User is a mod, clear session
        Sessions.destroy({session: {'contains': '"user":"' + req.allParams().name + '"'}}).exec(function (err) {
          if (err) {
            console.log(err);
            return res.serverError(err);
          }
          if (req.allParams().name === req.user.name) {
            req.session.destroy();
            return res.redirect('/login');
          }
          return res.ok("Successfully cleared /u/" + req.allParams().name + "'s sessions.");
        });
      }
    }, function () {
      console.log('Failed to check whether /u/' + req.allParams().name + ' is a moderator.');
      return res.serverError();
    });
  }
};
