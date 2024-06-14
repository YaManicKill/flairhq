'use strict';
var _ = require("lodash");
var assert = require("chai").assert;
var Flairs = require("../../../api/services/Flairs");

var flairTexts = require("../data/flairTexts.json");
var flairCssClasses = require("../data/flairCssClasses.json");
var stdFlairInfo = require("../data/standardFlairInfo.json");
var fcs = require("../data/friendCodes.json");
var users = require("../data/users.json");
var refFactory = require("../data/referenceFactory.js");

describe("Flair text", function () {
  it("Throws error on incorrect pokemontrades flair", function () {
    try{
      Flairs.flairCheck(flairTexts.incorrectFlair, flairTexts.svexFlairStd);
    } catch (e) {
      return assert.strictEqual(e, "Error with format.");
    }
    assert.fail(null, null, "Shouldn't reach this point.");
  });

  it("Throws error on incorrect svex flair", function () {
    try{
      Flairs.flairCheck(flairTexts.tradesFlairStd, flairTexts.incorrectFlair);
    } catch (e) {
      return assert.strictEqual(e, "Error with format.");
    }
    assert.fail(null, null, "Shouldn't reach this point.");
  });

  it("Throws error on undefined trades flair", function () {
    try{
      Flairs.flairCheck(flairTexts.tradesFlairStd, undefined);
    } catch (e) {
      return assert.strictEqual(e, "Need both flairs.");
    }
    assert.fail(null, null, "Shouldn't reach this point.");
  });

  it("Throws error on undefined trades flair", function () {
    try{
      Flairs.flairCheck(undefined, flairTexts.svexFlairStd);
    } catch (e) {
      return assert.strictEqual(e, "Need both flairs.");
    }
    assert.fail(null, null, "Shouldn't reach this point.");
  });

  it("Throws error in invalid TSVs", function () {
    try {
      Flairs.flairCheck(flairTexts.tradesFlairStd, flairTexts.svexFlairBadTSV);
    } catch (e) {
      return assert.strictEqual(e, "Error with TSVs");
    }
    assert.fail(null, null, "Shouldn't reach this point.");
  });

  describe("On success", function () {
    it("Returns object containing friend codes", function () {
      var fcs = Flairs.flairCheck(flairTexts.tradesFlairStd, flairTexts.svexFlairStd).fcs;
      assert.strictEqual(fcs.length, 1, "Has 1 fc.");
      assert.strictEqual(fcs[0], "1111-1111-1111", "Has 1 fc.");
    });

    it("Returns object containing all friend codes", function () {
      var fcs = Flairs.flairCheck(flairTexts.tradesFlairMultipleFCs, flairTexts.svexFlairStd).fcs;
      assert.strictEqual(fcs.length, 2, "Has 2 fcs.");
      assert.strictEqual(fcs[0], "1111-1111-1111", "Has 1111-1111-1111");
      assert.strictEqual(fcs[1], "2222-2222-2222", "Has 2222-2222-2222");
    });

    it("Returns object containing friend codes from both ", function () {
      var fcs = Flairs.flairCheck(flairTexts.tradesFlairStd, flairTexts.svexFlairDifferentFC).fcs;
      assert.strictEqual(fcs.length, 2, "Has 2 fcs.");
      assert.strictEqual(fcs[0], "1111-1111-1111", "Has 1111-1111-1111");
      assert.strictEqual(fcs[1], "2222-2222-2222", "Has 2222-2222-2222");
    });

    it("Correctly splits flairs into FCs, IGNs, games, and TSVs", function () {
      assert.deepEqual(Flairs.flairCheck(flairTexts.lotsOfGames.ptrades, flairTexts.lotsOfGames.svex), flairTexts.lotsOfGames);
    });

    it('Correctly formats game objects into flair texts', function () {
      assert.strictEqual(Flairs.formatGames(flairTexts.lotsOfGames.games), flairTexts.lotsOfGames.ptrades.split(' || ')[1]);
    });
  });
  describe("Incorrect flairs", function () {
    it ("Doesn't allow no IGNs in trades flair", function () {
      try{
        Flairs.flairCheck("1234-1234-1234 || ", flairTexts.svexFlairStd);
      } catch (e) {
        return assert.strictEqual(e, "We need at least one IGN.");
      }
      assert.fail(null, null, "Shouldn't reach this point.");
    });

    it ("Doesn't allow no IGNs in svex flair", function () {
      try{
        Flairs.flairCheck(flairTexts.tradesFlairStd, "1234-1234-1234 ||  || 1234");
      } catch (e) {
        return assert.strictEqual(e, "We need at least one IGN.");
      }
      assert.fail(null, null, "Shouldn't reach this point.");
    });
  });
});

