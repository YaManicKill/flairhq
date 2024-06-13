var referenceService = require('../api/services/References.js');
var flairService = require('../api/services/Flairs.js');
var _ = require('lodash');
module.exports = {
  addRepeats: function ($scope, io) {
    var pathToRefs = 'refUser.references',
      pathToApps = 'refUser.apps';
    $scope.editRef = function () {
      var url = "/reference/edit";
      $scope.editRefError = $scope.validateRef($scope.selectedRef);
      if ($scope.editRefError) {
        return;
      }
      $scope.indexSpin.editRef = true;
      io.socket.post(url, $scope.selectedRef, function (data, res) {
        $scope.indexSpin.editRef = false;
        if (res.statusCode === 200) {
          $scope.indexOk.editRef = true;
          var index = $scope.refUser.references.findIndex(function (searchRef) {
            return searchRef.id === $scope.selectedRef.id;
          });
          $scope.refUser.references[index] = $scope.selectedRef;
        } else {
          $scope.editRefError = "There was an issue.";
          console.log(res);
        }
        $scope.$apply();
      });
    };
    $scope.rejectionReasonsArray = [
      "Full details not posted when trading",
      "Details not posted on the subreddit after trading",
      "Incorrect permalink",
      "No confirmation that a trade was completed",
      "Pokémon was just given away and not actually negotiated for (outside giveaway thread)",
      "Trade was discussed in part over PM",
      "IOU trade"
    ];
    $scope.rejectionReasonsState = [true, false, true, false];
    $scope.rejectWNote = function () {
      var url = "/reference/rejectWithNote";
      //$scope.editRefError = $scope.validateRef($scope.selectedRef);
      //if ($scope.editRefError) {
      //  return;
      //}
      //$scope.indexSpin.editRef = true;
      io.socket.post(url, $scope.selectedRef, function (data, res) {
        $scope.indexSpin.editRef = false;
        if (res.statusCode === 200) {
          $scope.indexOk.editRef = true;
          var index = $scope.refUser.references.findIndex(function (searchRef) {
            return searchRef.id === $scope.selectedRef.id;
          });
          $scope.refUser.references[index] = $scope.selectedRef;
        } else {
          $scope.editRefError = "There was an issue.";
          console.log(res);
        }
        $scope.$apply();
      });
    };
    $scope.validateRef = function (ref) {
      if (!ref.type) {
        return "Please choose a type.";
      }
      if (ref.type === "egg" || ref.type === "giveaway" || ref.type === "misc" || ref.type === "eggcheck" || ref.type === "involvement") {
        if (!ref.descrip && !ref.description) {
          return "Make sure you enter all the information";
        }
      } else if (!ref.got || !ref.gave) {
        return "Make sure you enter all the information";
      }

      var url = ref.url || ref.refUrl;
      if (!url || ref.type !== "giveaway" && ref.type !== "misc" && ref.type !== "eggcheck" && !ref.user2) {
        return "Make sure you enter all the information";
      }

      var regexp = /(http(s?):\/\/)?(www|[a-z]*\.)?reddit\.com\/r\/((pokemontrades)|(SVExchange)|(poketradereferences))\/comments\/([a-z\d]*)\/([^\/]+)\/([a-z\d]+)(\?[a-z\d]+)?/,
        regexpMobile = /(http(s?):\/\/)?(www|[a-z]*\.)?reddit\.com\/r\/((pokemontrades)|(SVExchange)|(poketradereferences))\/s\/([a-zA-Z\d]*)/,
        regexpGive = /(http(s?):\/\/)?(www|[a-z]*\.)?reddit\.com\/r\/((SVExchange)|(pokemontrades)|(poketradereferences)|(Pokemongiveaway)|(SVgiveaway))\/comments\/([a-z\d]*)\/([^\/]+)\/?/,
        regexpMisc = /(http(s?):\/\/)?(www|[a-z]*\.)?reddit\.com.*/;
      var isValidTradePermalink = regexp.test(url) || regexpMobile.test(url),
        isValidGiveawayPermalink = regexpGive.test(url) || regexpMobile.test(url);
      if (((ref.type === "giveaway" || ref.type === "eggcheck") && !isValidGiveawayPermalink) ||
        (ref.type !== "giveaway" && ref.type !== "misc" && ref.type !== "eggcheck" && !isValidTradePermalink) ||
        (ref.type === "misc" && !regexpMisc.test(url))) {
        return "Looks like you didn't input a proper permalink";
      }

      if (ref.user2.substring(0,3) === "/u/") {
        ref.user2 = ref.user2.slice(3);
      }
      if (ref.user2 === ($scope.user.name)) {
        return "Don't put your own username there.";
      }

      var regexpUser = /^(\/u\/)?[A-Za-z0-9_\-]*$/;
      if (($scope.type !== "giveaway" && $scope.type !== "misc") && !regexpUser.test(ref.user2)) {
        return "Please put a username on its own, or in format: /u/username. Not the full url, or anything else.";
      }
      if (ref.number && isNaN(ref.number)) {
        return "Number must be a number.";
      }
      return "";
    };
    $scope.setLocalBan = function (username, ban) {
      var url = "/mod/setlocalban";
      io.socket.post(url, {username: username, ban: ban}, function (data, res) {
        if (res.statusCode === 200) {
          if ($scope.refUser) {
            $scope.refUser.banned = data.banned;
          } else {
            $scope.getBannedUsers();
          }
          $scope.$apply();
        } else {
          console.log("Error banning " + username + ": " + res.statusCode);
        }
      });
    };
    $scope.deleteRef = function (id) {
      var url = "/reference/delete";
      io.socket.post(url, {refId: id}, function (data, res) {
        if (res.statusCode === 200) {
          $scope.refUser.references = $scope.refUser.references.filter(function (ref) {
            return ref.id !== id;
          });
          $scope.$apply();
        } else {
          console.log(res.statusCode + ": " + data);
        }
      });
    };
    $scope.isNotNormalTrade = referenceService.isNotNormalTrade;
    $scope.hasNumber = referenceService.hasNumber;
    $scope.isEvent = referenceService.isEvent;
    $scope.isShiny = referenceService.isShiny;
    $scope.isCasual = referenceService.isCasual;
    $scope.isEggCheck = referenceService.isEggCheck;
    $scope.isTrade = referenceService.isTrade;
    $scope.isInvolvement = referenceService.isInvolvement;
    $scope.isEgg = referenceService.isEgg;
    $scope.isBank = referenceService.isBank;
    $scope.isGiveaway = referenceService.isGiveaway;
    $scope.isEggCheck = referenceService.isEggCheck;
    $scope.isMisc = referenceService.isMisc;
    $scope.isApprovable = referenceService.isApprovable;
    $scope.isApproved = referenceService.isApproved;
    $scope.getRedditUser = referenceService.getRedditUser;
    $scope.formattedName = flairService.formattedName;
    $scope.inPokemonTradesTrader = flairService.inPokemonTradesTrader;
    $scope.inPokemonTradesHelper = flairService.inPokemonTradesHelper;
    $scope.inSVExchangeHatcher = flairService.inSVExchangeHatcher;
    $scope.inSVExchangeGiver = flairService.inSVExchangeGiver;
    $scope.getFlair = flairService.getFlair;
    $scope.flairCheck = flairService.flairCheck;
    $scope.userHasFlair = function (flair) {
      return flairService.userHasFlair($scope.user, flair);
    };
    $scope.numberOfTrades = function () {
      return referenceService.numberOfTrades(_.get($scope, pathToRefs));
    };
    $scope.numberOfPokemonGivenAway = function () {
      return referenceService.numberOfPokemonGivenAway(_.get($scope, pathToRefs));
    };
    $scope.numberOfEggsGivenAway = function () {
      return referenceService.numberOfEggsGivenAway(_.get($scope, pathToRefs));
    };
    $scope.numberOfEggChecks = function () {
      return referenceService.numberOfEggChecks(_.get($scope, pathToRefs));
    };
    $scope.numberOfApprovedEggChecks = function () {
      return referenceService.numberOfApprovedEggChecks(_.get($scope, pathToRefs));
    };
    $scope.renderCSSClass = function(classes) {
      if (typeof classes !== 'string') {
        return '';
      }
      return classes.replace(/(\S+)/g, "flair-$1");
    };
    $scope.renderFlair = function(flair) {
      if (typeof flair !== 'string') {
        return '';
      }
      return flair.replace(/:([^:]+):/g,'');
    };
    $scope.applied = function (flair) {
      return flairService.applied(_.get($scope, pathToApps), flair);
    };
    $scope.canUserApply = function (applicationFlair) {
      if (!$scope.refUser || !$scope.user || $scope.user.name !== $scope.refUser.name) {
        return false;
      }
      return flairService.canUserApply(
        $scope.refUser.references,
        applicationFlair,
        flairService.getUserFlairs($scope.user, $scope.flairs)
      ) && !$scope.applied(applicationFlair, $scope.flairs);
    };
    $scope.hasEventFlair = function () {
      return flairService.hasEventFlair($scope.user);
    };
    $scope.formattedRequirements = function (flair) {
      return flairService.formattedRequirements(flair, $scope.flairs);
    };
    $scope.clickRefLink = function (ref) {
      if ($scope.user && $scope.user.isFlairMod) {
        io.socket.post('/flair/app/refreshClaim', ref, function (data, res) {
          if (res.statusCode !== 200) {
            console.log('Error ' + res.statusCode + ': Could not send link data to server.');
          }
        });
      }
    };
  }
};
