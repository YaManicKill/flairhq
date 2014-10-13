/**
 * ReferenceController
 *
 * @description :: Server-side logic for managing References
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

var Q = require('q');

module.exports = {

  edit: function (req, res) {
    req.params = req.allParams();
    User.findOne({id: req.params.userid}, function (err, user) {
      if (!user) {
        return res.json({error: "Can't find usere"}, 404);
      } else if (user.name !== req.user.name && !user.isMod) {
        return res.json("You can't edit another user's information. " +
        "Unless you are a mod.", 403);
      } else {
        var updatedUser = {};
        if (req.params.intro) {
          updatedUser.intro = req.params.intro;
        }
        if (req.params.fcs) {
          updatedUser.friendCodes = req.params.fcs;
        }

        User.update({id: user.id}, updatedUser).exec(function (err, up) {
          if (err) {
            res.json(err, 400);
          }

          var promises = [],
            games = [];

          req.params.games.forEach(function (game) {
            if (game.id && (game.tsv || game.ign)) {
              promises.push(Game.update(
                {id: game.id},
                {tsv: parseInt(game.tsv), ign: game.ign})
                .exec(function (err, game) {
                  if (err) {
                    console.log(err);
                    res.json(400);
                  } else {
                    games.push(game);
                  }
                }
              ));
            } else if (!game.id && (game.tsv || game.ign)) {
              console.log(game);
              promises.push(Game.create(
                {user: user.id, tsv: parseInt(game.tsv), ign: game.ign})
                .exec(function (err, game) {
                  if (err) {
                    console.log(err);
                    res.json(400);
                  } else {
                    games.push(game);
                  }
                }
              ));
            }
          });

          Q.all(promises).then(function () {
            user.games = games;
            res.json(user, 200);
          });
        });
      }
    });
  },

  mine: function (req, res) {
    user = req.user;

    if(!user) {
      return res.json(404);
    }

    Game.find()
      .where({user: user.id})
      .exec(function (err, games) {
        user.games = games;
        res.json(user, 200);
      });
  },

  get: function (req, res) {
    User.findOne({name: req.params.name}, function (err, user) {
      if (!user) {
        return res.json(404);
      }
      Game.find()
        .where({user: user.id})
        .exec(function (err, games) {

          Reference.find()
            .where({user: user.id})
            .where({type: ["event", "redemption"]})
            .sort("type")
            .exec(function (err, events) {

              Reference.find()
                .where({user: user.id})
                .where({type: "shiny"})
                .exec(function (err, shinies) {

                  Reference.find()
                    .where({user: user.id})
                    .where({type: "casual"})
                    .exec(function (err, casuals) {

                      Reference.find()
                        .where({user: user.id})
                        .where({type: "bank"})
                        .exec(function (err, banks) {

                          Egg.find()
                            .where({user: user.id})
                            .exec(function (err, eggs) {

                              Giveaway.find()
                                .where({user: user.id})
                                .exec(function (err, giveaways) {

                                  Comment.find()
                                    .where({user: user.id})
                                    .exec(function (err, comments) {

                                      ModNote.find()
                                        .where({refUser: user.id})
                                        .exec(function (err, notes) {

                                          if (req.user && user.name === req.user.name) {
                                            user.isMod = req.user.isMod;
                                          }

                                          user.references = {
                                            events: events,
                                            shinies: shinies,
                                            casuals: casuals,
                                            banks: banks,
                                            eggs: eggs,
                                            giveaways: giveaways
                                          }
                                          user.modNotes = notes;
                                          user.games = games;
                                          user.comments = comments;
                                          user.redToken = undefined;
                                          res.json(user, 200);
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
  },

  addNote: function (req, res) {
    req.params = req.allParams();

    if (!req.user.isMod) {
      res.json("Not a mod.", 403);
      return;
    }

    User.findOne({id: req.params.userid}).exec(function (err, user) {

      if (!user) {
        res.json({error: "Can't find user"}, 404);
        return;
      }

      ModNote.create({user: req.user.name, refUser: user.id, note: req.params.note})
        .exec(function (err, note) {
          if (err) {
            res.json(err, 400);
          } else {
            res.json(note, 200);
          }
        });
    });

  },

  delNote: function (req, res) {
    req.params = req.allParams();

    if (!req.user.isMod) {
      res.json("Not a mod.", 403);
      return;
    }

    User.findOne({id: req.params.userid}).exec(function (err, user) {

      if (!user) {
        res.json({error: "Can't find user"}, 404);
        return;
      }

      ModNote.destroy({id: req.params.id})
        .exec(function (err, note) {
          if (err) {
            res.json(err, 400);
          } else {
            res.json(note, 200);
          }
        });
    });
  },

  ban: function (req, res) {
    if (!req.user.isMod) {
      res.json("Not a mod", 403);
      return;
    }

    User.findOne(req.allParams().userId).exec(function (err, user) {
      if (!user) {
        res.json("Can't find user", 404);
        return;
      }

      user.banned = req.allParams().ban;
      user.save(function (err) {
        res.json(user, 200);
      });
    });
  },

  bannedUsers: function (req, res) {
    if (!req.user.isMod) {
      res.json("Not a mod", 403);
      return;
    }

    User.find({banned: true}).exec(function (err, users) {
      res.json(users, 200);
    });
  }
};