describe("Flair template formatting", function () {
  it("Formats flair names correctly", function () {
    var names = _.keys(stdFlairInfo.flairs);
    for (var i = 0; i < names.length; i++) {
      let flair = names[i]
      let sub = stdFlairInfo["flairs"][flair]["sub"]
      assert.strictEqual(Flairs.formattedName(flair, sub), stdFlairInfo.expectedFormat[flair], 'Formats ' + flair + ' flair incorrectly');
    }
  });
});

describe("Friend Code Validity", function () {
  it("Correctly identifies valid friend codes", function () {
    assert(Flairs.validFC(fcs.valid1), 'Incorrectly claims that "' + fcs.valid1 + '" is invalid');
    assert(Flairs.validFC(fcs.valid2), 'Incorrectly claims that "' + fcs.valid2 + '" is invalid');
  });

  it("Correctly identifies invalid friend codes", function () {
    assert(!Flairs.validFC(fcs.invalid1), 'Incorrectly claims that "' + fcs.invalid1 + '" is valid');
    assert(!Flairs.validFC(fcs.invalid2), 'Incorrectly claims that "' + fcs.invalid2 + '" is valid');
    assert(!Flairs.validFC(fcs.exceedsMaximum), 'Incorrectly claims that "' + fcs.exceedsMaximum + '" is valid');
    assert(!Flairs.validFC(fcs.badFormat), 'Incorrectly claims that "' + fcs.badFormat + '" is valid');
  });
});

describe("Applying for Flair", function () {
  it("Can apply for ball flair with enough references", function () {
    var userFlairs = Flairs.getUserFlairs(users.greatball_user, stdFlairInfo.flairs);
    var refs = refFactory.getRefs(40, {type: 'event'});
    assert(Flairs.canUserApply(refs, stdFlairInfo.flairs.ultraball, userFlairs), "Error: Can't apply for ball flair under normal circumstances");
  });

  it("Cannot apply for ball flair if prerequisites are not met", function () {
    var userFlairs = Flairs.getUserFlairs(users.greatball_user, stdFlairInfo.flairs);
    var refs = refFactory.getRefs(39, {type: 'event'});
    assert(!Flairs.canUserApply(refs, stdFlairInfo.flairs.ultraball, userFlairs), 'Error: Can apply for flair without the required number of trades');
  });

  it("Can apply for involvement flair with all the prerequisites", function () {
    var userFlairs = Flairs.getUserFlairs(users.greatball_user, stdFlairInfo.flairs);
    var refs = refFactory.getRefs(10, {type: 'involvement'}).concat(refFactory.getRefs(5, {type: 'giveaway', subreddit: 'pokemontrades'}));
    assert(Flairs.canUserApply(refs, stdFlairInfo.flairs.involvement, userFlairs), "Error: Can't apply for involvement flair");
  });

  it("Cannot apply for involvement flair with default flair", function () {
    var userFlairs = Flairs.getUserFlairs(users.default_flair_user, stdFlairInfo.flairs);
    var refs = refFactory.getRefs(10, {type: 'involvement'}).concat(refFactory.getRefs(5, {type: 'giveaway', subreddit: 'pokemontrades'}));
    assert(!Flairs.canUserApply(refs, stdFlairInfo.flairs.involvement, userFlairs), 'Error: Can apply for involvement flair with default flair');
  });

  it("Cannot apply for currently-possessed flair", function () {
    var userFlairs = Flairs.getUserFlairs(users.greatball_user, stdFlairInfo.flairs);
    var refs = refFactory.getRefs(10, {type: 'involvement'}).concat(refFactory.getRefs(5, {type: 'giveaway', subreddit: 'pokemontrades'}));
    assert(!Flairs.canUserApply(refs, stdFlairInfo.flairs.greatball, userFlairs), 'Error: Can apply for currently-possessed flair');
  });

  it("Cannot downgrade flair", function () {
    var userFlairs = Flairs.getUserFlairs(users.greatball_user, stdFlairInfo.flairs);
    var refs = refFactory.getRefs(60, {type: 'event'});
    assert(!Flairs.canUserApply(refs, stdFlairInfo.flairs.pokeball, userFlairs), 'Error: Can apply for lower flair');
  });
});

describe("Upgrading/combining flairs", function () {
  it('Combines flairs correctly', function () {
    ['pokemontrades', 'SVExchange'].forEach(function (sub) {
      describe(sub + ' flairs', function () {
        _.keysIn(flairCssClasses[sub]).forEach(function (test_case) {
          let previous = test_case.split(',')[0];
          let added = test_case.split(',')[1];
          assert.strictEqual(Flairs.makeNewCSSClass(previous, added, sub), flairCssClasses[sub][test_case],
            'Error combining ' + previous || '(no flair)' + ' + ' + added + ' into ' + flairCssClasses[sub][test_case]);
        });
      });
    });
  });
});
