/* global module, User, Reference, Flair */
/**
 * ReferenceController
 *
 * @description :: Server-side logic for managing References
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

var Q = require('q'),
  async = require('async');

module.exports = {

  get: function (req, res) {
    User.findOne({id: req.params.userid}, function (err, user) {
      if (!user) {
        res.json({error: "Can't find user"}, 404);
      } else {
        Reference.find({user: user.id}, function (err, refs) {
          if (err) {
            res.json(400);
          } else {
            res.json(refs, 200);
          }
        });
      }
    });
  },

  all: function (req, res) {
    if (!req.user || !req.user.isMod) {
      return res.json("Not a mod", 403);
    }
    var dateQuery, query;
    dateQuery = {};
    if (req.query.before !== undefined) {
      dateQuery["<"] = new Date(req.query.before);
    }
    if (req.query.after !== undefined) {
      dateQuery[">"] = new Date(req.query.after);
    }
    query = {
      type: ["event", "casual", "shiny", "redemption", "bank"]
    };
    if (Object.keys(dateQuery).length > 0) {
      query.createdAt = dateQuery;
    }

    Reference.find(query)
      .sort({createdAt: "asc"})
      .exec(function (err, refs) {
        if (err) {
          return res.serverError(err);
        }
        async.map(refs, function (ref, callback) {
          User.findOne({id: ref.user}).exec(function (err, refUser) {
            ref.user = refUser;
            callback(null, ref);
          });
        }, function (err, results) {
          return res.json(results);
        });
      });

  },

  add: function (req, res) {
    req.params = req.allParams();
    var protomatch = /^(https?):\/\/(www|[a-z0-9]*\.)?reddit\.com/;
    var endOfUrl = req.params.url.replace(protomatch, '');

    User.findOne({id: req.params.userid}, function (err, refUser) {
      if (!refUser) {
        return res.json({error: "Can't find user"}, 404);
      } else {
        Reference.findOne({url: {endsWith: endOfUrl}, user: refUser.id}, function (err, ref) {
          if (err) {
            return res.json(err, 500);
          }
          if (ref && (ref.type !== "egg" || req.params.type !== "egg")) {
            return res.json(400);
          } else {
            Reference.create(
              {
                url: req.params.url,
                user: refUser.id,
                user2: req.params.user2,
                description: req.params.descrip,
                type: req.params.type,
                gave: req.params.gave,
                got: req.params.got,
                notes: req.params.notes,
                privatenotes: req.params.privatenotes,
                edited: false,
                number: req.params.number || 0
              },
              function (err, ref) {
                if (err) {
                  console.log(err);
                  return res.json(400);
                } else {
                  return res.json(ref, 200);
                }
              }
            );
          }
        });
      }
    });
  },

  edit: function (req, res) {
    req.params = req.allParams();

    User.findOne({id: req.user.id}, function (err, refUser) {
      if (!refUser) {
        return res.json({error: "Can't find user"}, 404);
      }
      Reference.findOne({id: req.params.id, user: refUser.id}).exec(function (err, ref) {
        if (err || !ref) {
          return res.notFound();
        }
        var approved = ref.approved;
        if (ref.url !== req.params.url || ref.type !== req.params.type || ref.number !== req.params.number) {
          approved = false;
        }
        Reference.update({id: req.params.id, user: refUser.id},
            {
              url: req.params.url,
              user: refUser.id,
              user2: req.params.user2,
              description: req.params.description,
              type: req.params.type,
              gave: req.params.gave,
              got: req.params.got,
              notes: req.params.notes,
              privatenotes: req.params.privatenotes,
              approved: approved,
              edited: true,
              number: req.params.number
            })
            .exec(function (err, ref) {
              if (err) {
                return res.json(err, 500);
              }
              if (!ref) {
                return res.json(404);
              }
              return res.json(ref, 200);
            });
      });
    });
  },

  deleteRef: function (req, res) {
    var id = req.allParams().refId;

    Reference.findOne({id: id}).exec(function (err, ref) {
      if (!ref) {
        return res.json(404);
      }
      if (err) {
        return res.json(err, 500);
      }
      if (ref.user === req.user.id || req.user.isMod) {
        Reference.destroy({id: id})
          .exec(function (err, refs) {
            if (err) {
              return res.json(err, 400);
            } else {
              return res.json(refs, 200);
            }
          });
      } else {
        return res.json("unauthorised", 403);
      }
    });

  },

  comment: function (req, res) {
    var user = req.user,
      refUser = req.allParams().refUser,
      comment = req.allParams().comment;

    User.findOne({id: refUser}, function (err, reference) {
      Comment.create({user: reference.id, user2: user.name, message: comment}, function (err, com) {
        res.json(com, 200);
      });
    });

  },

  delComment: function (req, res) {
    var user = req.user,
      refUser = req.allParams().refUser,
      id = req.allParams().id;

    User.findOne({id: refUser}, function () {
      Comment.findOne({id: id}, function (err, comment) {
        if (!comment || err) {
          return res.json(err, 404);
        }
        if ((user.name === comment.user2) || user.isMod) {
          Comment.destroy({id: id}, function (err, com) {
            return res.json(com, 200);
          });
        } else {
          return res.json(403);
        }
      });
    });

  },

  approve: function (req, res) {
    if (!req.user.isMod) {
      return res.json("Not a mod", 403);
    }

    var refUserId = req.allParams().userid,
      id = req.allParams().id,
      approve = req.allParams().approve;

    User.findOne({id: refUserId}, function (err, refUser) {
      if (!refUser) {
        return res.json("User not found", 404);
      }
      Reference.findOne(id, function (err, ref) {
        if (!ref) {
          return res.notFound();
        } else {
          ref.approved = approve;
          ref.save(function (err) {
            if (err) {
              res.serverError(err);
            }
            return res.json(ref, 200);
          });
        }
      });
    });
  },

  approveAll: function (req, res) {
    if (!req.user.isMod) {
      return res.json("Not a mod", 403);
    }

    var refUserId = req.allParams().userid,
      type = req.allParams().type;

    User.findOne({id: refUserId}, function (err, refUser) {
      if (!refUser) {
        return res.json("User not found", 404);
      }
      if (type === "event") {
        Reference.update(
          {user: refUser.id, type: "event"}, {approved: true}
        ).exec(function (err, apps) {
            Reference.update(
              {user: refUser.id, type: "redemption"}, {approved: true}
            ).exec(function (err, apps2) {
                if (!apps.length) {
                  return res.json({error: "No apps of that type found."}, 404);
                }
                if (err) {
                  return res.json({error: err}, 500);
                }
                return res.json(apps.concat(apps2), 200);
              });
          });
      } else {
        Reference.update(
          {user: refUser.id, type: type}, {approved: true}
        ).exec(function (err, apps) {
            if (!apps.length) {
              return res.json({error: "No apps of that type found."}, 404);
            }
            if (err) {
              return res.json({error: err}, 500);
            }
            return res.json(apps, 200);
          });
      }
    });

  },

  saveFlairs: function (req, res) {
    var flairs = req.allParams().flairs;
    if (!req.user.isMod) {
      res.json(403);
      return;
    }

    Flair.destroy({}, function (err) {
      if (err) {
        return res.json(err, 500);
      }
      var promises = [],
        added = [];
      flairs.forEach(function (flair) {
        promises.push(
          Flair.create(flair)
            .exec(function (err, newFlair) {
              added.push(newFlair);
            })
        );
      });

      Q.all(promises).then(function () {
        res.json(added, 200);
      });

    });


  },

  getFlairs: function (req, res) {
    Flair.find().exec(function (err, flairs) {
      res.json(flairs, 200);
    });
  }
};

