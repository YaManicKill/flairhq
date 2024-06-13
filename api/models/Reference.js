/**
* Reference.js
*
* @description :: TODO: You might write a short summary of how this model works and what it represents here.
* @docs        :: http://sailsjs.org/#!documentation/models
*/

module.exports = {

  attributes: {
    url: {
      type: "string"
    },
    user: "string",
    user2: "string",
    gave: "string",
    got: "string",
    description: "string",
    number: {
      type: "integer",
      min: 0,
      required: false
    },
    type: {
      type: "string",
      enum: [
        "event",
        "shiny",
        "casual",
        "bank",
        "egg",
        "giveaway",
        "involvement",
        "eggcheck",
        "misc"
      ]
    },
    // This is true if the other user has added the same url, and the trade has been approved.
    verified: "boolean",
    // This defines if the mods have approved it as a trade that can count
    approved: "boolean",
    rejected: 'boolean',
    edited: "boolean",
    notes: "string",
    privatenotes: "string",
    rejectnotes: "array"
  }
};
