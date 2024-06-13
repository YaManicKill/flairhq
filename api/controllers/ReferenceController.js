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
  all: function (req, res) {
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
          User.findOne({name: ref.user}).exec(function (err, refUser) {
            ref.user = refUser;
            callback(null, ref);
          });
        }, function (err, results) {
          if (err) {
            return res.serverError(err);
          }
          return res.ok(results);
        });
      });
  },

  add: function (req, res) {
    req.params = req.allParams();
    var protomatch = /^(https?):\/\/(www|[a-z0-9]*\.)?reddit\.com/;
    var endOfUrl = req.params.url.replace(protomatch, '');
    if (req.params.number && isNaN(req.params.number)) {
      return res.badRequest({err: "Number must be a number"});
    }
     
    if (req.params.number < 0) {
      return res.badRequest({err: "Number must be 0 or more"});
    }
    
    return Reference.findOne({url: {endsWith: endOfUrl}, user: req.user.name}).then(ref => {
      if (ref && !(ref.type === 'egg' && req.params.type === 'egg')) {
        return res.status(400).json({err: 'Already added that URL.'});
      }
      


      return Reference.create({
        url: req.params.url,
        user: req.user.name,
        user2: req.params.user2,
        description: req.params.descrip,
        type: req.params.type,
        gave: req.params.gave,
        got: req.params.got,
        notes: req.params.notes,
        privatenotes: req.params.privatenotes,
        edited: false,
        number: req.params.number || 0
      }).then(References.verifyIfNeeded).then(References.omitModOnlyProperties).then(res.ok);
    }).catch(res.serverError);
  },

  edit: function (req, res) {
    req.params = req.allParams();
    if (req.params.number && isNaN(req.params.number)) {
      return res.badRequest({err: "Number must be a number"});
    }

    if (req.params.number < 0) {
      return res.badRequest({err: "Number must be 0 or more"});
    }

    Reference.findOne({id: req.params.id, user: req.user.name}).exec(function (err, ref) {
      if (err || !ref) {
        return res.notFound();
      }
      if (req.user.name !== ref.user) {
        return res.forbidden();
      }
      var approved = ref.approved;
      if (ref.url !== req.params.url || ref.type !== req.params.type || ref.number !== req.params.number) {
        approved = false;
      }
      Reference.update(req.params.id,
        {
          url: req.params.url,
          user: req.user.name,
          user2: req.params.user2,
          description: req.params.description,
          type: req.params.type,
          gave: req.params.gave,
          got: req.params.got,
          notes: req.params.notes,
          privatenotes: req.params.privatenotes,
          approved: approved,
          edited: true,
          number: req.params.number || 0
        })
        .exec(function (err, ref) {
          if (err) {
            return res.serverError(err);
          }
          if (!ref) {
            return res.notFound();
          }
          return res.ok(ref);
        });
    });
  },

  rejectWithNote: function (req, res) {
    req.params = req.allParams();

    Reference.update(req.params.id,
      {
        rejectnotes: req.params.rejectnotes,
        rejected: true,
        approved: false

      })
      .exec(function (err, ref) {
        if (err) {
          return res.serverError(err);
        }
        if (!ref) {
          return res.notFound();
        }
        return res.ok(ref);
      });

    /*if (req.params.number && isNaN(req.params.number)) {
      return res.badRequest({err: "Number must be a number"});
    }

    if (req.params.number < 0) {
      return res.badRequest({err: "Number must be 0 or more"});
    }

    Reference.findOne({id: req.params.id, user: req.user.name}).exec(function (err, ref) {
      if (err || !ref) {
        return res.notFound();
      }
      if (req.user.name !== ref.user) {
        return res.forbidden();
      }
      var approved = ref.approved;
      if (ref.url !== req.params.url || ref.type !== req.params.type || ref.number !== req.params.number) {
        approved = false;
      }
      Reference.update(req.params.id,
        {
          url: req.params.url,
          user: req.user.name,
          user2: req.params.user2,
          description: req.params.description,
          type: req.params.type,
          gave: req.params.gave,
          got: req.params.got,
          notes: req.params.notes,
          privatenotes: req.params.privatenotes,
          approved: approved,
          edited: true,
          number: req.params.number || 0
        })

    }); */
  },

  deleteRef: function (req, res) {
    var id = req.allParams().refId;
    Reference.findOne(id).exec(function (err, ref) {
      if (!ref) {
        return res.notFound();
      }
      if (err) {
        return res.serverError(err);
      }
      if (ref.user === req.user.name || Users.hasModPermission(req.user, 'flair')) {
        if (ref.verified) {
          var query = {
            user: ref.user2,
            url: new RegExp(ref.url.substring(ref.url.indexOf("/r/"))),
            user2: ref.user
          };
          //If a verified reference is deleted, its compelmentary reference is un-verified.
          Reference.update(query, {verified: false}, function (err) {
            if (err) {
              sails.log.error("Error while updating complementary trade.");
            }
          });
        }
        Reference.destroy(id).exec(function (err, refs) {
          if (err) {
            return res.serverError(err);
          }
          return res.ok(refs);
        });
      } else {
        return res.forbidden();
      }
    });
  },

  comment: function (req, res) {
    Comment.create({
      user: req.allParams().refUsername,
      user2: req.user.name,
      message: req.allParams().comment
    }, function (err, com) {
      if (err) {
        return res.serverError(err);
      }
      return res.ok(com);
    });
  },

  delComment: function (req, res) {
    var id = req.allParams().id;
    Comment.findOne(id, function (err, comment) {
      if (!comment || err) {
        return res.notFound(err);
      }
      if (req.user.name === comment.user2 || Users.hasModPermission(req.user, 'flair')) {
        Comment.destroy(id, function (err, result) {
          return res.ok(result);
        });
      } else {
        return res.forbidden();
      }
    });
  },

  approve: async function (req, res) {
    try {
      var ref = await Reference.findOne(req.allParams().id);
      if (!References.isApprovable(ref)) {
        return res.badRequest();
      }
      return res.ok(await References.approve(ref, req.allParams().approve));
    } catch (err) {
      return res.serverError(err);
    }
  },

  approveAll: function (req, res) {
    var promises = [];
    Reference.find({user: req.allParams().username, type: req.allParams().type}, function (err, refs) {
      if (!refs.length || err) {
        return res.notFound(err);
      }
      for (var i = 0; i < refs.length; i++) {
        promises.push(References.approve(refs[i], true));
      }
      Promise.all(promises).then(function (results) {
        return res.ok(results);
      }, function (error) {
        return res.serverError(error);
      });
    });
  },

  saveFlairs: function (req, res) {
    var flairs = req.allParams().flairs;
    Flair.destroy({}, function (err) {
      if (err) {
        return res.serverError(err);
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
        res.ok(added);
      });
    });
  },

  getFlairs: async function (req, res) {
    try {
      return res.ok(await Flairs.getFlairs());
    } catch (err) {
      return res.serverError(err);
    }
  }
};
