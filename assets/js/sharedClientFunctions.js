var socket = require("socket.io-client");
var io = require("sails.io.js")(socket);
var referenceService = require('../../api/services/References.js');
var flairService = require('../../api/services/Flairs.js');

module.exports = {
  addRepeats: function ($scope) {
    $scope.editRef = function () {
      $scope.editRefError = "";
      $scope.indexOk.editRef = false;
      var ref = $scope.selectedRef,
        url = "/reference/edit",
        regexp = /(http(s?):\/\/)?(www|[a-z]*\.)?reddit\.com\/r\/((pokemontrades)|(SVExchange)|(poketradereferences))\/comments\/([a-z\d]*)\/([^\/]+)\/([a-z\d]+)(\?[a-z\d]+)?/,
        regexpGive = /(http(s?):\/\/)?(www|[a-z]*\.)?reddit\.com\/r\/((SVExchange)|(pokemontrades)|(poketradereferences)|(Pokemongiveaway)|(SVgiveaway))\/comments\/([a-z\d]*)\/([^\/]+)\/?/,
        regexpMisc = /(http(s?):\/\/)?(www|[a-z]*\.)?reddit\.com.*/,
        regexpUser = /^(\/u\/)?[A-Za-z0-9_\-]*$/;
      if (!ref.type) {
        $scope.editRefError = "Please choose a type.";
        return;
      }
      if (ref.type === "egg" || ref.type === "giveaway" || ref.type === "misc" || ref.type === "eggcheck" || ref.type === "involvement") {
        if (!ref.description) {
          $scope.editRefError = "Make sure you enter all the information";
          return;
        }
      } else if (!ref.got || !ref.gave) {
        $scope.editRefError = "Make sure you enter all the information";
        return;
      }
      if (!ref.url || ref.type !== "giveaway" && ref.type !== "misc" && ref.type !== "eggcheck" && !ref.user2) {
        $scope.editRefError = "Make sure you enter all the information";
        return;
      }
      if (((ref.type === "giveaway" || ref.type === "eggcheck") && !regexpGive.test(ref.url)) ||
        (ref.type !== "giveaway" && ref.type !== "misc" && ref.type !== "eggcheck" && !regexp.test(ref.url)) ||
        (ref.type === "misc" && !regexpMisc.test(ref.url))) {
        $scope.editRefError = "Looks like you didn't input a proper permalink";
        return;
      }
      if (ref.user2.indexOf("/u/") === -1) {
        ref.user2 = "/u/" + ref.user2;
      }
      if (ref.user2 === ("/u/" + $scope.user.name)) {
        $scope.addRefError = "Don't put your own username there.";
        return;
      }
      if (($scope.type !== "giveaway" && $scope.type !== "misc") && !regexpUser.test(ref.user2)) {
        $scope.addRefError = "Please put a username on it's own, or in format: /u/username. Not the full url, or anything else.";
        return;
      }
      $scope.indexSpin.editRef = true;
      io.socket.post(url, ref, function (data, res) {
        $scope.indexSpin.editRef = false;
        if (res.statusCode === 200) {
          $scope.indexOk.editRef = true;
          var index = $scope.user.references.findIndex(function (searchRef) {
            return searchRef.id === ref.id;
          });
          $scope.user.references[index] = ref;
        } else {
          $scope.editRefError = "There was an issue.";
          console.log(res);
        }
        $scope.$apply();
      });
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
      var current_user = $scope.refUser || $scope.user;
      var url = "/reference/delete";
      io.socket.post(url, {refId: id}, function (data, res) {
        if (res.statusCode === 200) {
          current_user.references = current_user.references.filter(function (ref) {
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
    $scope.isApproved = referenceService.isApproved;
    $scope.getRedditUser = referenceService.getRedditUser;
    $scope.formattedName = flairService.formattedName;
    $scope.inPokemonTradesTrader = flairService.inPokemonTradesTrader;
    $scope.inPokemonTradesHelper = flairService.inPokemonTradesHelper;
    $scope.inSVExchangeHatcher = flairService.inSVExchangeHatcher;
    $scope.inSVExchangeGiver = flairService.inSVExchangeGiver;
    $scope.getFlair = flairService.getFlair;
    $scope.numberOfTrades = function () {
      return referenceService.numberOfTrades($scope.user);
    };
    $scope.numberOfGivenAway = function () {
      return referenceService.numberOfGivenAway($scope.user);
    };
    $scope.numberOfEggsGivenAway = function () {
      return referenceService.numberOfEggsGivenAway($scope.user);
    };
    $scope.numberOfEggChecks = function () {
      return referenceService.numberOfEggChecks($scope.user);
    };
    $scope.getFlairTextForSVEx = function () {
      return flairService.getFlairTextForSVEx($scope.user);
    };
    $scope.applied = function (flair) {
      return flairService.applied($scope.user, flair);
    };
    $scope.canUserApply = function (applicationFlair) {
      return flairService.canUserApply($scope.user, applicationFlair || $scope.selectedFlair, $scope.flairs);
    };
    $scope.formattedRequirements = function (flair) {
      return flairService.formattedRequirements(flair, $scope.flairs);
    };
  }
};
