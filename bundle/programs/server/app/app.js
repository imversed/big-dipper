var require = meteorInstall({"imports":{"api":{"accounts":{"server":{"methods.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/accounts/server/methods.js                                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let HTTP;
module.link("meteor/http", {
  HTTP(v) {
    HTTP = v;
  }

}, 1);
let Validators;
module.link("/imports/api/validators/validators.js", {
  Validators(v) {
    Validators = v;
  }

}, 2);

const fetchFromUrl = url => {
  try {
    let res = HTTP.get(API + url);

    if (res.statusCode == 200) {
      return res;
    }

    ;
  } catch (e) {
    console.log(url);
    console.log(e);
  }
};

Meteor.methods({
  'accounts.getAccountDetail': function (address) {
    this.unblock();
    let url = API + '/auth/accounts/' + address;

    try {
      let available = HTTP.get(url);

      if (available.statusCode == 200) {
        // return JSON.parse(available.content).account
        let response = JSON.parse(available.content).result;
        let account;
        if (response.type === 'cosmos-sdk/Account' || response.type === 'cosmos-sdk/BaseAccount') account = response.value;else if (response.type === 'cosmos-sdk/DelayedVestingAccount' || response.type === 'cosmos-sdk/ContinuousVestingAccount') account = response.value.BaseVestingAccount.BaseAccount;

        try {
          url = API + '/bank/balances/' + address;
          response = HTTP.get(url);
          let balances = JSON.parse(response.content).result;
          account.coins = balances;
          if (account && account.account_number != null) return account;
          return null;
        } catch (e) {
          return null;
        }
      }
    } catch (e) {
      console.log(url);
      console.log(e);
    }
  },
  'accounts.getBalance': function (address) {
    this.unblock();
    let balance = {}; // get available atoms

    let url = API + '/cosmos/bank/v1beta1/balances/' + address;

    try {
      let available = HTTP.get(url);

      if (available.statusCode == 200) {
        balance.available = JSON.parse(available.content).balances;
      }
    } catch (e) {
      console.log(url);
      console.log(e);
    } // get delegated amnounts


    url = API + '/cosmos/staking/v1beta1/delegations/' + address;

    try {
      let delegations = HTTP.get(url);

      if (delegations.statusCode == 200) {
        balance.delegations = JSON.parse(delegations.content).delegation_responses;
      }
    } catch (e) {
      console.log(url);
      console.log(e);
    } // get unbonding


    url = API + '/cosmos/staking/v1beta1/delegators/' + address + '/unbonding_delegations';

    try {
      let unbonding = HTTP.get(url);

      if (unbonding.statusCode == 200) {
        balance.unbonding = JSON.parse(unbonding.content).unbonding_responses;
      }
    } catch (e) {
      console.log(url);
      console.log(e);
    } // get rewards


    url = API + '/cosmos/distribution/v1beta1/delegators/' + address + '/rewards';

    try {
      let rewards = HTTP.get(url);

      if (rewards.statusCode == 200) {
        //get seperate rewards value
        balance.rewards = JSON.parse(rewards.content).rewards; //get total rewards value

        balance.total_rewards = JSON.parse(rewards.content).total;
      }
    } catch (e) {
      console.log(url);
      console.log(e);
    } // get commission


    let validator = Validators.findOne({
      $or: [{
        operator_address: address
      }, {
        delegator_address: address
      }, {
        address: address
      }]
    });

    if (validator) {
      let url = API + '/cosmos/distribution/v1beta1/validators/' + validator.operator_address + '/commission';
      balance.operatorAddress = validator.operator_address;

      try {
        let rewards = HTTP.get(url);

        if (rewards.statusCode == 200) {
          let content = JSON.parse(rewards.content).commission;
          if (content.commission && content.commission.length > 0) balance.commission = content.commission;
        }
      } catch (e) {
        console.log(url);
        console.log(e);
      }
    }

    return balance;
  },

  'accounts.getDelegation'(address, validator) {
    this.unblock();
    let url = "/cosmos/staking/v1beta1/validators/".concat(validator, "/delegations/").concat(address);
    let delegations = fetchFromUrl(url);
    console.log(delegations);
    delegations = delegations && delegations.data.delegation_response;
    if (delegations && delegations.delegation.shares) delegations.delegation.shares = parseFloat(delegations.delegation.shares);
    url = "/cosmos/staking/v1beta1/delegators/".concat(address, "/redelegations?dst_validator_addr=").concat(validator);
    let relegations = fetchFromUrl(url);
    relegations = relegations && relegations.data.redelegation_responses;
    let completionTime;

    if (relegations) {
      relegations.forEach(relegation => {
        let entries = relegation.entries;
        let time = new Date(entries[entries.length - 1].completion_time);
        if (!completionTime || time > completionTime) completionTime = time;
      });
      delegations.redelegationCompletionTime = completionTime;
    }

    url = "/cosmos/staking/v1beta1/validators/".concat(validator, "/delegations/").concat(address, "/unbonding_delegation");
    let undelegations = fetchFromUrl(url);
    undelegations = undelegations && undelegations.data.result;

    if (undelegations) {
      delegations.unbonding = undelegations.entries.length;
      delegations.unbondingCompletionTime = undelegations.entries[0].completion_time;
    }

    return delegations;
  },

  'accounts.getAllDelegations'(address) {
    this.unblock();
    let url = API + '/cosmos/staking/v1beta1/delegators/' + address + '/delegations';

    try {
      let delegations = HTTP.get(url);

      if (delegations.statusCode == 200) {
        delegations = JSON.parse(delegations.content).result;

        if (delegations && delegations.length > 0) {
          delegations.forEach((delegation, i) => {
            if (delegations[i] && delegations[i].shares) delegations[i].shares = parseFloat(delegations[i].shares);
          });
        }

        return delegations;
      }

      ;
    } catch (e) {
      console.log(url);
      console.log(e);
    }
  },

  'accounts.getAllUnbondings'(address) {
    this.unblock();
    let url = API + '/cosmos/staking/v1beta1/delegators/' + address + '/unbonding_delegations';

    try {
      let unbondings = HTTP.get(url);

      if (unbondings.statusCode == 200) {
        unbondings = JSON.parse(unbondings.content).result;
        return unbondings;
      }

      ;
    } catch (e) {
      console.log(url);
      console.log(e);
    }
  },

  'accounts.getAllRedelegations'(address, validator) {
    this.unblock();
    let url = "/cosmos/staking/v1beta1/v1beta1/delegators/".concat(address, "/redelegations&src_validator_addr=").concat(validator);

    try {
      let result = fetchFromUrl(url);

      if (result && result.data) {
        let redelegations = {};
        result.data.forEach(redelegation => {
          let entries = redelegation.entries;
          redelegations[redelegation.validator_dst_address] = {
            count: entries.length,
            completionTime: entries[0].completion_time
          };
        });
        return redelegations;
      }
    } catch (e) {
      console.log(url);
      console.log(e);
    }
  },

  'accounts.getRedelegations'(address) {
    this.unblock();
    let url = API + '/cosmos/staking/v1beta1/v1beta1/delegators/' + address + '/redelegations';

    try {
      let userRedelegations = HTTP.get(url);

      if (userRedelegations.statusCode == 200) {
        userRedelegations = JSON.parse(userRedelegations.content).result;
        return userRedelegations;
      }

      ;
    } catch (e) {
      console.log(url);
      console.log(e.response.content);
    }
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},"blocks":{"server":{"methods.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/blocks/server/methods.js                                                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  getValidatorProfileUrl: () => getValidatorProfileUrl
});
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let HTTP;
module.link("meteor/http", {
  HTTP(v) {
    HTTP = v;
  }

}, 1);
let Blockscon;
module.link("/imports/api/blocks/blocks.js", {
  Blockscon(v) {
    Blockscon = v;
  }

}, 2);
let Chain;
module.link("/imports/api/chain/chain.js", {
  Chain(v) {
    Chain = v;
  }

}, 3);
let ValidatorSets;
module.link("/imports/api/validator-sets/validator-sets.js", {
  ValidatorSets(v) {
    ValidatorSets = v;
  }

}, 4);
let Validators;
module.link("/imports/api/validators/validators.js", {
  Validators(v) {
    Validators = v;
  }

}, 5);
let ValidatorRecords, Analytics, VPDistributions;
module.link("/imports/api/records/records.js", {
  ValidatorRecords(v) {
    ValidatorRecords = v;
  },

  Analytics(v) {
    Analytics = v;
  },

  VPDistributions(v) {
    VPDistributions = v;
  }

}, 6);
let VotingPowerHistory;
module.link("/imports/api/voting-power/history.js", {
  VotingPowerHistory(v) {
    VotingPowerHistory = v;
  }

}, 7);
let Transactions;
module.link("../../transactions/transactions.js", {
  Transactions(v) {
    Transactions = v;
  }

}, 8);
let Evidences;
module.link("../../evidences/evidences.js", {
  Evidences(v) {
    Evidences = v;
  }

}, 9);
let sha256;
module.link("js-sha256", {
  sha256(v) {
    sha256 = v;
  }

}, 10);
let cheerio;
module.link("cheerio", {
  "*"(v) {
    cheerio = v;
  }

}, 11);

getRemovedValidators = (prevValidators, validators) => {
  // let removeValidators = [];
  for (p in prevValidators) {
    for (v in validators) {
      if (prevValidators[p].address == validators[v].address) {
        prevValidators.splice(p, 1);
      }
    }
  }

  return prevValidators;
};

getValidatorFromConsensusKey = (validators, consensusKey) => {
  for (v in validators) {
    try {
      let pubkeyType = Meteor.settings.public.secp256k1 ? 'tendermint/PubKeySecp256k1' : 'tendermint/PubKeyEd25519';
      let pubkey = Meteor.call('bech32ToPubkey', consensusKey, pubkeyType);

      if (validators[v].pub_key.value == pubkey) {
        return validators[v];
      }
    } catch (e) {
      console.log("Error converting pubkey: %o\n%o", consensusKey, e);
    }
  }

  return null;
};

const getValidatorProfileUrl = identity => {
  console.log("Get validator avatar.");

  if (identity.length == 16) {
    let response = HTTP.get("https://keybase.io/_/api/1.0/user/lookup.json?key_suffix=".concat(identity, "&fields=pictures"));

    if (response.statusCode == 200) {
      var _response$data, _them$, _them$2, _them$2$pictures, _them$3, _them$3$pictures, _them$3$pictures$prim;

      let them = response === null || response === void 0 ? void 0 : (_response$data = response.data) === null || _response$data === void 0 ? void 0 : _response$data.them;
      return them && them.length && ((_them$ = them[0]) === null || _them$ === void 0 ? void 0 : _them$.pictures) && ((_them$2 = them[0]) === null || _them$2 === void 0 ? void 0 : (_them$2$pictures = _them$2.pictures) === null || _them$2$pictures === void 0 ? void 0 : _them$2$pictures.primary) && ((_them$3 = them[0]) === null || _them$3 === void 0 ? void 0 : (_them$3$pictures = _them$3.pictures) === null || _them$3$pictures === void 0 ? void 0 : (_them$3$pictures$prim = _them$3$pictures.primary) === null || _them$3$pictures$prim === void 0 ? void 0 : _them$3$pictures$prim.url);
    } else {
      console.log(JSON.stringify(response));
    }
  } else if (identity.indexOf("keybase.io/team/") > 0) {
    let teamPage = HTTP.get(identity);

    if (teamPage.statusCode == 200) {
      let page = cheerio.load(teamPage.content);
      return page(".kb-main-card img").attr('src');
    } else {
      console.log(JSON.stringify(teamPage));
    }
  }
};

getValidatorUptime = validatorSet => Promise.asyncApply(() => {
  // get validator uptime
  let url = "".concat(API, "/cosmos/slashing/v1beta1/params");
  let response = HTTP.get(url);
  let slashingParams = JSON.parse(response.content);
  Chain.upsert({
    chainId: Meteor.settings.public.chainId
  }, {
    $set: {
      "slashing": slashingParams
    }
  });

  for (let key in validatorSet) {
    // console.log("Getting uptime validator: %o", validatorSet[key]);
    try {
      // console.log("=== Signing Info ===: %o", signingInfo)
      url = "".concat(API, "/cosmos/slashing/v1beta1/signing_infos/").concat(validatorSet[key].bech32ValConsAddress);
      let response = HTTP.get(url);
      let signingInfo = JSON.parse(response.content).val_signing_info;

      if (signingInfo) {
        let valData = validatorSet[key];
        valData.tombstoned = signingInfo.tombstoned;
        valData.jailed_until = signingInfo.jailed_until;
        valData.index_offset = parseInt(signingInfo.index_offset);
        valData.start_height = parseInt(signingInfo.start_height);
        valData.uptime = (slashingParams.params.signed_blocks_window - parseInt(signingInfo.missed_blocks_counter)) / slashingParams.params.signed_blocks_window * 100;
        Validators.upsert({
          bech32ValConsAddress: validatorSet[key].bech32ValConsAddress
        }, {
          $set: valData
        });
      }
    } catch (e) {
      console.log(url);
      console.log("Getting signing info of %o: %o", validatorSet[key].bech32ValConsAddress, e);
    }
  }
});

calculateVPDist = (analyticsData, blockData) => Promise.asyncApply(() => {
  console.log("===== calculate voting power distribution =====");
  let activeValidators = Validators.find({
    status: 'BOND_STATUS_BONDED',
    jailed: false
  }, {
    sort: {
      voting_power: -1
    }
  }).fetch();
  let numTopTwenty = Math.ceil(activeValidators.length * 0.2);
  let numBottomEighty = activeValidators.length - numTopTwenty;
  let topTwentyPower = 0;
  let bottomEightyPower = 0;
  let numTopThirtyFour = 0;
  let numBottomSixtySix = 0;
  let topThirtyFourPercent = 0;
  let bottomSixtySixPercent = 0;

  for (v in activeValidators) {
    if (v < numTopTwenty) {
      topTwentyPower += activeValidators[v].voting_power;
    } else {
      bottomEightyPower += activeValidators[v].voting_power;
    }

    if (topThirtyFourPercent < 0.34) {
      topThirtyFourPercent += activeValidators[v].voting_power / analyticsData.voting_power;
      numTopThirtyFour++;
    }
  }

  bottomSixtySixPercent = 1 - topThirtyFourPercent;
  numBottomSixtySix = activeValidators.length - numTopThirtyFour;
  let vpDist = {
    height: blockData.height,
    numTopTwenty: numTopTwenty,
    topTwentyPower: topTwentyPower,
    numBottomEighty: numBottomEighty,
    bottomEightyPower: bottomEightyPower,
    numTopThirtyFour: numTopThirtyFour,
    topThirtyFourPercent: topThirtyFourPercent,
    numBottomSixtySix: numBottomSixtySix,
    bottomSixtySixPercent: bottomSixtySixPercent,
    numValidators: activeValidators.length,
    totalVotingPower: analyticsData.voting_power,
    blockTime: blockData.time,
    createAt: new Date()
  };
  console.log(vpDist);
  VPDistributions.insert(vpDist);
}); // var filtered = [1, 2, 3, 4, 5].filter(notContainedIn([1, 2, 3, 5]));
// console.log(filtered); // [4]


Meteor.methods({
  'blocks.averageBlockTime'(address) {
    this.unblock();
    let blocks = Blockscon.find({
      proposerAddress: address
    }).fetch();
    let heights = blocks.map(block => {
      return block.height;
    });
    let blocksStats = Analytics.find({
      height: {
        $in: heights
      }
    }).fetch(); // console.log(blocksStats);

    let totalBlockDiff = 0;

    for (b in blocksStats) {
      totalBlockDiff += blocksStats[b].timeDiff;
    }

    return totalBlockDiff / heights.length;
  },

  'blocks.getLatestHeight': function () {
    this.unblock();
    let url = RPC + '/status';

    try {
      let response = HTTP.get(url);
      let status = JSON.parse(response.content);
      return status.result.sync_info.latest_block_height;
    } catch (e) {
      return 0;
    }
  },
  'blocks.getCurrentHeight': function () {
    this.unblock();
    let currHeight = Blockscon.find({}, {
      sort: {
        height: -1
      },
      limit: 1
    }).fetch(); // console.log("currentHeight:"+currHeight);

    let startHeight = Meteor.settings.params.startHeight;

    if (currHeight && currHeight.length == 1) {
      let height = currHeight[0].height;
      if (height > startHeight) return height;
    }

    return startHeight;
  },
  'blocks.blocksUpdate': function () {
    return Promise.asyncApply(() => {
      this.unblock();
      if (SYNCING) return "Syncing...";else console.log("start to sync"); // Meteor.clearInterval(Meteor.timerHandle);
      // get the latest height

      let until = Meteor.call('blocks.getLatestHeight'); // console.log(until);
      // get the current height in db

      let curr = Meteor.call('blocks.getCurrentHeight');
      console.log(curr); // loop if there's update in db

      if (until > curr) {
        SYNCING = true;
        let validatorSet = []; // get latest validator candidate information

        let url = API + '/cosmos/staking/v1beta1/validators?status=BOND_STATUS_BONDED&pagination.limit=200&pagination.count_total=true';

        try {
          let response = HTTP.get(url);
          let result = JSON.parse(response.content).validators;
          result.forEach(validator => validatorSet[validator.consensus_pubkey.key] = validator);
        } catch (e) {
          console.log(url);
          console.log(e);
        }

        try {
          url = API + '/cosmos/staking/v1beta1/validators?status=BOND_STATUS_UNBONDING&pagination.limit=200&pagination.count_total=true';
          let response = HTTP.get(url);
          let result = JSON.parse(response.content).validators;
          result.forEach(validator => validatorSet[validator.consensus_pubkey.key] = validator);
        } catch (e) {
          console.log(url);
          console.log(e);
        }

        try {
          url = API + '/cosmos/staking/v1beta1/validators?status=BOND_STATUS_UNBONDED&pagination.limit=200&pagination.count_total=true';
          let response = HTTP.get(url);
          let result = JSON.parse(response.content).validators;
          result.forEach(validator => validatorSet[validator.consensus_pubkey.key] = validator);
        } catch (e) {
          console.log(url);
          console.log(e);
        } // console.log("validaotor set: %o", validatorSet);


        let totalValidators = Object.keys(validatorSet).length;
        console.log("all validators: " + totalValidators);
        Chain.update({
          chainId: Meteor.settings.public.chainId
        }, {
          $set: {
            totalValidators: totalValidators
          }
        });

        for (let height = curr + 1; height <= until; height++) {
          // for (let height = curr+1 ; height <= curr+1 ; height++) {
          let startBlockTime = new Date(); // add timeout here? and outside this loop (for catched up and keep fetching)?

          this.unblock(); // let url = RPC+'/block?height=' + height;

          url = "".concat(API, "/blocks/").concat(height);
          let analyticsData = {};
          const bulkValidators = Validators.rawCollection().initializeUnorderedBulkOp();
          const bulkUpdateLastSeen = Validators.rawCollection().initializeUnorderedBulkOp();
          const bulkValidatorRecords = ValidatorRecords.rawCollection().initializeUnorderedBulkOp();
          const bulkVPHistory = VotingPowerHistory.rawCollection().initializeUnorderedBulkOp();
          const bulkTransactions = Transactions.rawCollection().initializeUnorderedBulkOp();
          console.log("Getting block at height: %o", height);

          try {
            let startGetHeightTime = new Date();
            let response = HTTP.get(url); // store height, hash, numtransaction and time in db

            let blockData = {};
            let block = JSON.parse(response.content);
            blockData.height = height;
            blockData.hash = block.block_id.hash;
            blockData.transNum = block.block.data.txs ? block.block.data.txs.length : 0;
            blockData.time = block.block.header.time;
            blockData.lastBlockHash = block.block.header.last_block_id.hash;
            blockData.proposerAddress = block.block.header.proposer_address;
            blockData.validators = []; // save txs in database

            if (block.block.data.txs && block.block.data.txs.length > 0) {
              for (t in block.block.data.txs) {
                bulkTransactions.insert({
                  // hash has to be in uppercase
                  txhash: sha256(Buffer.from(block.block.data.txs[t], 'base64')).toUpperCase(),
                  height: parseInt(height),
                  processed: false
                });
              }

              if (bulkTransactions.length > 0) {
                bulkTransactions.execute((err, result) => {
                  if (err) {
                    console.log(err);
                  }

                  if (result) {// console.log(result);
                  }
                });
              }
            } // save double sign evidences


            if (block.block.evidence.evidenceList) {
              Evidences.insert({
                height: height,
                evidence: block.block.evidence.evidenceList
              });
            } // console.log("signatures: %o", block.block.lastCommit.signaturesList)


            blockData.precommitsCount = block.block.last_commit.signatures.length;
            analyticsData.height = height;
            let endGetHeightTime = new Date();
            console.log("Get height time: " + (endGetHeightTime - startGetHeightTime) / 1000 + "seconds.");
            let startGetValidatorsTime = new Date(); // update chain status

            let validators = [];
            let page = 0; // let nextKey = 0;

            try {
              let result;

              do {
                let url = RPC + "/validators?height=".concat(height, "&page=").concat(++page, "&per_page=100");
                let response = HTTP.get(url);
                result = JSON.parse(response.content).result; // console.log("========= validator result ==========: %o", result)

                validators = [...validators, ...result.validators]; // console.log(validators.length);
                // console.log(parseInt(result.total));
              } while (validators.length < parseInt(result.total));
            } catch (e) {
              console.log("Getting validator set at height %o: %o", height, e);
            } // console.log(validators)


            ValidatorSets.insert({
              block_height: height,
              validators: validators
            });
            blockData.validatorsCount = validators.length; // temporarily add bech32 concensus keys to the validator set list

            let tempValidators = [];

            for (let v in validators) {
              // validators[v].consensus_pubkey = Meteor.call('pubkeyToBech32Old', validators[v].pub_key, Meteor.settings.public.bech32PrefixConsPub);
              // validators[v].valconsAddress = validators[v].address;
              validators[v].valconsAddress = Meteor.call('hexToBech32', validators[v].address, Meteor.settings.public.bech32PrefixConsAddr); // validators[v].address = Meteor.call('getAddressFromPubkey', validators[v].pubKey);
              // tempValidators[validators[v].pubKey.value] = validators[v];

              tempValidators[validators[v].address] = validators[v];
            }

            validators = tempValidators; // console.log("before comparing precommits: %o", validators);
            // Tendermint v0.33 start using "signatures" in last block instead of "precommits"

            let precommits = block.block.last_commit.signatures;

            if (precommits != null) {
              // console.log(precommits);
              for (let i = 0; i < precommits.length; i++) {
                if (precommits[i] != null) {
                  blockData.validators.push(precommits[i].validator_address);
                }
              }

              analyticsData.precommits = precommits.length; // record for analytics
              // PrecommitRecords.insert({height:height, precommits:precommits.length});
            }

            if (height > 1) {
              // record precommits and calculate uptime
              // only record from block 2
              console.log("Inserting precommits");

              for (i in validators) {
                let address = validators[i].address;
                let record = {
                  height: height,
                  address: address,
                  exists: false,
                  voting_power: parseInt(validators[i].voting_power)
                };

                for (j in precommits) {
                  if (precommits[j] != null) {
                    let precommitAddress = precommits[j].validator_address;

                    if (address == precommitAddress) {
                      record.exists = true;
                      bulkUpdateLastSeen.find({
                        address: precommitAddress
                      }).upsert().updateOne({
                        $set: {
                          lastSeen: blockData.time
                        }
                      });
                      precommits.splice(j, 1);
                      break;
                    }
                  }
                }

                bulkValidatorRecords.insert(record); // ValidatorRecords.update({height:height,address:record.address},record);
              }
            }

            let startBlockInsertTime = new Date();
            Blockscon.insert(blockData);
            let endBlockInsertTime = new Date();
            console.log("Block insert time: " + (endBlockInsertTime - startBlockInsertTime) / 1000 + "seconds.");
            let chainStatus = Chain.findOne({
              chainId: block.block.header.chain_id
            });
            let lastSyncedTime = chainStatus ? chainStatus.lastSyncedTime : 0;
            let timeDiff;
            let blockTime = Meteor.settings.params.defaultBlockTime;

            if (lastSyncedTime) {
              let dateLatest = new Date(blockData.time);
              let dateLast = new Date(lastSyncedTime);
              let genesisTime = new Date(Meteor.settings.public.genesisTime);
              timeDiff = Math.abs(dateLatest.getTime() - dateLast.getTime()); // blockTime = (chainStatus.blockTime * (blockData.height - 1) + timeDiff) / blockData.height;

              blockTime = (dateLatest.getTime() - genesisTime.getTime()) / blockData.height;
            }

            let endGetValidatorsTime = new Date();
            console.log("Get height validators time: " + (endGetValidatorsTime - startGetValidatorsTime) / 1000 + "seconds.");
            Chain.update({
              chainId: block.block.header.chainId
            }, {
              $set: {
                lastSyncedTime: blockData.time,
                blockTime: blockTime
              }
            });
            analyticsData.averageBlockTime = blockTime;
            analyticsData.timeDiff = timeDiff;
            analyticsData.time = blockData.time; // initialize validator data at first block
            // if (height == 1){
            //     Validators.remove({});
            // }

            analyticsData.voting_power = 0;
            let startFindValidatorsNameTime = new Date();

            for (v in validatorSet) {
              let valData = validatorSet[v];
              valData.tokens = parseInt(valData.tokens);
              valData.unbonding_height = parseInt(valData.unbonding_height);
              let valExist = Validators.findOne({
                "consensus_pubkey.key": v
              }); // console.log(valData);
              // console.log("===== voting power ======: %o", valData)

              analyticsData.voting_power += valData.voting_power; // console.log(analyticsData.voting_power);

              if (!valExist && valData.consensus_pubkey) {
                // let val = getValidatorFromConsensusKey(validators, v);
                // get the validator hex address and other bech32 addresses.
                valData.delegator_address = Meteor.call('getDelegator', valData.operator_address); // console.log("get hex address")
                // valData.address = getAddress(valData.consensusPubkey);

                console.log("get bech32 consensus pubkey");
                valData.bech32ConsensusPubKey = Meteor.call('pubkeyToBech32', valData.consensus_pubkey, Meteor.settings.public.bech32PrefixConsPub);
                valData.address = Meteor.call('getAddressFromPubkey', valData.consensus_pubkey);
                valData.bech32ValConsAddress = Meteor.call('hexToBech32', valData.address, Meteor.settings.public.bech32PrefixConsAddr); // assign back to the validator set so that we can use it to find the uptime

                if (validatorSet[v]) validatorSet[v].bech32ValConsAddress = valData.bech32ValConsAddress; // First time adding validator to the database.
                // Fetch profile picture from Keybase

                if (valData.description && valData.description.identity) {
                  try {
                    valData.profile_url = getValidatorProfileUrl(valData.description.identity);
                  } catch (e) {
                    console.log("Error fetching keybase: %o", e);
                  }
                }

                valData.accpub = Meteor.call('pubkeyToBech32', valData.consensus_pubkey, Meteor.settings.public.bech32PrefixAccPub);
                valData.operator_pubkey = Meteor.call('pubkeyToBech32', valData.consensus_pubkey, Meteor.settings.public.bech32PrefixValPub); // insert first power change history 
                // valData.voting_power = validators[valData.consensusPubkey.value]?parseInt(validators[valData.consensusPubkey.value].votingPower):0;

                valData.voting_power = validators[valData.address] ? parseInt(validators[valData.address].voting_power) : 0;
                valData.proposer_priority = validators[valData.address] ? parseInt(validators[valData.address].proposer_priority) : 0;
                console.log("Validator not found. Insert first VP change record."); // console.log("first voting power: %o", valData.voting_power);

                bulkVPHistory.insert({
                  address: valData.address,
                  prev_voting_power: 0,
                  voting_power: valData.voting_power,
                  type: 'add',
                  height: blockData.height,
                  block_time: blockData.time
                }); // }
              } else {
                // console.log(valData);
                valData.address = valExist.address; // assign to valData for getting self delegation

                valData.delegator_address = valExist.delegator_address;
                valData.bech32ValConsAddress = valExist.bech32ValConsAddress;

                if (validatorSet[v]) {
                  validatorSet[v].bech32ValConsAddress = valExist.bech32ValConsAddress;
                } // console.log(valExist);
                // console.log(validators[valExist.address])
                // if (validators[valData.consensusPubkey.value]){


                if (validators[valExist.address]) {
                  // Validator exists and is in validator set, update voitng power.
                  // If voting power is different from before, add voting power history
                  valData.voting_power = parseInt(validators[valExist.address].voting_power);
                  valData.proposer_priority = parseInt(validators[valExist.address].proposer_priority);
                  let prevVotingPower = VotingPowerHistory.findOne({
                    address: valExist.address
                  }, {
                    height: -1,
                    limit: 1
                  });
                  console.log("Validator already in DB. Check if VP changed.");

                  if (prevVotingPower) {
                    if (prevVotingPower.voting_power != valData.voting_power) {
                      let changeType = prevVotingPower.voting_power > valData.voting_power ? 'down' : 'up';
                      let changeData = {
                        address: valExist.address,
                        prev_voting_power: prevVotingPower.voting_power,
                        voting_power: valData.voting_power,
                        type: changeType,
                        height: blockData.height,
                        block_time: blockData.time
                      };
                      bulkVPHistory.insert(changeData);
                    }
                  }
                } else {
                  // Validator is not in the set and it has been removed.
                  // Set voting power to zero and add voting power history.
                  valData.address = valExist.address;
                  valData.voting_power = 0;
                  valData.proposer_priority = 0;
                  let prevVotingPower = VotingPowerHistory.findOne({
                    address: valExist.address
                  }, {
                    height: -1,
                    limit: 1
                  });

                  if (prevVotingPower && prevVotingPower.voting_power > 0) {
                    console.log("Validator is in DB but not in validator set now. Add remove VP change.");
                    bulkVPHistory.insert({
                      address: valExist.address,
                      prev_voting_power: prevVotingPower,
                      voting_power: 0,
                      type: 'remove',
                      height: blockData.height,
                      block_time: blockData.time
                    });
                  }
                }
              } // only update validator infor during start of crawling, end of crawling or every validator update window


              if (height == curr + 1 || height == Meteor.settings.params.startHeight + 1 || height == until || height % Meteor.settings.params.validatorUpdateWindow == 0) {
                if (height == Meteor.settings.params.startHeight + 1 || height % Meteor.settings.params.validatorUpdateWindow == 0) {
                  if (valData.status == 'BOND_STATUS_BONDED') {
                    url = "".concat(API, "/cosmos/staking/v1beta1/validators/").concat(valData.operator_address, "/delegations/").concat(valData.delegator_address);

                    try {
                      console.log("Getting self delegation");
                      let response = HTTP.get(url);
                      let selfDelegation = JSON.parse(response.content).delegation_response;
                      valData.self_delegation = selfDelegation.delegation && selfDelegation.delegation.shares ? parseFloat(selfDelegation.delegation.shares) / parseFloat(valData.delegator_shares) : 0;
                    } catch (e) {
                      console.log(url);
                      console.log("Getting self delegation: %o", e);
                      valData.self_delegation = 0;
                    }
                  }
                }

                console.log("Add validator upsert to bulk operations.");
                bulkValidators.find({
                  "address": valData.address
                }).upsert().updateOne({
                  $set: valData
                });
              }
            } // store valdiators exist records
            // let existingValidators = Validators.find({address:{$exists:true}}).fetch();
            // update uptime by the end of the crawl or update window


            if (height % Meteor.settings.params.validatorUpdateWindow == 0 || height == until) {
              console.log("Update validator uptime.");
              getValidatorUptime(validatorSet);
            }

            let endFindValidatorsNameTime = new Date();
            console.log("Get validators name time: " + (endFindValidatorsNameTime - startFindValidatorsNameTime) / 1000 + "seconds."); // record for analytics

            let startAnayticsInsertTime = new Date();
            Analytics.insert(analyticsData);
            let endAnalyticsInsertTime = new Date();
            console.log("Analytics insert time: " + (endAnalyticsInsertTime - startAnayticsInsertTime) / 1000 + "seconds."); // calculate voting power distribution every 60 blocks ~ 5mins

            if (height % 60 == 1) {
              calculateVPDist(analyticsData, blockData);
            }

            let startVUpTime = new Date();

            if (bulkValidators.length > 0) {
              console.log("############ Update validators ############");
              bulkValidators.execute((err, result) => {
                if (err) {
                  console.log("Error while bulk insert validators: %o", err);
                }

                if (result) {
                  bulkUpdateLastSeen.execute((err, result) => {
                    if (err) {
                      console.log("Error while bulk update validator last seen: %o", err);
                    }

                    if (result) {}
                  });
                }
              });
            }

            let endVUpTime = new Date();
            console.log("Validator update time: " + (endVUpTime - startVUpTime) / 1000 + "seconds.");
            let startVRTime = new Date();

            if (bulkValidatorRecords.length > 0) {
              bulkValidatorRecords.execute(err => {
                if (err) {
                  console.log(err);
                }
              });
            }

            let endVRTime = new Date();
            console.log("Validator records update time: " + (endVRTime - startVRTime) / 1000 + "seconds.");

            if (bulkVPHistory.length > 0) {
              bulkVPHistory.execute(err => {
                if (err) {
                  console.log(err);
                }
              });
            } // }

          } catch (e) {
            console.log("Block syncing stopped: %o", e);
            SYNCING = false;
            return "Stopped";
          }

          let endBlockTime = new Date();
          console.log("This block used: " + (endBlockTime - startBlockTime) / 1000 + "seconds.");
        }

        SYNCING = false;
        Chain.update({
          chainId: Meteor.settings.public.chainId
        }, {
          $set: {
            lastBlocksSyncedTime: new Date()
          }
        });
      }

      return until;
    });
  },
  'addLimit': function (limit) {
    // console.log(limit+10)
    return limit + 10;
  },
  'hasMore': function (limit) {
    if (limit > Meteor.call('getCurrentHeight')) {
      return false;
    } else {
      return true;
    }
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"publications.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/blocks/server/publications.js                                                                           //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let Blockscon;
module.link("../blocks.js", {
  Blockscon(v) {
    Blockscon = v;
  }

}, 1);
let Validators;
module.link("../../validators/validators.js", {
  Validators(v) {
    Validators = v;
  }

}, 2);
let Transactions;
module.link("../../transactions/transactions.js", {
  Transactions(v) {
    Transactions = v;
  }

}, 3);
publishComposite('blocks.height', function (limit) {
  return {
    find() {
      return Blockscon.find({}, {
        limit: limit,
        sort: {
          height: -1
        }
      });
    },

    children: [{
      find(block) {
        return Validators.find({
          address: block.proposerAddress
        }, {
          limit: 1
        });
      }

    }]
  };
});
publishComposite('blocks.findOne', function (height) {
  return {
    find() {
      return Blockscon.find({
        height: height
      });
    },

    children: [{
      find(block) {
        return Transactions.find({
          height: block.height
        });
      }

    }, {
      find(block) {
        return Validators.find({
          address: block.proposerAddress
        }, {
          limit: 1
        });
      }

    }]
  };
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"blocks.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/blocks/blocks.js                                                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  Blockscon: () => Blockscon
});
let Mongo;
module.link("meteor/mongo", {
  Mongo(v) {
    Mongo = v;
  }

}, 0);
let Validators;
module.link("../validators/validators.js", {
  Validators(v) {
    Validators = v;
  }

}, 1);
const Blockscon = new Mongo.Collection('blocks');
Blockscon.helpers({
  proposer() {
    return Validators.findOne({
      address: this.proposerAddress
    });
  }

}); // Blockscon.helpers({
//     sorted(limit) {
//         return Blockscon.find({}, {sort: {height:-1}, limit: limit});
//     }
// });
// Meteor.setInterval(function() {
//     Meteor.call('blocksUpdate', (error, result) => {
//         console.log(result);
//     })
// }, 30000000);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"chain":{"server":{"methods.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/chain/server/methods.js                                                                                 //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let HTTP;
module.link("meteor/http", {
  HTTP(v) {
    HTTP = v;
  }

}, 1);
let Chain, ChainStates;
module.link("../chain.js", {
  Chain(v) {
    Chain = v;
  },

  ChainStates(v) {
    ChainStates = v;
  }

}, 2);
let Coin;
module.link("../../../../both/utils/coins.js", {
  default(v) {
    Coin = v;
  }

}, 3);

findVotingPower = (validator, genValidators) => {
  for (let v in genValidators) {
    if (validator.pub_key.value == genValidators[v].pub_key.value) {
      return parseInt(genValidators[v].power);
    }
  }
};

Meteor.methods({
  'chain.getConsensusState': function () {
    this.unblock();
    let url = RPC + '/dump_consensus_state';

    try {
      let response = HTTP.get(url);
      let consensus = JSON.parse(response.content);
      consensus = consensus.result;
      let height = consensus.round_state.height;
      let round = consensus.round_state.round;
      let step = consensus.round_state.step;
      let votedPower = Math.round(parseFloat(consensus.round_state.votes[round].prevotes_bit_array.split(" ")[3]) * 100);
      Chain.update({
        chainId: Meteor.settings.public.chainId
      }, {
        $set: {
          votingHeight: height,
          votingRound: round,
          votingStep: step,
          votedPower: votedPower,
          proposerAddress: consensus.round_state.validators.proposer.address,
          prevotes: consensus.round_state.votes[round].prevotes,
          precommits: consensus.round_state.votes[round].precommits
        }
      });
    } catch (e) {
      console.log(url);
      console.log(e);
    }
  },
  'chain.updateStatus': function () {
    return Promise.asyncApply(() => {
      this.unblock();
      let url = "";

      try {
        url = API + '/blocks/latest';
        let response = HTTP.get(url);
        let latestBlock = JSON.parse(response.content);
        let chain = {};
        chain.chainId = latestBlock.block.header.chain_id;
        chain.latestBlockHeight = parseInt(latestBlock.block.header.height);
        chain.latestBlockTime = latestBlock.block.header.time;
        let latestState = ChainStates.findOne({}, {
          sort: {
            height: -1
          }
        });

        if (latestState && latestState.height >= chain.latestBlockHeight) {
          return "no updates (getting block ".concat(chain.latestBlockHeight, " at block ").concat(latestState.height, ")");
        } // Since Tendermint v0.33, validator page default set to return 30 validators.
        // Query latest height with page 1 and 100 validators per page.
        // validators = validators.validatorsList;
        // chain.validators = validators.length;


        let validators = [];
        let page = 0;

        do {
          url = RPC + "/validators?page=".concat(++page, "&per_page=100");
          let response = HTTP.get(url);
          result = JSON.parse(response.content).result;
          validators = [...validators, ...result.validators];
        } while (validators.length < parseInt(result.total));

        chain.validators = validators.length;
        let activeVP = 0;

        for (v in validators) {
          activeVP += parseInt(validators[v].voting_power);
        }

        chain.activeVotingPower = activeVP; // update staking params

        try {
          url = API + '/cosmos/staking/v1beta1/params';
          response = HTTP.get(url);
          chain.staking = JSON.parse(response.content);
        } catch (e) {
          console.log(e);
        } // Get chain states


        if (parseInt(chain.latestBlockHeight) > 0) {
          let chainStates = {};
          chainStates.height = parseInt(chain.latestBlockHeight);
          chainStates.time = new Date(chain.latestBlockTime);

          try {
            url = API + '/cosmos/staking/v1beta1/pool';
            let response = HTTP.get(url);
            let bonding = JSON.parse(response.content).pool;
            chainStates.bondedTokens = parseInt(bonding.bonded_tokens);
            chainStates.notBondedTokens = parseInt(bonding.not_bonded_tokens);
          } catch (e) {
            console.log(e);
          }

          if (Coin.StakingCoin.denom) {
            if (Meteor.settings.public.modules.bank) {
              try {
                url = API + '/cosmos/bank/v1beta1/supply/' + Coin.StakingCoin.denom;
                let response = HTTP.get(url);
                let supply = JSON.parse(response.content);
                chainStates.totalSupply = parseInt(supply.amount.amount);
              } catch (e) {
                console.log(e);
              } // update bank params


              try {
                url = API + '/cosmos/bank/v1beta1/params';
                response = HTTP.get(url);
                chain.bank = JSON.parse(response.content);
              } catch (e) {
                console.log(e);
              }
            }

            if (Meteor.settings.public.modules.distribution) {
              try {
                url = API + '/cosmos/distribution/v1beta1/community_pool';
                let response = HTTP.get(url);
                let pool = JSON.parse(response.content).pool;

                if (pool && pool.length > 0) {
                  chainStates.communityPool = [];
                  pool.forEach(amount => {
                    chainStates.communityPool.push({
                      denom: amount.denom,
                      amount: parseFloat(amount.amount)
                    });
                  });
                }
              } catch (e) {
                console.log(e);
              } // update distribution params


              try {
                url = API + '/cosmos/distribution/v1beta1/params';
                response = HTTP.get(url);
                chain.distribution = JSON.parse(response.content);
              } catch (e) {
                console.log(e);
              }
            }

            if (Meteor.settings.public.modules.minting) {
              try {
                url = API + '/cosmos/mint/v1beta1/inflation';
                let response = HTTP.get(url);
                let inflation = JSON.parse(response.content).inflation; // response = HTTP.get(url);
                // let inflation = JSON.parse(response.content).result;

                if (inflation) {
                  chainStates.inflation = parseFloat(inflation);
                }
              } catch (e) {
                console.log(e);
              }

              try {
                url = API + '/cosmos/mint/v1beta1/annual_provisions';
                let response = HTTP.get(url);
                let provisions = JSON.parse(response.content).annual_provisions;
                console.log(provisions);

                if (provisions) {
                  chainStates.annualProvisions = parseFloat(provisions);
                }
              } catch (e) {
                console.log(e);
              } // update mint params


              try {
                url = API + '/cosmos/mint/v1beta1/params';
                response = HTTP.get(url);
                chain.mint = JSON.parse(response.content);
              } catch (e) {
                console.log(e);
              }
            }

            if (Meteor.settings.public.modules.gov) {
              // update gov params
              try {
                url = API + '/cosmos/gov/v1beta1/params/tallying';
                response = HTTP.get(url);
                chain.gov = JSON.parse(response.content);
              } catch (e) {
                console.log(e);
              }
            }
          }

          ChainStates.insert(chainStates);
        }

        Chain.update({
          chainId: chain.chainId
        }, {
          $set: chain
        }, {
          upsert: true
        }); // chain.totalVotingPower = totalVP;
        // validators = Validators.find({}).fetch();
        // console.log(validators);

        return chain.latestBlockHeight;
      } catch (e) {
        console.log(url);
        console.log(e);
        return "Error getting chain status.";
      }
    });
  },
  'chain.getLatestStatus': function () {
    this.unblock();
    Chain.find().sort({
      created: -1
    }).limit(1);
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"publications.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/chain/server/publications.js                                                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let Chain, ChainStates;
module.link("../chain.js", {
  Chain(v) {
    Chain = v;
  },

  ChainStates(v) {
    ChainStates = v;
  }

}, 1);
let CoinStats;
module.link("../../coin-stats/coin-stats.js", {
  CoinStats(v) {
    CoinStats = v;
  }

}, 2);
let Validators;
module.link("../../validators/validators.js", {
  Validators(v) {
    Validators = v;
  }

}, 3);
Meteor.publish('chainStates.latest', function () {
  return [ChainStates.find({}, {
    sort: {
      height: -1
    },
    limit: 1
  }), CoinStats.find({}, {
    sort: {
      last_updated_at: -1
    },
    limit: 1
  })];
});
publishComposite('chain.status', function () {
  return {
    find() {
      return Chain.find({
        chainId: Meteor.settings.public.chainId
      });
    },

    children: [{
      find(chain) {
        return Validators.find({}, {
          fields: {
            address: 1,
            description: 1,
            operatorAddress: 1,
            status: -1,
            jailed: 1,
            profile_url: 1
          }
        });
      }

    }]
  };
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"chain.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/chain/chain.js                                                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  Chain: () => Chain,
  ChainStates: () => ChainStates
});
let Mongo;
module.link("meteor/mongo", {
  Mongo(v) {
    Mongo = v;
  }

}, 0);
let Validators;
module.link("../validators/validators.js", {
  Validators(v) {
    Validators = v;
  }

}, 1);
const Chain = new Mongo.Collection('chain');
const ChainStates = new Mongo.Collection('chain_states');
Chain.helpers({
  proposer() {
    return Validators.findOne({
      address: this.proposerAddress
    });
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"coin-stats":{"server":{"methods.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/coin-stats/server/methods.js                                                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let CoinStats;
module.link("../coin-stats.js", {
  CoinStats(v) {
    CoinStats = v;
  }

}, 1);
let HTTP;
module.link("meteor/http", {
  HTTP(v) {
    HTTP = v;
  }

}, 2);
Meteor.methods({
  'coinStats.getCoinStats': function () {
    this.unblock();
    let coinId = Meteor.settings.public.coingeckoId;

    if (coinId) {
      try {
        let now = new Date();
        now.setMinutes(0);
        let url = "https://api.coingecko.com/api/v3/simple/price?ids=" + coinId + "&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true&include_last_updated_at=true";
        let response = HTTP.get(url);

        if (response.statusCode == 200) {
          // console.log(JSON.parse(response.content));
          let data = JSON.parse(response.content);
          data = data[coinId]; // console.log(coinStats);

          return CoinStats.upsert({
            last_updated_at: data.last_updated_at
          }, {
            $set: data
          });
        }
      } catch (e) {
        console.log(url);
        console.log(e);
      }
    } else {
      return "No coingecko Id provided.";
    }
  },
  'coinStats.getStats': function () {
    this.unblock();
    let coinId = Meteor.settings.public.coingeckoId;

    if (coinId) {
      return CoinStats.findOne({}, {
        sort: {
          last_updated_at: -1
        }
      });
    } else {
      return "No coingecko Id provided.";
    }
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"coin-stats.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/coin-stats/coin-stats.js                                                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  CoinStats: () => CoinStats
});
let Mongo;
module.link("meteor/mongo", {
  Mongo(v) {
    Mongo = v;
  }

}, 0);
const CoinStats = new Mongo.Collection('coin_stats');
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"delegations":{"server":{"methods.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/delegations/server/methods.js                                                                           //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let Delegations;
module.link("../delegations.js", {
  Delegations(v) {
    Delegations = v;
  }

}, 1);
let Validators;
module.link("../../validators/validators.js", {
  Validators(v) {
    Validators = v;
  }

}, 2);
Meteor.methods({
  'delegations.getDelegations': function () {
    return Promise.asyncApply(() => {
      this.unblock();
      let validators = Validators.find({}).fetch();
      let delegations = [];
      console.log("=== Getting delegations ===");

      for (v in validators) {
        if (validators[v].operator_address) {
          let url = API + '/cosmos/staking/v1beta1/validators/' + validators[v].operatorAddress + "/delegations";

          try {
            let response = HTTP.get(url);

            if (response.statusCode == 200) {
              let delegation = JSON.parse(response.content).result; // console.log(delegation);

              delegations = delegations.concat(delegation);
            } else {
              console.log(response.statusCode);
            }
          } catch (e) {
            // console.log(url);
            console.log(e);
          }
        }
      }

      let data = {
        delegations: delegations,
        createdAt: new Date()
      };
      return Delegations.insert(data);
    });
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"publications.js":function module(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/delegations/server/publications.js                                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"delegations.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/delegations/delegations.js                                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  Delegations: () => Delegations
});
let Mongo;
module.link("meteor/mongo", {
  Mongo(v) {
    Mongo = v;
  }

}, 0);
const Delegations = new Mongo.Collection('delegations');
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"ledger":{"server":{"methods.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/ledger/server/methods.js                                                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _objectSpread;

module.link("@babel/runtime/helpers/objectSpread2", {
  default(v) {
    _objectSpread = v;
  }

}, 0);
let HTTP;
module.link("meteor/http", {
  HTTP(v) {
    HTTP = v;
  }

}, 0);
let Validators;
module.link("../../validators/validators", {
  Validators(v) {
    Validators = v;
  }

}, 1);
Meteor.methods({
  'transaction.submit': function (txInfo) {
    this.unblock();
    const url = "".concat(API, "/txs");
    data = {
      "tx": txInfo.value,
      "mode": "sync"
    };
    const timestamp = new Date().getTime();
    console.log("submitting transaction".concat(timestamp, " ").concat(url, " with data ").concat(JSON.stringify(data)));
    let response = HTTP.post(url, {
      data
    });
    console.log("response for transaction".concat(timestamp, " ").concat(url, ": ").concat(JSON.stringify(response)));

    if (response.statusCode == 200) {
      let data = response.data;
      if (data.code) throw new Meteor.Error(data.code, JSON.parse(data.raw_log).message);
      return response.data.txhash;
    }
  },
  'transaction.execute': function (body, path) {
    this.unblock();
    const url = "".concat(API, "/").concat(path);
    data = {
      "base_req": _objectSpread(_objectSpread({}, body), {}, {
        "chain_id": Meteor.settings.public.chainId,
        "simulate": false
      })
    };
    let response = HTTP.post(url, {
      data
    });

    if (response.statusCode == 200) {
      return JSON.parse(response.content);
    }
  },
  'transaction.simulate': function (txMsg, from, accountNumber, sequence, path) {
    let adjustment = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : '1.2';
    this.unblock();
    const url = "".concat(API, "/").concat(path);
    console.log(txMsg);
    data = _objectSpread(_objectSpread({}, txMsg), {}, {
      "base_req": {
        "from": from,
        "chain_id": Meteor.settings.public.chainId,
        "gas_adjustment": adjustment,
        "account_number": accountNumber,
        "sequence": sequence.toString(),
        "simulate": true
      }
    });
    console.log(url);
    console.log(data);
    let response = HTTP.post(url, {
      data
    });

    if (response.statusCode == 200) {
      return JSON.parse(response.content).gas_estimate;
    }
  },
  'isValidator': function (address) {
    this.unblock();
    let validator = Validators.findOne({
      delegator_address: address
    });
    return validator;
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},"proposals":{"server":{"methods.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/proposals/server/methods.js                                                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _objectSpread;

module.link("@babel/runtime/helpers/objectSpread2", {
  default(v) {
    _objectSpread = v;
  }

}, 0);
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let HTTP;
module.link("meteor/http", {
  HTTP(v) {
    HTTP = v;
  }

}, 1);
let Proposals;
module.link("../proposals.js", {
  Proposals(v) {
    Proposals = v;
  }

}, 2);
let Chain;
module.link("../../chain/chain.js", {
  Chain(v) {
    Chain = v;
  }

}, 3);
let Validators;
module.link("../../validators/validators.js", {
  Validators(v) {
    Validators = v;
  }

}, 4);
Meteor.methods({
  'proposals.getProposals': function () {
    this.unblock(); // get gov tally prarams

    let url = API + '/cosmos/gov/v1beta1/params/tallying';

    try {
      let response = HTTP.get(url);
      let params = JSON.parse(response.content);
      Chain.update({
        chainId: Meteor.settings.public.chainId
      }, {
        $set: {
          "gov.tally_params": params.tally_params
        }
      });
      url = API + '/cosmos/gov/v1beta1/proposals';
      response = HTTP.get(url);
      let proposals = JSON.parse(response.content).proposals; // console.log(proposals);

      let finishedProposalIds = new Set(Proposals.find({
        "status": {
          $in: ["PROPOSAL_STATUS_PASSED", "PROPOSAL_STATUS_REJECTED", "PROPOSAL_STATUS_REMOVED"]
        }
      }).fetch().map(p => p.proposalId));
      let activeProposals = new Set(Proposals.find({
        "status": {
          $in: ["PROPOSAL_STATUS_VOTING_PERIOD"]
        }
      }).fetch().map(p => p.proposalId));
      let proposalIds = [];

      if (proposals.length > 0) {
        // Proposals.upsert()
        const bulkProposals = Proposals.rawCollection().initializeUnorderedBulkOp();

        for (let i in proposals) {
          let proposal = proposals[i];
          proposal.proposalId = parseInt(proposal.proposal_id);
          proposalIds.push(proposal.proposalId);

          if (proposal.proposalId > 0 && !finishedProposalIds.has(proposal.proposalId)) {
            try {
              url = API + '/gov/proposals/' + proposal.proposalId + '/proposer';
              let response = HTTP.get(url);

              if (response.statusCode == 200) {
                var _JSON$parse;

                let proposer = (_JSON$parse = JSON.parse(response === null || response === void 0 ? void 0 : response.content)) === null || _JSON$parse === void 0 ? void 0 : _JSON$parse.result;

                if (proposer.proposal_id && parseInt(proposer.proposal_id) == proposal.proposalId) {
                  proposal.proposer = proposer === null || proposer === void 0 ? void 0 : proposer.proposer;
                }
              }

              if (activeProposals.has(proposal.proposalId)) {
                let validators = [];
                let page = 0;

                do {
                  url = RPC + "/validators?page=".concat(++page, "&per_page=100");
                  let response = HTTP.get(url);
                  result = JSON.parse(response.content).result;
                  validators = [...validators, ...result.validators];
                } while (validators.length < parseInt(result.total));

                let activeVotingPower = 0;

                for (v in validators) {
                  activeVotingPower += parseInt(validators[v].voting_power);
                }

                proposal.activeVotingPower = activeVotingPower;
              }

              bulkProposals.find({
                proposalId: proposal.proposalId
              }).upsert().updateOne({
                $set: proposal
              });
            } catch (e) {
              bulkProposals.find({
                proposalId: proposal.proposalId
              }).upsert().updateOne({
                $set: proposal
              });
              console.log(url);
              console.log(e.response.content);
            }
          }
        }

        bulkProposals.find({
          proposalId: {
            $nin: proposalIds
          },
          status: {
            $nin: ["PROPOSAL_STATUS_VOTING_PERIOD", "PROPOSAL_STATUS_PASSED", "PROPOSAL_STATUS_REJECTED", "PROPOSAL_STATUS_REMOVED"]
          }
        }).update({
          $set: {
            "status": "PROPOSAL_STATUS_REMOVED"
          }
        });
        bulkProposals.execute();
      }

      return true;
    } catch (e) {
      console.log(url);
      console.log(e);
    }
  },
  'proposals.getProposalResults': function () {
    this.unblock();
    let proposals = Proposals.find({
      "status": {
        $nin: ["PROPOSAL_STATUS_PASSED", "PROPOSAL_STATUS_REJECTED", "PROPOSAL_STATUS_REMOVED"]
      }
    }).fetch();

    if (proposals && proposals.length > 0) {
      for (let i in proposals) {
        if (parseInt(proposals[i].proposalId) > 0) {
          let url = "";

          try {
            // get proposal deposits
            url = API + '/cosmos/gov/v1beta1/proposals/' + proposals[i].proposalId + '/deposits?pagination.limit=2000&pagination.count_total=true';
            let response = HTTP.get(url);
            let proposal = {
              proposalId: proposals[i].proposalId
            };

            if (response.statusCode == 200) {
              let deposits = JSON.parse(response.content).deposits;
              proposal.deposits = deposits;
            }

            url = API + '/cosmos/gov/v1beta1/proposals/' + proposals[i].proposalId + '/votes?pagination.limit=2000&pagination.count_total=true';
            response = HTTP.get(url);

            if (response.statusCode == 200) {
              let votes = JSON.parse(response.content).votes;
              proposal.votes = getVoteDetail(votes);
            }

            url = API + '/cosmos/gov/v1beta1/proposals/' + proposals[i].proposalId + '/tally';
            response = HTTP.get(url);

            if (response.statusCode == 200) {
              let tally = JSON.parse(response.content).tally;
              proposal.tally = tally;
            }

            proposal.updatedAt = new Date();
            Proposals.update({
              proposalId: proposals[i].proposalId
            }, {
              $set: proposal
            });
          } catch (e) {
            console.log(url);
            console.log(e);
          }
        }
      }
    }

    return true;
  }
});

const getVoteDetail = votes => {
  if (!votes) {
    return [];
  }

  let voters = votes.map(vote => vote.voter);
  let votingPowerMap = {};
  let validatorAddressMap = {};
  Validators.find({
    delegator_address: {
      $in: voters
    }
  }).forEach(validator => {
    votingPowerMap[validator.delegator_address] = {
      moniker: validator.description.moniker,
      address: validator.address,
      tokens: parseFloat(validator.tokens),
      delegatorShares: parseFloat(validator.delegator_shares),
      deductedShares: parseFloat(validator.delegator_shares)
    };
    validatorAddressMap[validator.operator_address] = validator.delegator_address;
  });
  voters.forEach(voter => {
    if (!votingPowerMap[voter]) {
      // voter is not a validator
      let url = "".concat(API, "/cosmos/staking/v1beta1/delegations/").concat(voter);
      let delegations;
      let votingPower = 0;

      try {
        let response = HTTP.get(url);

        if (response.statusCode == 200) {
          delegations = JSON.parse(response.content).delegation_responses;

          if (delegations && delegations.length > 0) {
            delegations.forEach(delegation => {
              let shares = parseFloat(delegation.delegation.shares);

              if (validatorAddressMap[delegation.delegation.validator_address]) {
                // deduct delegated shareds from validator if a delegator votes
                let validator = votingPowerMap[validatorAddressMap[delegation.delegation.validator_address]];
                validator.deductedShares -= shares;

                if (parseFloat(validator.delegatorShares) != 0) {
                  // avoiding division by zero
                  votingPower += shares / parseFloat(validator.delegatorShares) * parseFloat(validator.tokens);
                }
              } else {
                votingPower += shares;
              }
            });
          }
        }
      } catch (e) {
        console.log(url);
        console.log(e);
      }

      votingPowerMap[voter] = {
        votingPower: votingPower
      };
    }
  });
  return votes.map(vote => {
    let voter = votingPowerMap[vote.voter];
    let votingPower = voter.votingPower;

    if (votingPower == undefined) {
      // voter is a validator
      votingPower = voter.delegatorShares ? parseFloat(voter.deductedShares) / parseFloat(voter.delegatorShares) * parseFloat(voter.tokens) : 0;
    }

    return _objectSpread(_objectSpread({}, vote), {}, {
      votingPower
    });
  });
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"publications.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/proposals/server/publications.js                                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let Proposals;
module.link("../proposals.js", {
  Proposals(v) {
    Proposals = v;
  }

}, 1);
let check;
module.link("meteor/check", {
  check(v) {
    check = v;
  }

}, 2);
Meteor.publish('proposals.list', function () {
  return Proposals.find({}, {
    sort: {
      proposalId: -1
    }
  });
});
Meteor.publish('proposals.one', function (id) {
  check(id, Number);
  return Proposals.find({
    proposalId: id
  });
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"proposals.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/proposals/proposals.js                                                                                  //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  Proposals: () => Proposals
});
let Mongo;
module.link("meteor/mongo", {
  Mongo(v) {
    Mongo = v;
  }

}, 0);
const Proposals = new Mongo.Collection('proposals');
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"records":{"server":{"methods.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/records/server/methods.js                                                                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let Mongo;
module.link("meteor/mongo", {
  Mongo(v) {
    Mongo = v;
  }

}, 1);
let ValidatorRecords, Analytics, AverageData, AverageValidatorData;
module.link("../records.js", {
  ValidatorRecords(v) {
    ValidatorRecords = v;
  },

  Analytics(v) {
    Analytics = v;
  },

  AverageData(v) {
    AverageData = v;
  },

  AverageValidatorData(v) {
    AverageValidatorData = v;
  }

}, 2);
let Validators;
module.link("../../validators/validators.js", {
  Validators(v) {
    Validators = v;
  }

}, 3);
let ValidatorSets;
module.link("/imports/api/validator-sets/validator-sets.js", {
  ValidatorSets(v) {
    ValidatorSets = v;
  }

}, 4);
let Status;
module.link("../../status/status.js", {
  Status(v) {
    Status = v;
  }

}, 5);
let MissedBlocksStats;
module.link("../records.js", {
  MissedBlocksStats(v) {
    MissedBlocksStats = v;
  }

}, 6);
let MissedBlocks;
module.link("../records.js", {
  MissedBlocks(v) {
    MissedBlocks = v;
  }

}, 7);
let Blockscon;
module.link("../../blocks/blocks.js", {
  Blockscon(v) {
    Blockscon = v;
  }

}, 8);
let Chain;
module.link("../../chain/chain.js", {
  Chain(v) {
    Chain = v;
  }

}, 9);

let _;

module.link("lodash", {
  default(v) {
    _ = v;
  }

}, 10);
const BULKUPDATEMAXSIZE = 1000;

const getBlockStats = (startHeight, latestHeight) => {
  let blockStats = {};
  const cond = {
    $and: [{
      height: {
        $gt: startHeight
      }
    }, {
      height: {
        $lte: latestHeight
      }
    }]
  };
  const options = {
    sort: {
      height: 1
    }
  };
  Blockscon.find(cond, options).forEach(block => {
    blockStats[block.height] = {
      height: block.height,
      proposerAddress: block.proposerAddress,
      precommitsCount: block.precommitsCount,
      validatorsCount: block.validatorsCount,
      validators: block.validators,
      time: block.time
    };
  });
  Analytics.find(cond, options).forEach(block => {
    if (!blockStats[block.height]) {
      blockStats[block.height] = {
        height: block.height
      };
      console.log("block ".concat(block.height, " does not have an entry"));
    }

    _.assign(blockStats[block.height], {
      precommits: block.precommits,
      averageBlockTime: block.averageBlockTime,
      timeDiff: block.timeDiff,
      voting_power: block.voting_power
    });
  });
  return blockStats;
};

const getPreviousRecord = (voterAddress, proposerAddress) => {
  let previousRecord = MissedBlocks.findOne({
    voter: voterAddress,
    proposer: proposerAddress,
    blockHeight: -1
  });
  let lastUpdatedHeight = Meteor.settings.params.startHeight;
  let prevStats = {};

  if (previousRecord) {
    prevStats = _.pick(previousRecord, ['missCount', 'totalCount']);
  } else {
    prevStats = {
      missCount: 0,
      totalCount: 0
    };
  }

  return prevStats;
};

Meteor.methods({
  'ValidatorRecords.calculateMissedBlocks': function () {
    this.unblock();

    if (!COUNTMISSEDBLOCKS) {
      try {
        let startTime = Date.now();
        COUNTMISSEDBLOCKS = true;
        console.log('calulate missed blocks count');
        this.unblock();
        let validators = Validators.find({}).fetch();
        let latestHeight = Meteor.call('blocks.getCurrentHeight');
        let explorerStatus = Status.findOne({
          chainId: Meteor.settings.public.chainId
        });
        let startHeight = explorerStatus && explorerStatus.lastProcessedMissedBlockHeight ? explorerStatus.lastProcessedMissedBlockHeight : Meteor.settings.params.startHeight;
        latestHeight = Math.min(startHeight + BULKUPDATEMAXSIZE, latestHeight);
        const bulkMissedStats = MissedBlocks.rawCollection().initializeOrderedBulkOp();
        let validatorsMap = {};
        validators.forEach(validator => validatorsMap[validator.address] = validator); // a map of block height to block stats

        let blockStats = getBlockStats(startHeight, latestHeight); // proposerVoterStats is a proposer-voter map counting numbers of proposed blocks of which voter is an active validator

        let proposerVoterStats = {};

        _.forEach(blockStats, (block, blockHeight) => {
          let proposerAddress = block.proposerAddress;
          let votedValidators = new Set(block.validators);
          let validatorSets = ValidatorSets.findOne({
            block_height: block.height
          });
          let votedVotingPower = 0;
          validatorSets.validators.forEach(activeValidator => {
            if (votedValidators.has(activeValidator.address)) votedVotingPower += parseFloat(activeValidator.voting_power);
          });
          validatorSets.validators.forEach(activeValidator => {
            let currentValidator = activeValidator.address;

            if (!_.has(proposerVoterStats, [proposerAddress, currentValidator])) {
              let prevStats = getPreviousRecord(currentValidator, proposerAddress);

              _.set(proposerVoterStats, [proposerAddress, currentValidator], prevStats);
            }

            _.update(proposerVoterStats, [proposerAddress, currentValidator, 'totalCount'], n => n + 1);

            if (!votedValidators.has(currentValidator)) {
              _.update(proposerVoterStats, [proposerAddress, currentValidator, 'missCount'], n => n + 1);

              bulkMissedStats.insert({
                voter: currentValidator,
                blockHeight: block.height,
                proposer: proposerAddress,
                precommitsCount: block.precommitsCount,
                validatorsCount: block.validatorsCount,
                time: block.time,
                precommits: block.precommits,
                averageBlockTime: block.averageBlockTime,
                timeDiff: block.timeDiff,
                votingPower: block.voting_power,
                votedVotingPower,
                updatedAt: latestHeight,
                missCount: _.get(proposerVoterStats, [proposerAddress, currentValidator, 'missCount']),
                totalCount: _.get(proposerVoterStats, [proposerAddress, currentValidator, 'totalCount'])
              });
            }
          });
        });

        _.forEach(proposerVoterStats, (voters, proposerAddress) => {
          _.forEach(voters, (stats, voterAddress) => {
            bulkMissedStats.find({
              voter: voterAddress,
              proposer: proposerAddress,
              blockHeight: -1
            }).upsert().updateOne({
              $set: {
                voter: voterAddress,
                proposer: proposerAddress,
                blockHeight: -1,
                updatedAt: latestHeight,
                missCount: _.get(stats, 'missCount'),
                totalCount: _.get(stats, 'totalCount')
              }
            });
          });
        });

        let message = '';

        if (bulkMissedStats.length > 0) {
          const client = MissedBlocks._driver.mongo.client; // TODO: add transaction back after replica set(#146) is set up
          // let session = client.startSession();
          // session.startTransaction();

          let bulkPromise = bulkMissedStats.execute(null
          /*, {session}*/
          ).then(Meteor.bindEnvironment((result, err) => {
            if (err) {
              COUNTMISSEDBLOCKS = false; // Promise.await(session.abortTransaction());

              throw err;
            }

            if (result) {
              // Promise.await(session.commitTransaction());
              message = "(".concat(result.result.nInserted, " inserted, ") + "".concat(result.result.nUpserted, " upserted, ") + "".concat(result.result.nModified, " modified)");
            }
          }));
          Promise.await(bulkPromise);
        }

        COUNTMISSEDBLOCKS = false;
        Status.upsert({
          chainId: Meteor.settings.public.chainId
        }, {
          $set: {
            lastProcessedMissedBlockHeight: latestHeight,
            lastProcessedMissedBlockTime: new Date()
          }
        });
        return "done in ".concat(Date.now() - startTime, "ms ").concat(message);
      } catch (e) {
        COUNTMISSEDBLOCKS = false;
        throw e;
      }
    } else {
      return "updating...";
    }
  },
  'ValidatorRecords.calculateMissedBlocksStats': function () {
    this.unblock(); // TODO: deprecate this method and MissedBlocksStats collection
    // console.log("ValidatorRecords.calculateMissedBlocks: "+COUNTMISSEDBLOCKS);

    if (!COUNTMISSEDBLOCKSSTATS) {
      COUNTMISSEDBLOCKSSTATS = true;
      console.log('calulate missed blocks stats');
      this.unblock();
      let validators = Validators.find({}).fetch();
      let latestHeight = Meteor.call('blocks.getCurrentHeight');
      let explorerStatus = Status.findOne({
        chainId: Meteor.settings.public.chainId
      });
      let startHeight = explorerStatus && explorerStatus.lastMissedBlockHeight ? explorerStatus.lastMissedBlockHeight : Meteor.settings.params.startHeight; // console.log(latestHeight);
      // console.log(startHeight);

      const bulkMissedStats = MissedBlocksStats.rawCollection().initializeUnorderedBulkOp();

      for (i in validators) {
        // if ((validators[i].address == "B8552EAC0D123A6BF609123047A5181D45EE90B5") || (validators[i].address == "69D99B2C66043ACBEAA8447525C356AFC6408E0C") || (validators[i].address == "35AD7A2CD2FC71711A675830EC1158082273D457")){
        let voterAddress = validators[i].address;
        let missedRecords = ValidatorRecords.find({
          address: voterAddress,
          exists: false,
          $and: [{
            height: {
              $gt: startHeight
            }
          }, {
            height: {
              $lte: latestHeight
            }
          }]
        }).fetch();
        let counts = {}; // console.log("missedRecords to process: "+missedRecords.length);

        for (b in missedRecords) {
          let block = Blockscon.findOne({
            height: missedRecords[b].height
          });
          let existingRecord = MissedBlocksStats.findOne({
            voter: voterAddress,
            proposer: block.proposerAddress
          });

          if (typeof counts[block.proposerAddress] === 'undefined') {
            if (existingRecord) {
              counts[block.proposerAddress] = existingRecord.count + 1;
            } else {
              counts[block.proposerAddress] = 1;
            }
          } else {
            counts[block.proposerAddress]++;
          }
        }

        for (address in counts) {
          let data = {
            voter: voterAddress,
            proposer: address,
            count: counts[address]
          };
          bulkMissedStats.find({
            voter: voterAddress,
            proposer: address
          }).upsert().updateOne({
            $set: data
          });
        } // }

      }

      if (bulkMissedStats.length > 0) {
        bulkMissedStats.execute(Meteor.bindEnvironment((err, result) => {
          if (err) {
            COUNTMISSEDBLOCKSSTATS = false;
            console.log(err);
          }

          if (result) {
            Status.upsert({
              chainId: Meteor.settings.public.chainId
            }, {
              $set: {
                lastMissedBlockHeight: latestHeight,
                lastMissedBlockTime: new Date()
              }
            });
            COUNTMISSEDBLOCKSSTATS = false;
            console.log("done");
          }
        }));
      } else {
        COUNTMISSEDBLOCKSSTATS = false;
      }

      return true;
    } else {
      return "updating...";
    }
  },
  'Analytics.aggregateBlockTimeAndVotingPower': function (time) {
    this.unblock();
    let now = new Date();

    if (time == 'm') {
      let averageBlockTime = 0;
      let averageVotingPower = 0;
      let analytics = Analytics.find({
        "time": {
          $gt: new Date(Date.now() - 60 * 1000)
        }
      }).fetch();

      if (analytics.length > 0) {
        for (i in analytics) {
          averageBlockTime += analytics[i].timeDiff;
          averageVotingPower += analytics[i].voting_power;
        }

        averageBlockTime = averageBlockTime / analytics.length;
        averageVotingPower = averageVotingPower / analytics.length;
        Chain.update({
          chainId: Meteor.settings.public.chainId
        }, {
          $set: {
            lastMinuteVotingPower: averageVotingPower,
            lastMinuteBlockTime: averageBlockTime
          }
        });
        AverageData.insert({
          averageBlockTime: averageBlockTime,
          averageVotingPower: averageVotingPower,
          type: time,
          createdAt: now
        });
      }
    }

    if (time == 'h') {
      let averageBlockTime = 0;
      let averageVotingPower = 0;
      let analytics = Analytics.find({
        "time": {
          $gt: new Date(Date.now() - 60 * 60 * 1000)
        }
      }).fetch();

      if (analytics.length > 0) {
        for (i in analytics) {
          averageBlockTime += analytics[i].timeDiff;
          averageVotingPower += analytics[i].voting_power;
        }

        averageBlockTime = averageBlockTime / analytics.length;
        averageVotingPower = averageVotingPower / analytics.length;
        Chain.update({
          chainId: Meteor.settings.public.chainId
        }, {
          $set: {
            lastHourVotingPower: averageVotingPower,
            lastHourBlockTime: averageBlockTime
          }
        });
        AverageData.insert({
          averageBlockTime: averageBlockTime,
          averageVotingPower: averageVotingPower,
          type: time,
          createdAt: now
        });
      }
    }

    if (time == 'd') {
      let averageBlockTime = 0;
      let averageVotingPower = 0;
      let analytics = Analytics.find({
        "time": {
          $gt: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      }).fetch();

      if (analytics.length > 0) {
        for (i in analytics) {
          averageBlockTime += analytics[i].timeDiff;
          averageVotingPower += analytics[i].voting_power;
        }

        averageBlockTime = averageBlockTime / analytics.length;
        averageVotingPower = averageVotingPower / analytics.length;
        Chain.update({
          chainId: Meteor.settings.public.chainId
        }, {
          $set: {
            lastDayVotingPower: averageVotingPower,
            lastDayBlockTime: averageBlockTime
          }
        });
        AverageData.insert({
          averageBlockTime: averageBlockTime,
          averageVotingPower: averageVotingPower,
          type: time,
          createdAt: now
        });
      }
    } // return analytics.length;

  },
  'Analytics.aggregateValidatorDailyBlockTime': function () {
    this.unblock();
    let validators = Validators.find({}).fetch();
    let now = new Date();

    for (i in validators) {
      let averageBlockTime = 0;
      let blocks = Blockscon.find({
        proposerAddress: validators[i].address,
        "time": {
          $gt: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      }, {
        fields: {
          height: 1
        }
      }).fetch();

      if (blocks.length > 0) {
        let blockHeights = [];

        for (b in blocks) {
          blockHeights.push(blocks[b].height);
        }

        let analytics = Analytics.find({
          height: {
            $in: blockHeights
          }
        }, {
          fields: {
            height: 1,
            timeDiff: 1
          }
        }).fetch();

        for (a in analytics) {
          averageBlockTime += analytics[a].timeDiff;
        }

        averageBlockTime = averageBlockTime / analytics.length;
      }

      AverageValidatorData.insert({
        proposerAddress: validators[i].address,
        averageBlockTime: averageBlockTime,
        type: 'ValidatorDailyAverageBlockTime',
        createdAt: now
      });
    }

    return true;
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"publications.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/records/server/publications.js                                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let ValidatorRecords, Analytics, MissedBlocks, MissedBlocksStats, VPDistributions;
module.link("../records.js", {
  ValidatorRecords(v) {
    ValidatorRecords = v;
  },

  Analytics(v) {
    Analytics = v;
  },

  MissedBlocks(v) {
    MissedBlocks = v;
  },

  MissedBlocksStats(v) {
    MissedBlocksStats = v;
  },

  VPDistributions(v) {
    VPDistributions = v;
  }

}, 1);
let Validators;
module.link("../../validators/validators.js", {
  Validators(v) {
    Validators = v;
  }

}, 2);
Meteor.publish('validator_records.all', function () {
  return ValidatorRecords.find();
});
Meteor.publish('validator_records.uptime', function (address, num) {
  return ValidatorRecords.find({
    address: address
  }, {
    limit: num,
    sort: {
      height: -1
    }
  });
});
Meteor.publish('analytics.history', function () {
  return Analytics.find({}, {
    sort: {
      height: -1
    },
    limit: 50
  });
});
Meteor.publish('vpDistribution.latest', function () {
  return VPDistributions.find({}, {
    sort: {
      height: -1
    },
    limit: 1
  });
});
publishComposite('missedblocks.validator', function (address, type) {
  let conditions = {};

  if (type == 'voter') {
    conditions = {
      voter: address
    };
  } else {
    conditions = {
      proposer: address
    };
  }

  return {
    find() {
      return MissedBlocksStats.find(conditions);
    },

    children: [{
      find(stats) {
        return Validators.find({}, {
          fields: {
            address: 1,
            description: 1,
            profile_url: 1
          }
        });
      }

    }]
  };
});
publishComposite('missedrecords.validator', function (address, type) {
  return {
    find() {
      return MissedBlocks.find({
        [type]: address
      }, {
        sort: {
          updatedAt: -1
        }
      });
    },

    children: [{
      find() {
        return Validators.find({}, {
          fields: {
            address: 1,
            description: 1,
            operatorAddress: 1
          }
        });
      }

    }]
  };
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"records.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/records/records.js                                                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  ValidatorRecords: () => ValidatorRecords,
  Analytics: () => Analytics,
  MissedBlocksStats: () => MissedBlocksStats,
  MissedBlocks: () => MissedBlocks,
  VPDistributions: () => VPDistributions,
  AverageData: () => AverageData,
  AverageValidatorData: () => AverageValidatorData
});
let Mongo;
module.link("meteor/mongo", {
  Mongo(v) {
    Mongo = v;
  }

}, 0);
let Validators;
module.link("../validators/validators", {
  Validators(v) {
    Validators = v;
  }

}, 1);
const ValidatorRecords = new Mongo.Collection('validator_records');
const Analytics = new Mongo.Collection('analytics');
const MissedBlocksStats = new Mongo.Collection('missed_blocks_stats');
const MissedBlocks = new Mongo.Collection('missed_blocks');
const VPDistributions = new Mongo.Collection('voting_power_distributions');
const AverageData = new Mongo.Collection('average_data');
const AverageValidatorData = new Mongo.Collection('average_validator_data');
MissedBlocksStats.helpers({
  proposerMoniker() {
    let validator = Validators.findOne({
      address: this.proposer
    });
    return validator.description ? validator.description.moniker : this.proposer;
  },

  voterMoniker() {
    let validator = Validators.findOne({
      address: this.voter
    });
    return validator.description ? validator.description.moniker : this.voter;
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"status":{"server":{"publications.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/status/server/publications.js                                                                           //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let Status;
module.link("../status.js", {
  Status(v) {
    Status = v;
  }

}, 1);
let check;
module.link("meteor/check", {
  check(v) {
    check = v;
  }

}, 2);
Meteor.publish('status.status', function () {
  return Status.find({
    chainId: Meteor.settings.public.chainId
  });
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"status.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/status/status.js                                                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  Status: () => Status
});
let Mongo;
module.link("meteor/mongo", {
  Mongo(v) {
    Mongo = v;
  }

}, 0);
const Status = new Mongo.Collection('status');
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"transactions":{"server":{"methods.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/transactions/server/methods.js                                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let HTTP;
module.link("meteor/http", {
  HTTP(v) {
    HTTP = v;
  }

}, 1);
let Transactions;
module.link("../../transactions/transactions.js", {
  Transactions(v) {
    Transactions = v;
  }

}, 2);
let Validators;
module.link("../../validators/validators.js", {
  Validators(v) {
    Validators = v;
  }

}, 3);
const AddressLength = 40;
Meteor.methods({
  'Transactions.updateTransactions': function () {
    return Promise.asyncApply(() => {
      this.unblock();
      if (TXSYNCING) return "Syncing transactions...";
      const transactions = Transactions.find({
        processed: false
      }, {
        limit: 500
      }).fetch();

      try {
        TXSYNCING = true;
        const bulkTransactions = Transactions.rawCollection().initializeUnorderedBulkOp();

        for (let i in transactions) {
          let url = "";

          try {
            url = API + '/cosmos/tx/v1beta1/txs/' + transactions[i].txhash;
            let response = HTTP.get(url);
            let tx = JSON.parse(response.content);
            tx.height = parseInt(tx.tx_response.height);
            tx.processed = true;
            bulkTransactions.find({
              txhash: transactions[i].txhash
            }).updateOne({
              $set: tx
            });
          } catch (e) {
            // console.log(url);
            // console.log("tx not found: %o")
            console.log("Getting transaction %o: %o", transactions[i].txhash, e);
            bulkTransactions.find({
              txhash: transactions[i].txhash
            }).updateOne({
              $set: {
                processed: true,
                missing: true
              }
            });
          }
        }

        if (bulkTransactions.length > 0) {
          console.log("aaa: %o", bulkTransactions.length);
          bulkTransactions.execute((err, result) => {
            if (err) {
              console.log(err);
            }

            if (result) {
              console.log(result);
            }
          });
        }
      } catch (e) {
        TXSYNCING = false;
        return e;
      }

      TXSYNCING = false;
      return transactions.length;
    });
  },
  'Transactions.findDelegation': function (address, height) {
    this.unblock(); // following cosmos-sdk/x/slashing/spec/06_events.md and cosmos-sdk/x/staking/spec/06_events.md

    return Transactions.find({
      $or: [{
        $and: [{
          "tx_response.logs.events.type": "delegate"
        }, {
          "tx_response.logs.events.attributes.key": "validator"
        }, {
          "tx_response.logs.events.attributes.value": address
        }]
      }, {
        $and: [{
          "tx_response.logs.events.attributes.key": "action"
        }, {
          "tx_response.logs.events.attributes.value": "unjail"
        }, {
          "tx_response.logs.events.attributes.key": "sender"
        }, {
          "tx_response.logs.events.attributes.value": address
        }]
      }, {
        $and: [{
          "tx_response.logs.events.type": "create_validator"
        }, {
          "tx_response.logs.events.attributes.key": "validator"
        }, {
          "tx_response.logs.events.attributes.value": address
        }]
      }, {
        $and: [{
          "tx_response.logs.events.type": "unbond"
        }, {
          "tx_response.logs.events.attributes.key": "validator"
        }, {
          "tx_response.logs.events.attributes.value": address
        }]
      }, {
        $and: [{
          "tx_response.logs.events.type": "redelegate"
        }, {
          "tx_response.logs.events.attributes.key": "destination_validator"
        }, {
          "tx_response.logs.events.attributes.value": address
        }]
      }],
      "tx_response.code": 0,
      height: {
        $lt: height
      }
    }, {
      sort: {
        height: -1
      },
      limit: 1
    }).fetch();
  },
  'Transactions.findUser': function (address) {
    let fields = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
    this.unblock(); // address is either delegator address or validator operator address

    let validator;
    if (!fields) fields = {
      address: 1,
      description: 1,
      operator_address: 1,
      delegator_address: 1
    };

    if (address.includes(Meteor.settings.public.bech32PrefixValAddr)) {
      // validator operator address
      validator = Validators.findOne({
        operator_address: address
      }, {
        fields
      });
    } else if (address.includes(Meteor.settings.public.bech32PrefixAccAddr)) {
      // delegator address
      validator = Validators.findOne({
        delegator_address: address
      }, {
        fields
      });
    } else if (address.length === AddressLength) {
      validator = Validators.findOne({
        address: address
      }, {
        fields
      });
    }

    if (validator) {
      return validator;
    }

    return false;
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"publications.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/transactions/server/publications.js                                                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let Transactions;
module.link("../transactions.js", {
  Transactions(v) {
    Transactions = v;
  }

}, 1);
let Blockscon;
module.link("../../blocks/blocks.js", {
  Blockscon(v) {
    Blockscon = v;
  }

}, 2);
publishComposite('transactions.list', function () {
  let limit = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 30;
  return {
    find() {
      return Transactions.find({
        height: {
          $exists: true
        },
        processed: {
          $ne: false
        }
      }, {
        sort: {
          height: -1
        },
        limit: limit
      });
    },

    children: [{
      find(tx) {
        if (tx.height) return Blockscon.find({
          height: tx.height
        }, {
          fields: {
            time: 1,
            height: 1
          }
        });
      }

    }]
  };
});
publishComposite('transactions.validator', function (validatorAddress, delegatorAddress) {
  let limit = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 100;
  let query = {};

  if (validatorAddress && delegatorAddress) {
    query = {
      $or: [{
        "tx_response.logs.events.attributes.value": validatorAddress
      }, {
        "tx_response.logs.events.attributes.value": delegatorAddress
      }]
    };
  }

  if (!validatorAddress && delegatorAddress) {
    query = {
      "tx_response.logs.events.attributes.value": delegatorAddress
    };
  }

  return {
    find() {
      return Transactions.find(query, {
        sort: {
          height: -1
        },
        limit: limit
      });
    },

    children: [{
      find(tx) {
        return Blockscon.find({
          height: tx.height
        }, {
          fields: {
            time: 1,
            height: 1
          }
        });
      }

    }]
  };
});
publishComposite('transactions.findOne', function (hash) {
  return {
    find() {
      return Transactions.find({
        txhash: hash
      });
    },

    children: [{
      find(tx) {
        return Blockscon.find({
          height: tx.height
        }, {
          fields: {
            time: 1,
            height: 1
          }
        });
      }

    }]
  };
});
publishComposite('transactions.height', function (height) {
  return {
    find() {
      return Transactions.find({
        height: height
      });
    },

    children: [{
      find(tx) {
        return Blockscon.find({
          height: tx.height
        }, {
          fields: {
            time: 1,
            height: 1
          }
        });
      }

    }]
  };
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"transactions.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/transactions/transactions.js                                                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  Transactions: () => Transactions
});
let Mongo;
module.link("meteor/mongo", {
  Mongo(v) {
    Mongo = v;
  }

}, 0);
let Blockscon;
module.link("../blocks/blocks.js", {
  Blockscon(v) {
    Blockscon = v;
  }

}, 1);
let TxIcon;
module.link("../../ui/components/Icons.jsx", {
  TxIcon(v) {
    TxIcon = v;
  }

}, 2);
const Transactions = new Mongo.Collection('transactions');
Transactions.helpers({
  block() {
    return Blockscon.findOne({
      height: this.height
    });
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"validators":{"server":{"methods.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/validators/server/methods.js                                                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let Transactions;
module.link("../../transactions/transactions.js", {
  Transactions(v) {
    Transactions = v;
  }

}, 1);
let Blockscon;
module.link("../../blocks/blocks.js", {
  Blockscon(v) {
    Blockscon = v;
  }

}, 2);
let Validators;
module.link("../../validators/validators.js", {
  Validators(v) {
    Validators = v;
  }

}, 3);
let Chain;
module.link("../../chain/chain.js", {
  Chain(v) {
    Chain = v;
  }

}, 4);
let getValidatorProfileUrl;
module.link("../../blocks/server/methods.js", {
  getValidatorProfileUrl(v) {
    getValidatorProfileUrl = v;
  }

}, 5);
Meteor.methods({
  'Validators.findCreateValidatorTime': function (address) {
    this.unblock(); // look up the create validator time to consider if the validator has never updated the commission

    let tx = Transactions.findOne({
      $and: [{
        "tx.body.messages.delegator_address": address
      }, {
        "tx.body.messages.@type": "/cosmos.staking.v1beta1.MsgCreateValidator"
      }, {
        "tx_response.code": 0
      }]
    });

    if (tx) {
      let block = Blockscon.findOne({
        height: tx.height
      });

      if (block) {
        return block.time;
      }
    } else {
      // no such create validator tx
      return false;
    }
  },

  'Validators.getAllDelegations'(address) {
    this.unblock();
    let url = "".concat(API, "/cosmos/staking/v1beta1/validators/").concat(address, "/delegations?pagination.limit=10&pagination.count_total=true");

    try {
      let delegations = HTTP.get(url);

      if (delegations.statusCode == 200) {
        var _JSON$parse, _JSON$parse$paginatio;

        let delegationsCount = (_JSON$parse = JSON.parse(delegations.content)) === null || _JSON$parse === void 0 ? void 0 : (_JSON$parse$paginatio = _JSON$parse.pagination) === null || _JSON$parse$paginatio === void 0 ? void 0 : _JSON$parse$paginatio.total;
        return delegationsCount;
      }

      ;
    } catch (e) {
      console.log(url);
      console.log("Getting error: %o when getting delegations count from %o", e, url);
    }
  },

  'Validators.fetchKeybase'(address) {
    var _Date$parse;

    this.unblock(); // fetching keybase every base on keybaseFetchingInterval settings
    // default to every 5 hours 

    let url = RPC + '/status';
    let chainId;

    try {
      var _status$result, _status$result$node_i;

      let response = HTTP.get(url);
      let status = JSON.parse(response === null || response === void 0 ? void 0 : response.content);
      chainId = status === null || status === void 0 ? void 0 : (_status$result = status.result) === null || _status$result === void 0 ? void 0 : (_status$result$node_i = _status$result.node_info) === null || _status$result$node_i === void 0 ? void 0 : _status$result$node_i.network;
    } catch (e) {
      console.log("Error getting chainId for keybase fetching");
    }

    let chainStatus = Chain.findOne({
      chainId
    });
    const bulkValidators = Validators.rawCollection().initializeUnorderedBulkOp();
    let lastKeybaseFetchTime = (_Date$parse = Date.parse(chainStatus === null || chainStatus === void 0 ? void 0 : chainStatus.lastKeybaseFetchTime)) !== null && _Date$parse !== void 0 ? _Date$parse : 0;
    console.log("Last fetch time: %o", lastKeybaseFetchTime);
    console.log('Fetching keybase...'); // eslint-disable-next-line no-loop-func

    Validators.find({}).forEach(validator => Promise.asyncApply(() => {
      try {
        var _validator$descriptio;

        if (validator !== null && validator !== void 0 && validator.description && validator !== null && validator !== void 0 && (_validator$descriptio = validator.description) !== null && _validator$descriptio !== void 0 && _validator$descriptio.identity) {
          var _validator$descriptio2;

          let profileUrl = getValidatorProfileUrl(validator === null || validator === void 0 ? void 0 : (_validator$descriptio2 = validator.description) === null || _validator$descriptio2 === void 0 ? void 0 : _validator$descriptio2.identity);

          if (profileUrl) {
            bulkValidators.find({
              address: validator === null || validator === void 0 ? void 0 : validator.address
            }).upsert().updateOne({
              $set: {
                'profile_url': profileUrl
              }
            });

            if (bulkValidators.length > 0) {
              bulkValidators.execute((err, result) => {
                if (err) {
                  console.log("Error when updating validator profile_url ".concat(err));
                }

                if (result) {
                  console.log('Validator profile_url has been updated!');
                }
              });
            }
          }
        }
      } catch (e) {
        console.log("Error fetching Keybase for %o: %o", validator === null || validator === void 0 ? void 0 : validator.address, e);
      }
    }));

    try {
      Chain.update({
        chainId
      }, {
        $set: {
          lastKeybaseFetchTime: new Date().toUTCString()
        }
      });
    } catch (e) {
      console.log("Error when updating lastKeybaseFetchTime");
    }
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"publications.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/validators/server/publications.js                                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let Validators;
module.link("../validators.js", {
  Validators(v) {
    Validators = v;
  }

}, 1);
let ValidatorRecords;
module.link("../../records/records.js", {
  ValidatorRecords(v) {
    ValidatorRecords = v;
  }

}, 2);
let VotingPowerHistory;
module.link("../../voting-power/history.js", {
  VotingPowerHistory(v) {
    VotingPowerHistory = v;
  }

}, 3);
Meteor.publish('validators.all', function () {
  let sort = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "description.moniker";
  let direction = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : -1;
  let fields = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  return Validators.find({}, {
    sort: {
      [sort]: direction
    },
    fields: fields
  });
});
publishComposite('validators.firstSeen', {
  find() {
    return Validators.find({});
  },

  children: [{
    find(val) {
      return ValidatorRecords.find({
        address: val.address
      }, {
        sort: {
          height: 1
        },
        limit: 1
      });
    }

  }]
});
Meteor.publish('validators.voting_power', function () {
  return Validators.find({
    status: 'BOND_STATUS_BONDED',
    jailed: false
  }, {
    sort: {
      voting_power: -1
    },
    fields: {
      address: 1,
      description: 1,
      voting_power: 1,
      profile_url: 1
    }
  });
});
publishComposite('validator.details', function (address) {
  let options = {
    address: address
  };

  if (address.indexOf(Meteor.settings.public.bech32PrefixValAddr) != -1) {
    options = {
      operator_address: address
    };
  }

  return {
    find() {
      return Validators.find(options);
    },

    children: [{
      find(val) {
        return VotingPowerHistory.find({
          address: val.address
        }, {
          sort: {
            height: -1
          },
          limit: 50
        });
      }

    }, {
      find(val) {
        return ValidatorRecords.find({
          address: val.address
        }, {
          sort: {
            height: -1
          },
          limit: Meteor.settings.public.uptimeWindow
        });
      }

    }]
  };
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"validators.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/validators/validators.js                                                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  Validators: () => Validators
});
let Mongo;
module.link("meteor/mongo", {
  Mongo(v) {
    Mongo = v;
  }

}, 0);
let ValidatorRecords;
module.link("../records/records.js", {
  ValidatorRecords(v) {
    ValidatorRecords = v;
  }

}, 1);
let VotingPowerHistory;
module.link("../voting-power/history.js", {
  VotingPowerHistory(v) {
    VotingPowerHistory = v;
  }

}, 2);
const Validators = new Mongo.Collection('validators');
Validators.helpers({
  firstSeen() {
    return ValidatorRecords.findOne({
      address: this.address
    });
  },

  history() {
    return VotingPowerHistory.find({
      address: this.address
    }, {
      sort: {
        height: -1
      },
      limit: 50
    }).fetch();
  }

}); // Validators.helpers({
//     uptime(){
//         // console.log(this.address);
//         let lastHundred = ValidatorRecords.find({address:this.address}, {sort:{height:-1}, limit:100}).fetch();
//         console.log(lastHundred);
//         let uptime = 0;
//         for (i in lastHundred){
//             if (lastHundred[i].exists){
//                 uptime+=1;
//             }
//         }
//         return uptime;
//     }
// })
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"voting-power":{"server":{"publications.js":function module(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/voting-power/server/publications.js                                                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"history.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/voting-power/history.js                                                                                 //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  VotingPowerHistory: () => VotingPowerHistory
});
let Mongo;
module.link("meteor/mongo", {
  Mongo(v) {
    Mongo = v;
  }

}, 0);
const VotingPowerHistory = new Mongo.Collection('voting_power_history');
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"evidences":{"evidences.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/evidences/evidences.js                                                                                  //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  Evidences: () => Evidences
});
let Mongo;
module.link("meteor/mongo", {
  Mongo(v) {
    Mongo = v;
  }

}, 0);
const Evidences = new Mongo.Collection('evidences');
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"validator-sets":{"validator-sets.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/validator-sets/validator-sets.js                                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  ValidatorSets: () => ValidatorSets
});
let Mongo;
module.link("meteor/mongo", {
  Mongo(v) {
    Mongo = v;
  }

}, 0);
const ValidatorSets = new Mongo.Collection('validator_sets');
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},"startup":{"both":{"index.js":function module(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/startup/both/index.js                                                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
// Import modules used by both client and server through a single index entry point
// e.g. useraccounts configuration file.
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"server":{"create-indexes.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/startup/server/create-indexes.js                                                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let Blockscon;
module.link("../../api/blocks/blocks.js", {
  Blockscon(v) {
    Blockscon = v;
  }

}, 0);
let Proposals;
module.link("../../api/proposals/proposals.js", {
  Proposals(v) {
    Proposals = v;
  }

}, 1);
let ValidatorRecords, Analytics, MissedBlocksStats, MissedBlocks, AverageData, AverageValidatorData;
module.link("../../api/records/records.js", {
  ValidatorRecords(v) {
    ValidatorRecords = v;
  },

  Analytics(v) {
    Analytics = v;
  },

  MissedBlocksStats(v) {
    MissedBlocksStats = v;
  },

  MissedBlocks(v) {
    MissedBlocks = v;
  },

  AverageData(v) {
    AverageData = v;
  },

  AverageValidatorData(v) {
    AverageValidatorData = v;
  }

}, 2);
let Transactions;
module.link("../../api/transactions/transactions.js", {
  Transactions(v) {
    Transactions = v;
  }

}, 3);
let ValidatorSets;
module.link("../../api/validator-sets/validator-sets.js", {
  ValidatorSets(v) {
    ValidatorSets = v;
  }

}, 4);
let Validators;
module.link("../../api/validators/validators.js", {
  Validators(v) {
    Validators = v;
  }

}, 5);
let VotingPowerHistory;
module.link("../../api/voting-power/history.js", {
  VotingPowerHistory(v) {
    VotingPowerHistory = v;
  }

}, 6);
let Evidences;
module.link("../../api/evidences/evidences.js", {
  Evidences(v) {
    Evidences = v;
  }

}, 7);
let CoinStats;
module.link("../../api/coin-stats/coin-stats.js", {
  CoinStats(v) {
    CoinStats = v;
  }

}, 8);
let ChainStates;
module.link("../../api/chain/chain.js", {
  ChainStates(v) {
    ChainStates = v;
  }

}, 9);
ChainStates.rawCollection().createIndex({
  height: -1
}, {
  unique: true
});
Blockscon.rawCollection().createIndex({
  height: -1
}, {
  unique: true
});
Blockscon.rawCollection().createIndex({
  proposerAddress: 1
});
Evidences.rawCollection().createIndex({
  height: -1
});
Proposals.rawCollection().createIndex({
  proposalId: 1
}, {
  unique: true
});
ValidatorRecords.rawCollection().createIndex({
  address: 1,
  height: -1
}, {
  unique: 1
});
ValidatorRecords.rawCollection().createIndex({
  address: 1,
  exists: 1,
  height: -1
});
Analytics.rawCollection().createIndex({
  height: -1
}, {
  unique: true
});
MissedBlocks.rawCollection().createIndex({
  proposer: 1,
  voter: 1,
  updatedAt: -1
});
MissedBlocks.rawCollection().createIndex({
  proposer: 1,
  blockHeight: -1
});
MissedBlocks.rawCollection().createIndex({
  voter: 1,
  blockHeight: -1
});
MissedBlocks.rawCollection().createIndex({
  voter: 1,
  proposer: 1,
  blockHeight: -1
}, {
  unique: true
});
MissedBlocksStats.rawCollection().createIndex({
  proposer: 1
});
MissedBlocksStats.rawCollection().createIndex({
  voter: 1
});
MissedBlocksStats.rawCollection().createIndex({
  proposer: 1,
  voter: 1
}, {
  unique: true
});
AverageData.rawCollection().createIndex({
  type: 1,
  createdAt: -1
}, {
  unique: true
});
AverageValidatorData.rawCollection().createIndex({
  proposerAddress: 1,
  createdAt: -1
}, {
  unique: true
}); // Status.rawCollection.createIndex({})

Transactions.rawCollection().createIndex({
  txhash: 1
}, {
  unique: true
});
Transactions.rawCollection().createIndex({
  height: -1
});
Transactions.rawCollection().createIndex({
  processed: 1
}); // Transactions.rawCollection().createIndex({action:1});

Transactions.rawCollection().createIndex({
  "tx_response.logs.events.attributes.key": 1
});
Transactions.rawCollection().createIndex({
  "tx_response.logs.events.attributes.value": 1
});
Transactions.rawCollection().createIndex({
  "tx.body.messages.delegator_address": 1,
  "tx.body.messages.@type": 1,
  "tx_response.code": 1
}, {
  partialFilterExpression: {
    "tx_response.code": {
      $exists: true
    }
  }
});
ValidatorSets.rawCollection().createIndex({
  block_height: -1
});
Validators.rawCollection().createIndex({
  address: 1
}, {
  unique: true,
  partialFilterExpression: {
    address: {
      $exists: true
    }
  }
}); // Validators.rawCollection().createIndex({consensusPubkey:1},{unique:true});

Validators.rawCollection().createIndex({
  "consensusPubkey.value": 1
}, {
  unique: true,
  partialFilterExpression: {
    "consensusPubkey.value": {
      $exists: true
    }
  }
});
VotingPowerHistory.rawCollection().createIndex({
  address: 1,
  height: -1
});
VotingPowerHistory.rawCollection().createIndex({
  type: 1
});
CoinStats.rawCollection().createIndex({
  last_updated_at: -1
}, {
  unique: true
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/startup/server/index.js                                                                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.link("./util.js");
module.link("./register-api.js");
module.link("./create-indexes.js");
let onPageLoad;
module.link("meteor/server-render", {
  onPageLoad(v) {
    onPageLoad = v;
  }

}, 0);
let Helmet;
module.link("react-helmet", {
  Helmet(v) {
    Helmet = v;
  }

}, 1);
// import App from '../../ui/App.jsx';
onPageLoad(sink => {
  // const context = {};
  // const sheet = new ServerStyleSheet()
  // const html = renderToString(sheet.collectStyles(
  //     <StaticRouter location={sink.request.url} context={context}>
  //         <App />
  //     </StaticRouter>
  //   ));
  // sink.renderIntoElementById('app', html);
  const helmet = Helmet.renderStatic();
  sink.appendToHead(helmet.meta.toString());
  sink.appendToHead(helmet.title.toString()); // sink.appendToHead(sheet.getStyleTags());
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"register-api.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/startup/server/register-api.js                                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.link("../../api/ledger/server/methods.js");
module.link("../../api/chain/server/methods.js");
module.link("../../api/chain/server/publications.js");
module.link("../../api/blocks/server/methods.js");
module.link("../../api/blocks/server/publications.js");
module.link("../../api/validators/server/methods.js");
module.link("../../api/validators/server/publications.js");
module.link("../../api/records/server/methods.js");
module.link("../../api/records/server/publications.js");
module.link("../../api/proposals/server/methods.js");
module.link("../../api/proposals/server/publications.js");
module.link("../../api/voting-power/server/publications.js");
module.link("../../api/transactions/server/methods.js");
module.link("../../api/transactions/server/publications.js");
module.link("../../api/delegations/server/methods.js");
module.link("../../api/delegations/server/publications.js");
module.link("../../api/status/server/publications.js");
module.link("../../api/accounts/server/methods.js");
module.link("../../api/coin-stats/server/methods.js");
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"util.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/startup/server/util.js                                                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let bech32;
module.link("bech32", {
  default(v) {
    bech32 = v;
  }

}, 0);
let HTTP;
module.link("meteor/http", {
  HTTP(v) {
    HTTP = v;
  }

}, 1);
let cheerio;
module.link("cheerio", {
  "*"(v) {
    cheerio = v;
  }

}, 2);
let tmhash;
module.link("tendermint/lib/hash", {
  tmhash(v) {
    tmhash = v;
  }

}, 3);
Meteor.methods({
  hexToBech32: function (address, prefix) {
    let addressBuffer = Buffer.from(address, 'hex'); // let buffer = Buffer.alloc(37)
    // addressBuffer.copy(buffer);

    return bech32.encode(prefix, bech32.toWords(addressBuffer));
  },
  pubkeyToBech32Old: function (pubkey, prefix) {
    let buffer;

    try {
      if (pubkey.type.indexOf("Ed25519") > 0) {
        // '1624DE6420' is ed25519 pubkey prefix
        let pubkeyAminoPrefix = Buffer.from('1624DE6420', 'hex');
        buffer = Buffer.alloc(37);
        pubkeyAminoPrefix.copy(buffer, 0);
        Buffer.from(pubkey.value, 'base64').copy(buffer, pubkeyAminoPrefix.length);
      } else if (pubkey.type.indexOf("Secp256k1") > 0) {
        // 'EB5AE98721' is secp256k1 pubkey prefix
        let pubkeyAminoPrefix = Buffer.from('EB5AE98721', 'hex');
        buffer = Buffer.alloc(38);
        pubkeyAminoPrefix.copy(buffer, 0);
        Buffer.from(pubkey.value, 'base64').copy(buffer, pubkeyAminoPrefix.length);
      } else {
        console.log("Pubkey type not supported.");
        return false;
      }

      return bech32.encode(prefix, bech32.toWords(buffer));
    } catch (e) {
      console.log("Error converting from pubkey to bech32: %o\n %o", pubkey, e);
      return false;
    }
  },
  pubkeyToBech32: function (pubkey, prefix) {
    let buffer;

    try {
      if (pubkey["@type"].indexOf("ed25519") > 0) {
        // '1624DE6420' is ed25519 pubkey prefix
        let pubkeyAminoPrefix = Buffer.from('1624DE6420', 'hex');
        buffer = Buffer.alloc(37);
        pubkeyAminoPrefix.copy(buffer, 0);
        Buffer.from(pubkey.key, 'base64').copy(buffer, pubkeyAminoPrefix.length);
      } else if (pubkey["@type"].indexOf("secp256k1") > 0) {
        // 'EB5AE98721' is secp256k1 pubkey prefix
        let pubkeyAminoPrefix = Buffer.from('EB5AE98721', 'hex');
        buffer = Buffer.alloc(38);
        pubkeyAminoPrefix.copy(buffer, 0);
        Buffer.from(pubkey.key, 'base64').copy(buffer, pubkeyAminoPrefix.length);
      } else {
        console.log("Pubkey type not supported.");
        return false;
      }

      return bech32.encode(prefix, bech32.toWords(buffer));
    } catch (e) {
      console.log("Error converting from pubkey to bech32: %o\n %o", pubkey, e);
      return false;
    }
  },
  bech32ToPubkey: function (pubkey, type) {
    // type can only be either 'tendermint/PubKeySecp256k1' or 'tendermint/PubKeyEd25519'
    let pubkeyAminoPrefix, buffer;

    try {
      if (type.indexOf("ed25519") > 0) {
        // '1624DE6420' is ed25519 pubkey prefix
        pubkeyAminoPrefix = Buffer.from('1624DE6420', 'hex');
        buffer = Buffer.from(bech32.fromWords(bech32.decode(pubkey).words));
      } else if (type.indexOf("secp256k1") > 0) {
        // 'EB5AE98721' is secp256k1 pubkey prefix
        pubkeyAminoPrefix = Buffer.from('EB5AE98721', 'hex');
        buffer = Buffer.from(bech32.fromWords(bech32.decode(pubkey).words));
      } else {
        console.log("Pubkey type not supported.");
        return false;
      }

      return buffer.slice(pubkeyAminoPrefix.length).toString('base64');
    } catch (e) {
      console.log("Error converting from bech32 to pubkey: %o\n %o", pubkey, e);
      return false;
    }
  },
  getAddressFromPubkey: function (pubkey) {
    var bytes = Buffer.from(pubkey.key, 'base64');
    return tmhash(bytes).slice(0, 20).toString('hex').toUpperCase();
  },
  getDelegator: function (operatorAddr) {
    let address = bech32.decode(operatorAddr);
    return bech32.encode(Meteor.settings.public.bech32PrefixAccAddr, address.words);
  },
  getKeybaseTeamPic: function (keybaseUrl) {
    let teamPage = HTTP.get(keybaseUrl);

    if (teamPage.statusCode == 200) {
      let page = cheerio.load(teamPage.content);
      return page(".kb-main-card img").attr('src');
    }
  },
  getVersion: function () {
    const version = Assets.getText('version');
    return version ? version : 'beta';
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},"ui":{"components":{"Icons.jsx":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/ui/components/Icons.jsx                                                                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  DenomSymbol: () => DenomSymbol,
  ProposalStatusIcon: () => ProposalStatusIcon,
  VoteIcon: () => VoteIcon,
  TxIcon: () => TxIcon,
  InfoIcon: () => InfoIcon
});
let React;
module.link("react", {
  default(v) {
    React = v;
  }

}, 0);
let UncontrolledTooltip;
module.link("reactstrap", {
  UncontrolledTooltip(v) {
    UncontrolledTooltip = v;
  }

}, 1);

const DenomSymbol = props => {
  switch (props.denom) {
    case "steak":
      return '🥩';

    default:
      return '🍅';
  }
};

const ProposalStatusIcon = props => {
  switch (props.status) {
    case 'PROPOSAL_STATUS_PASSED':
      return /*#__PURE__*/React.createElement("i", {
        className: "fas fa-check-circle text-success"
      });

    case 'PROPOSAL_STATUS_REJECTED':
      return /*#__PURE__*/React.createElement("i", {
        className: "fas fa-times-circle text-danger"
      });

    case 'PROPOSAL_STATUS_REMOVED':
      return /*#__PURE__*/React.createElement("i", {
        className: "fas fa-trash-alt text-dark"
      });

    case 'PROPOSAL_STATUS_DEPOSIT_PERIOD':
      return /*#__PURE__*/React.createElement("i", {
        className: "fas fa-battery-half text-warning"
      });

    case 'PROPOSAL_STATUS_VOTING_PERIOD':
      return /*#__PURE__*/React.createElement("i", {
        className: "fas fa-hand-paper text-info"
      });

    default:
      return /*#__PURE__*/React.createElement("i", null);
  }
};

const VoteIcon = props => {
  switch (props.vote) {
    case 'yes':
      return /*#__PURE__*/React.createElement("i", {
        className: "fas fa-check text-success"
      });

    case 'no':
      return /*#__PURE__*/React.createElement("i", {
        className: "fas fa-times text-danger"
      });

    case 'abstain':
      return /*#__PURE__*/React.createElement("i", {
        className: "fas fa-user-slash text-warning"
      });

    case 'no_with_veto':
      return /*#__PURE__*/React.createElement("i", {
        className: "fas fa-exclamation-triangle text-info"
      });

    default:
      return /*#__PURE__*/React.createElement("i", null);
  }
};

const TxIcon = props => {
  if (props.valid) {
    return /*#__PURE__*/React.createElement("span", {
      className: "text-success text-nowrap"
    }, /*#__PURE__*/React.createElement("i", {
      className: "fas fa-check-circle"
    }));
  } else {
    return /*#__PURE__*/React.createElement("span", {
      className: "text-danger text-nowrap"
    }, /*#__PURE__*/React.createElement("i", {
      className: "fas fa-times-circle"
    }));
  }
};

class InfoIcon extends React.Component {
  constructor(props) {
    super(props);
    this.ref = /*#__PURE__*/React.createRef();
  }

  render() {
    return [/*#__PURE__*/React.createElement("i", {
      key: "icon",
      className: "material-icons info-icon",
      ref: this.ref
    }, "info"), /*#__PURE__*/React.createElement(UncontrolledTooltip, {
      key: "tooltip",
      placement: "right",
      target: this.ref
    }, this.props.children ? this.props.children : this.props.tooltipText)];
  }

}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}},"both":{"i18n":{"en-us.i18n.yml.js":function module(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// both/i18n/en-us.i18n.yml.js                                                                                         //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Package['universe:i18n'].i18n.addTranslations('en-US','',{"common":{"height":"Height","voter":"Voter","votingPower":"Voting Power","addresses":"Addresses","amounts":"Amounts","delegators":"delegators","block":"block","blocks":"blocks","precommit":"precommit","precommits":"precommits","last":"last","backToList":"Back to List","information":"Information","time":"Time","hash":"Hash","more":"More","fullStop":".","searchPlaceholder":"Search with tx hash / block height / address","cancel":"Cancel","retry":"Retry","rewards":"Rewards","bondedTokens":"Bonded Tokens","totalNumOfDelegations":"Total Number of Delegations","signIn":"Sign In","generatingAddresses":"Generating addresses","selectAddress":"Select address to log in with from the list below:","defaultAddressMessage":"Your default address is account 0.","back":"Back","next":"Next","txOutOfGasMessage":"Unable to broadcast the transaction due to insufficient balance. Ensure you have enough funds available on your account to cover the transaction fees.","estimatedGasPrice":"Estimated gas price is <b>{$gasPrice}</b>.","chainID":"Chain ID","clientID":"Client ID","sourceChannel":"Source Channel","destinationChannel":"Destination Channel","proofCommitment":"Proof Commitment","connectionID":"Connection ID","proof":"Proof","counterpartyClientID":"Counterparty Client ID","counterpartyConnectionID":"Counterparty Connection ID","acknowledgement":"Acknowledgement","proofAcknowledgement":"Proof Acknowledgement","token":"Token","proofUpgradeClient":"Proof Upgrade Client","proofUpgradeConsensusState":"Proof Upgrade Consensus State","misbehaviour":"Misbehaviour","data":"Data","portID":"Port ID","channelID":"Channel ID","counterpartyChannelID":"Counterparty Channel ID","counterpartyVersion":"Counterparty Version","channel":"Channel","proofClient":"Proof Client","counterparty":"Counterparty"},"navbar":{"siteName":"BIG DIPPER","version":"-","validators":"Validators","blocks":"Blocks","transactions":"Transactions","proposals":"Proposals","votingPower":"Voting Power","lang":"ENG","english":"English","spanish":"Español","italian":"Italiano","polish":"Polski","russian":"Русский","chinese":"中文（繁）","simChinese":"中文（简）","portuguese":"Português","license":"LICENSE","forkMe":"Fork me!"},"consensus":{"consensusState":"Consensus State","round":"Round","step":"Step"},"chainStates":{"price":"Price","marketCap":"Market Cap","inflation":"Inflation","communityPool":"Community Pool"},"chainStatus":{"startMessage":"The chain is going to start in","stopWarning":"The chain appears to be stopped for <em>{$time}</em>! Feed me with new blocks 😭!","latestHeight":"Latest Block Height","averageBlockTime":"Average Block Time","all":"All","now":"Now","allTime":"All Time","lastMinute":"Last Minute","lastHour":"Last Hour","lastDay":"Last Day","seconds":"seconds","activeValidators":"Active Validators","outOfValidators":"out of {$totalValidators} validators","onlineVotingPower":"Online Voting Power","fromTotalStakes":"{$percent} from {$totalStakes} {$denomPlural}"},"analytics":{"blockTimeHistory":"Block Time History","averageBlockTime":"Average Block Time","blockInterval":"Block Interval","noOfValidators":"No. of Validators"},"validators":{"randomValidators":"Random Validators","moniker":"Moniker","uptime":"Uptime","selfPercentage":"Self%","commission":"Commission","lastSeen":"Last Seen","status":"Status","jailed":"Jailed","navActive":"Active","navInactive":"Inactive","active":"Active Validators","inactive":"Inactive Validators","listOfActive":"Here is a list of active validators.","listOfInactive":"Here is a list of inactive validators.","validatorDetails":"Validator Details","lastNumBlocks":"Last {$numBlocks} blocks","validatorInfo":"Validator Info","operatorAddress":"Operator Address","selfDelegationAddress":"Self-Delegate Address","commissionRate":"Commission Rate","maxRate":"Max Rate","maxChangeRate":"Max Change Rate","selfDelegationRatio":"Self Delegation Ratio","proposerPriority":"Proposer Priority","delegatorShares":"Delegator Shares","userDelegateShares":"Shares Delegated by you","tokens":"Tokens","unbondingHeight":"Unbonding Height","unbondingTime":"Unbonding Time","jailedUntil":"Jailed Until","powerChange":"Power Change","delegations":"Delegations","transactions":"Transactions","validatorNotExists":"Validator does not exist.","backToValidator":"Back to Validator","missedBlocks":"Missed Blocks","missedPrecommits":"Missed Precommits","missedBlocksTitle":"Missed blocks of {$moniker}","totalMissed":"Total missed","block":"Block","missedCount":"Miss Count","iDontMiss":"I do not miss ","lastSyncTime":"Last sync time","delegator":"Delegator","amount":"Amount"},"blocks":{"block":"Block","proposer":"Proposer","latestBlocks":"Latest blocks","noBlock":"No block.","numOfTxs":"No. of Txs","numOfTransactions":"No. of Transactions","notFound":"No such block found."},"transactions":{"transaction":"Transaction","transactions":"Transactions","notFound":"No transaction found.","activities":"Activities","txHash":"Tx Hash","valid":"Valid","fee":"Fee","noFee":"No fee","gasUsedWanted":"Gas (used / wanted)","noTxFound":"No such transaction found.","noValidatorTxsFound":"No transaction related to this validator was found.","memo":"Memo","transfer":"Transfer","staking":"Staking","distribution":"Distribution","governance":"Governance","slashing":"Slashing"},"proposals":{"notFound":"No proposal found.","listOfProposals":"Here is a list of governance proposals.","proposer":"Proposer","proposal":"proposal","proposals":"Proposals","proposalID":"Proposal ID","title":"Title","status":"Status","submitTime":"Submit Time","depositEndTime":"Deposit End Time","votingStartTime":"Voting Start Time","votingEndTime":"End Voting Time","totalDeposit":"Total Deposit","description":"Description","proposalType":"Proposal Type","proposalStatus":"Proposal Status","notStarted":"not started","final":"final","deposit":"Deposit","tallyResult":"Tally Result","yes":"Yes","abstain":"Abstain","no":"No","noWithVeto":"No with Veto","percentageVoted":"<span class=\"text-info\">{$percent}</span> of online voting power has been voted.","validMessage":"This proposal is {$tentative}<strong>valid</strong>.","invalidMessage":"Less than {$quorum} of voting power is voted. This proposal is <strong>invalid</strong>.","moreVoteMessage":"It will be a valid proposal once <span class=\"text-info\">{$moreVotes}</span> more votes are cast.","key":"Key","value":"Value","amount":"Amount","recipient":"Recipient","changes":"Changes","subspace":"Subspace"},"votingPower":{"distribution":"Voting Power Distribution","pareto":"Pareto Principle (20/80 rule)","minValidators34":"Min no. of validators hold 34%+ power"},"accounts":{"accountDetails":"Account Details","available":"Available","delegated":"Delegated","unbonding":"Unbonding","rewards":"Rewards","total":"Total","notFound":"This account does not exist. Are you looking for a wrong address?","validators":"Validators","shares":"Shares","mature":"Mature","no":"No ","none":"No ","delegation":"Delegation","plural":"s","signOut":"Sign out","signInText":"You are signed in as ","toLoginAs":"To log in as","signInWithLedger":"Sign In With Ledger","signInWarning":"Please make sure your Ledger device is turned on and <strong class=\"text-primary\">{$network} App {$version} or above</strong> is opened.","pleaseAccept":"please accept in your Ledger device.","noRewards":"No Rewards","BLESupport":"Bluetooth connection is currently only supported on Google Chrome Browser."},"activities":{"single":"A","happened":"happened.","senders":"The following sender(s)","sent":"sent","receivers":"to the following receipient(s)","received":"received","failedTo":"failed to ","to":"to","from":"from","operatingAt":"operating at","withMoniker":"with moniker","withTitle":"with title","withA":"with a","withAmount":"with <span class=\"text-info\">{$amount}</span>"},"messageTypes":{"send":"Send","multiSend":"Multi Send","createValidator":"Create Validator","editValidator":"Edit Validator","delegate":"Delegate","undelegate":"Undelegate","redelegate":"Redelegate","submitProposal":"Submit Proposal","deposit":"Deposit","vote":"Vote","withdrawComission":"Withdraw Commission","withdrawReward":"Withdraw Reward","modifyWithdrawAddress":"Modify Withdraw Address","unjail":"Unjail","IBCTransfer":"IBC Transfer","IBCReceive":"IBC Receive","IBCCreateClient":"IBC Create Client","IBCUpdateClient":"IBC Update Client","IBCUpgradeClient":"IBC Upgrade Client","IBCSubmitMisbehaviour":"IBC Submit Misbehaviour","IBCReceivePacket":"IBC Receive Packet","IBCConnectionOpenConfirm":"IBC Connection Open Confirm","IBCConnectionOpenTry":"IBC Connection Open Try","IBCConnectionOpenAck":"IBC Connection Open Acknowledgement","IBCConnectionOpenInit":"IBC Connection Open Init","IBCAcknowledgement":"IBC Acknowledgement","IBCChannelCloseConfirm":"IBC Channel Close Confirm","IBCChannelCloseInit":"IBC Channel Close Init","IBCChannelOpenAck":"IBC Channel Open Acknowledgement","IBCChannelOpenConfirm":"IBC Channel Open Confirm","IBCChannelOpenInit":"IBC Channel Open Init","IBCChannelOpenTry":"IBC Channel Open Try","IBCConnectionEnd":"IBC Connection End","IBCCounterparty":"IBC Counterparty","IBCVersion":"IBC Version","IBCTimeout":"IBC Timeout","IBCTimeoutOnClose":"IBC Timeout On Close","IBCHeight":"IBC Height","IBCChannel":"IBC Channel","IBCPacket":"IBC Packet","IBCMsgTransfer":"IBC Message Transfer"}});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"es-es.i18n.yml.js":function module(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// both/i18n/es-es.i18n.yml.js                                                                                         //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Package['universe:i18n'].i18n.addTranslations('es-ES','',{"common":{"height":"Altura","voter":"Votante","votingPower":"Poder de votación","addresses":"Direcciones","amounts":"Cantidades","delegators":"delegadores","block":"bloque","blocks":"bloques","precommit":"precommit","precommits":"precommits","last":"último","backToList":"Volver a la lista","information":"Información","time":"Tiempo","hash":"Hash","more":"Más","fullStop":".","searchPlaceholder":"Buscar con el tx hash / altura de bloque / dirección","cancel":"Cancelar","retry":"Reintentar"},"navbar":{"siteName":"BIG DIPPER","validators":"Validadores","blocks":"Bloques","transactions":"Transacciones","proposals":"Propuestas","votingPower":"Poder de voto","lang":"ES","english":"English","spanish":"Español","italian":"Italiano","polish":"Polski","russian":"Русский","chinese":"中文（繁）","simChinese":"中文（简）","portuguese":"Português","license":"LICENCIA","forkMe":"Fork me!"},"consensus":{"consensusState":"Estado de consenso","round":"Ronda","step":"Paso"},"chainStates":{"price":"Precio","marketCap":"Capitalización de mercado","inflation":"Inflación","communityPool":"Community Pool"},"chainStatus":{"startMessage":"La cadena comenzará en","stopWarning":"La cadena parece estar parada por <em>{$time}</em>! Dame de comer nuevos bloques 😭!","latestHeight":"Última altura de bloque","averageBlockTime":"Tiempo medio de bloque","all":"Todo","now":"Ahora","allTime":"Todo el tiempo","lastMinute":"Último minuto","lastHour":"Última hora","lastDay":"Último día","seconds":"segundos","activeValidators":"Validadores activos","outOfValidators":"fuera de {$totalValidators} validadores","onlineVotingPower":"Poder de voto en línea","fromTotalStakes":"{$percent} de {$totalStakes} {$denomPlural}"},"analytics":{"blockTimeHistory":"Historial de tiempo de bloque","averageBlockTime":"Tiempo medio de bloque","blockInterval":"Intervalo de bloque","noOfValidators":"No. de validadores"},"validators":{"randomValidators":"Validadores aleatorios","moniker":"Moniker","uptime":"Tiempo de funcionamiento","selfPercentage":"Self%","commission":"Comisión","lastSeen":"Última vez visto","status":"Estado","jailed":"Encarcelado","navActive":"Activo","navInactive":"Inactivo","active":"Validadores activos","inactive":"Validadores inactivos","listOfActive":"Esta es una lista de los validadores activos.","listOfInactive":"Esta es una lista de los validadores inactivos.","validatorDetails":"Detalles del validador","lastNumBlocks":"Último {$numBlocks} bloques","validatorInfo":"Información del validador","operatorAddress":"Dirección de operador","selfDelegationAddress":"Dirección de autodelegación","commissionRate":"Ratio de comisión","maxRate":"Ratio máximo","maxChangeRate":"Ratio máximo de cambio","selfDelegationRatio":"Ratio de autodelegación","proposerPriority":"","delegatorShares":"Acciones del delegador","userDelegateShares":"Acciones delegadas por ti","tokens":"Tokens","unbondingHeight":"Altura ","unbondingTime":"Tiempo para desvincularse","powerChange":"Power Change","delegations":"Delegaciones","transactions":"Transacciones","validatorNotExists":"El validador no existe.","backToValidator":"Volver al validador","missedBlocks":"Bloques perdidos","missedPrecommits":"Precommits perdidos","missedBlocksTitle":"Bloques perdidos de {$moniker}","totalMissed":"Total perdido","block":"Bloque","missedCount":"Perdidos","iDontMiss":"No he perdido ","lastSyncTime":"Último tiempo de sincronización","delegator":"Delegador","amount":"Cantidad"},"blocks":{"block":"Bloque","proposer":"Proposer","latestBlocks":"Últimos bloques","noBlock":"No bloque.","numOfTxs":"No. de txs","numOfTransactions":"No. de transacciones","notFound":"No se ha encontrado tal bloque."},"transactions":{"transaction":"Transacción","transactions":"Transacciones","notFound":"No se encuentra la transacción.","activities":"Movimientos","txHash":"Tx Hash","valid":"Validez","fee":"Comisión","noFee":"No fee","gasUsedWanted":"Gas (usado / deseado)","noTxFound":"No se encontró ninguna transacción de este tipo.","noValidatorTxsFound":"No se encontró ninguna transaccion relacionada con este validador.","memo":"Memo","transfer":"Transferencia","staking":"Participación","distribution":"Distribución","governance":"Gobernanza","slashing":"Recorte"},"proposals":{"notFound":"No se ha encontrado el proposal.","listOfProposals":"Here is a list of governance proposals.","proposer":"Proposer","proposal":"propuesta","proposals":"Propuestas","proposalID":"ID de la propuesta","title":"Título","status":"Estado","submitTime":"Plazo de entrega","depositEndTime":"Final del tiempo de depósito","votingStartTime":"Hora de inicio de la votación","votingEndTime":"Fin del tiempo de votación","totalDeposit":"Depósito total","description":"Descripción","proposalType":"Tipo de propuesta","proposalStatus":"Estado de la propuesta","notStarted":"no iniciado","final":"final","deposit":"Depósito","tallyResult":"Resultado del recuento","yes":"Si","abstain":"Abstención","no":"No","none":"None","noWithVeto":"No con Veto","percentageVoted":"<span class=\"text-info\">{$percent}</span> del poder de voto online ha votado.","validMessage":"Este proposal es {$tentative}<strong>valido</strong>.","invalidMessage":"Menos del {$quorum} del poder de voto ha votado. Este proposal es <strong>invalido</strong>.","moreVoteMessage":"Será una propuesta válida una vez que <span class=\"text-info\">{$moreVotes}</span> más votos se emitan.","key":"Key","value":"Value","amount":"Amount","recipient":"Recipient","changes":"Changes","subspace":"Subspace"},"votingPower":{"distribution":"Distribución del poder de Voto","pareto":"Pareto Principle (20/80 rule)","minValidators34":"Min no. of validators hold 34%+ power"},"accounts":{"accountDetails":"Detalles de la cuenta","available":"Disponible","delegated":"Delegado","unbonding":"Unbonding","rewards":"Rewards","total":"Total","notFound":"Esta cuenta no existe. ¿Estas buscando una dirección equivocada?","validators":"Validadores","shares":"Shares","mature":"Mature","no":"No ","delegation":"Delegación","plural":"s","signOut":"Cerrar sesión","signInText":"Estas registrado como ","toLoginAs":"Para conectarse como","signInWithLedger":"Registrarse con Ledger","signInWarning":"Por favor, asegúrese de que su dispositivo Ledger esté conectado y <strong class=\"text-primary\">la App de Cosmos con la version 1.5.0 o superior</strong> esta abierta.","pleaseAccept":"por favor, acepta en tu dispositivo Ledger.","noRewards":"No Rewards"},"activities":{"single":"A","happened":"sucedió.","senders":"Los siguientes remitentes","sent":"enviado a","receivers":"al siguiente destinatario","received":"recibido","failedTo":"failed to ","to":"a","from":"desde","operatingAt":"operando en","withMoniker":"con el moniker","withTitle":"con el título","withA":"con"},"messageTypes":{"send":"Enviar","multiSend":"Multi Envío","createValidator":"Crear validador","editValidator":"Editar validador","delegate":"Delegar","undelegate":"Undelegar","redelegate":"Redelegar","submitProposal":"Enviar Proposal","deposit":"Depositar","vote":"Voto","withdrawComission":"Enviar comisión","withdrawReward":"Retirar recompensa","modifyWithdrawAddress":"Modificar la dirección de envío","unjail":"Unjail","IBCTransfer":"IBC Transfer","IBCReceive":"IBC Receive"}});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"it-IT.i18n.yml.js":function module(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// both/i18n/it-IT.i18n.yml.js                                                                                         //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Package['universe:i18n'].i18n.addTranslations('it-IT','',{"common":{"height":"Altezza","voter":"Votante","votingPower":"Potere di voto","addresses":"Indirizzi","amounts":"Importi","delegators":"delegatori","block":"blocco","blocks":"blocchi","precommit":"precommit","precommits":"precommit","last":"ultimo","backToList":"Torna alla Lista","information":"Informazioni","time":"Tempo","hash":"Hash","more":"Di più","fullStop":".","searchPlaceholder":"Cerca hash transazione / altezza blocco / indirizzo","cancel":"Annulla","retry":"Riprova","rewards":"Reward"},"navbar":{"siteName":"BIG DIPPER","validators":"Validatori","blocks":"Blocchi","transactions":"Transazioni","proposals":"Proposte","votingPower":"Potere di Voto","lang":"IT","english":"English","spanish":"Español","italian":"Italiano","polish":"Polski","russian":"Русский","chinese":"中文（繁）","simChinese":"中文（简）","portuguese":"Português","license":"LICENZA","forkMe":"Forkami!"},"consensus":{"consensusState":"Stato del consenso","round":"Round","step":"Step"},"chainStates":{"price":"Prezzo","marketCap":"Market Cap","inflation":"Inflazione","communityPool":"Community Pool"},"chainStatus":{"startMessage":"The chain partirà tra","stopWarning":"La chain sembra essersi fermata per <em>{$time}</em>! Dammi nuovi blocchi 😭!","latestHeight":"Ultima Altezza di Blocco","averageBlockTime":"Tempo di Blocco Medio","all":"Tutti","now":"Ora","allTime":"Tutti i tempi","lastMinute":"Ultimo Minuto","lastHour":"Ultima ora","lastDay":"Ultimo giorno","seconds":"secondi","activeValidators":"Validatori Attivi","outOfValidators":"di {$totalValidators} validatori","onlineVotingPower":"Voting Power Attivo","fromTotalStakes":"{$percent} di {$totalStakes} {$denomPlural}"},"analytics":{"blockTimeHistory":"Storia Tempo di Blocco","averageBlockTime":"Tempo di Blocco Medio","blockInterval":"Intervallo di Blocco","noOfValidators":"N. Validatori"},"validators":{"randomValidators":"Validatori random","moniker":"Moniker","uptime":"Uptime","selfPercentage":"% autodelegata","commission":"Commissioni","lastSeen":"Visto per ultimo","status":"Stato","jailed":"Jailato","navActive":"Attivo","navInactive":"Inattivo","active":"Tutti i Validatori","inactive":"Validatori inattivi","listOfActive":"Ecco una lista di validatori attivi.","listOfInactive":"Ecco una lista di validatori inattivi.","validatorDetails":"Dettagli validatore","lastNumBlocks":"Utlimi {$numBlocks} blocchi","validatorInfo":"Info Validatore","operatorAddress":"Indirizzo Operatore","selfDelegationAddress":"Indirizzo di Auto-Delega","commissionRate":"Tasso di commissioni","maxRate":"Tasso massima","maxChangeRate":"Cambiamento del tasso massimo","selfDelegationRatio":"Tasso di Auto Delega","proposerPriority":"Priorità del proponente","delegatorShares":"Percentuale dei delegati","userDelegateShares":"Percentuale delega personale","tokens":"Token","unbondingHeight":"Altezza di unbond","unbondingTime":"Tempo di unbond","powerChange":"Modifica del potere","delegations":"Delegazioni","transactions":"Transazioni","validatorNotExists":"Validatore inesistente","backToValidator":"Torna al validatore","missedBlocks":"Blocchi mancanti","missedPrecommits":"Precommit mancati","missedBlocksTitle":"Manca il blocco: {$moniker}","totalMissed":"Totale perso","block":"Blocco","missedCount":"Mancato conteggio","iDontMiss":"Non mi manca","lastSyncTime":"Ultima sincronizzazione ora","delegator":"Delegante","amount":"Importo"},"blocks":{"block":"Blocco","proposer":"Proponente","latestBlocks":"Ultimi blocchi","noBlock":"Nessun blocco","numOfTxs":"N. Txs","numOfTransactions":"N. di transazioni","notFound":"Nessun blocco trovato."},"transactions":{"transaction":"Transazione","transactions":"Transazioni","notFound":"Nessuna transazione trovata","activities":"Attività","txHash":"Hash Tx","valid":"Valido","fee":"Fee","noFee":"Nessuna fee","gasUsedWanted":"Gas (usato / voluto)","noTxFound":"Nessuna transazione trovata.","noValidatorTxsFound":"Nessuna transazione relativa a questo validatore trovata","memo":"Memo","transfer":"Trasferimento","staking":"Staking","distribution":"Distribuzione","governance":"Governance","slashing":"Slashing"},"proposals":{"notFound":"Nessuna proposta trovata.","listOfProposals":"Questa è la lista delle proposte di governance","proposer":"Proponente","proposal":"Proposta","proposals":"Proposte","proposalID":"ID Proposta","title":"Titolo","status":"Stato","submitTime":"Ora invio","depositEndTime":"Ora di fine deposito","votingStartTime":"Ora di inizio votazione","votingEndTime":"Ora di fine votazione","totalDeposit":"Deposito totale","description":"Descrizione","proposalType":"Tipo di proposta","proposalStatus":"Stato della proposta","notStarted":"Non iniziato","final":"Finale","deposit":"Deposito","tallyResult":"Risultato conteggio","yes":"Sì","abstain":"Astenersi","no":"No","noWithVeto":"No con Veto","percentageVoted":"<span class=\"text-info\">{$percent}</span> di voti raccolti tra i votanti attivi.","validMessage":"Questa proposta è {$tentative}<strong>valida</strong>.","invalidMessage":"Sono stati raccolti meno del {$quorum} di voti. Questa proposta è <strong>invalida</strong>.","moreVoteMessage":"Sarà una proposta valida quando <span class=\"text-info\">{$moreVotes}</span> più voti di ora saranno raccolti.","key":"Key","value":"Value","amount":"Amount","recipient":"Recipient","changes":"Changes","subspace":"Subspace"},"votingPower":{"distribution":"Distribuzione del potere di voto","pareto":"Principio di Pareto (regola 20/80)","minValidators34":"Min n. di validatori che possiede il 34%+ di potere"},"accounts":{"accountDetails":"Dettagli account","available":"Disponibile","delegated":"Delegati","unbonding":"Unbonding","rewards":"Rewards","total":"Totale","notFound":"Questo account non esiste. Forse hai inserito l'indirizzo sbagliato?","validators":"Validatori","shares":"Share","mature":"Maturo","no":"No ","none":"Nessuno","delegation":"Delega","plural":"","signOut":"Esci","signInText":"Registrati come","toLoginAs":"Accedi come","signInWithLedger":"Registrati con un Ledger","signInWarning":"Per favore assicurati che il tuo Ledger sia connesso e <strong class=\"text-primary\">{$network} App {$version} or above</strong> che sia aperto.","pleaseAccept":"Per favore accetta nel tuo Ledger","noRewards":"Nessun reward"},"activities":{"single":"Un (male), una (female)","happened":"è accaduto.","senders":"I seguenti mittenti","sent":"Inviato","receivers":"I seguenti destinatati","received":"Ricevuto","failedTo":"Ha fallito a ","to":"A","from":"Da","operatingAt":"che operano presso","withMoniker":"con moniker","withTitle":"con titolo","withA":"con un (male) / una (female)"},"messageTypes":{"send":"Invia","multiSend":"Invio multipo","createValidator":"Crea un validatore","editValidator":"Modifica un validatore","delegate":"Delega","undelegate":"Rimuovi delega","redelegate":"Ridelega","submitProposal":"Invia proposta","deposit":"Deposita","vote":"Vota","withdrawComission":"Ritira una commissione","withdrawReward":"Ottieni un reward","modifyWithdrawAddress":"Modifica indirizzo di ritiro","unjail":"Unjail","IBCTransfer":"Trasferisci IBC","IBCReceive":"Ricevi IBC"}});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"pl-PL.i18n.yml.js":function module(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// both/i18n/pl-PL.i18n.yml.js                                                                                         //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Package['universe:i18n'].i18n.addTranslations('pl-PL','',{"common":{"height":"Wysokość","voter":"Głosujący","votingPower":"Siła Głosu","addresses":"Adres","amounts":"Kwota","delegators":"Delegatorzy","block":"blok","blocks":"bloki","precommit":"precommit","precommits":"precommits","last":"ostatni","backToList":"Powrtót do Listy","information":"Informacje","time":"Czas","hash":"Hash","more":"Więcej","fullStop":".","searchPlaceholder":"Wyszukaj adres / transakcję / wysokość bloku","cancel":"Anuluj","retry":"Spróbuj ponownie","rewards":"Nagrody"},"navbar":{"siteName":"Wielki Wóz","validators":"Walidatorzy","blocks":"Bloki","transactions":"Transakcje","proposals":"Propozycje","votingPower":"Siła Głosu","lang":"PL","english":"English","spanish":"Español","italian":"Italiano","polish":"Polski","russian":"Русский","chinese":"中文（繁）","simChinese":"中文（简）","portuguese":"Português","license":"LICENCJA","forkMe":"Fork me!"},"consensus":{"consensusState":"Status Konsensusu","round":"Runda","step":"Etap"},"chainStates":{"price":"Cena","marketCap":"Kapitalizacja rynkowa","inflation":"Inflacja","communityPool":"Zasoby Społeczności"},"chainStatus":{"startMessage":"Łańcuch bloków danych rozpocznie działanie za ","topWarning":"Wygląda na to że, łańcuch bloków danych zatrzymał się na <em>{$time}</em>! Odśwież stronę i nakarm mnie nowymi blokami 😭!","latestHeight":"Ostatnia wysokość bloku","averageBlockTime":"Średni Czas Bloku","all":"Całość","now":"Teraz","allTime":"Cały Czas","lastMinute":"Ostatnia Minuta","lastHour":"Ostatnia Godzina","lastDay":"Ostatni Dzień","seconds":"sekund","activeValidators":"Aktywni Walidatorzy","outOfValidators":"z grona {$totalValidators} walidatorów","onlineVotingPower":"Siła Głosu Online","fromTotalStakes":"{$percent} spośród {$totalStakes} {$denomPlural}"},"analytics":{"blockTimeHistory":"Czas Bloków","averageBlockTime":"Średni Czas Bloku","blockInterval":"Interwał Bloku","noOfValidators":"Liczba Walidatorów"},"validators":{"randomValidators":"Losowo Wybrani Walidatorzy","moniker":"Moniker","uptime":"Dyspozycyjność","selfPercentage":"Self%","commission":"Prowizja","lastSeen":"Ostatnio widziany","status":"Status","jailed":"Jailed","navActive":"Aktywni","navInactive":"Nieaktywni","active":"Aktywni Walidatorzy","inactive":"Nieaktywni Walidatorzy","listOfActive":"Lista aktywnych Walidatorów","listOfInactive":"Lista nieaktywnych Walidatorów","validatorDetails":"Szczegóły Walidatora","lastNumBlocks":"Ostatnie {$numBlocks} bloków","validatorInfo":"Szczegóły Walidatora","operatorAddress":"Adres Operatora","selfDelegationAddress":"Adres Delegacji Self","commissionRate":"Wysokość prowizji","maxRate":"Maksymalna Stawka","maxChangeRate":"Maksymalna Stawka Zmiany Prowizji","selfDelegationRatio":"Proporcja Delegacji Self","proposerPriority":"Piorytet Propozycji","delegatorShares":"Akcje Delegującego","userDelegateShares":"Akcje Oddelegowane przez Ciebie","tokens":"Tokeny","unbondingHeight":"Wysokość Unbonding","unbondingTime":"Czas Unbonding","powerChange":"Zmiana Siły Głosu","delegations":"Delegacje","transactions":"Transakcje","validatorNotExists":"Walidator nie istnieje.","backToValidator":"Powrtót do Walidatora","missedBlocks":"Pominięte Bloki","missedPrecommits":"Pominięte Precommits","missedBlocksTitle":"‘Pominięte Bloki od {$moniker}'","totalMissed":"Łącznie pominięto","block":"Blok","missedCount":"Liczba pominiętych","iDontMiss":"Żadne bloki nie zostały pominięte","lastSyncTime":"Ostatni czas synch","delegator":"Delegujący","amount":"Kwota"},"blocks":{"block":"Blok","proposer":"Autor Propozycji","latestBlocks":"Ostatnie Bloki","noBlock":"Ilość Bloków","numOfTxs":"Liczba Txs","numOfTransactions":"Liczba Transakcji","notFound":"Nie znaleziono bloku."},"transactions":{"transaction":"Transakcja","transactions":"Transakcje","notFound":"Nie znaleziono transakcji.","activities":"Aktywność","txHash":"Tx Hash","valid":"Ważna","fee":"Opłata","noFee":"Bezpłatnie","gasUsedWanted":"Gaz (użyty/ wymagany)","noTxFound":"Nie znaleziono podanej transakcji.","noValidatorTxsFound":"Nie znaleziono żadnej transakcji dla podanego Walidatora","memo":"Memo","transfer":"Wysłane","staking":"Udziały","distribution":"Dystrybucja","governance":"Administracja","slashing":"Cięcia"},"proposals":{"notFound":"Nie znaleziono propozycji.'","listOfProposals":"Poniżej znajduje się lista propozycji administracyjnych.","proposer":"Autor Propozycji","proposal":"propozycja","proposals":"Propozycje","proposalID":"ID Propozycji","title":"Tytuł","status":"Status","submitTime":"Czas Wysłania","depositEndTime":"Czas Końcowy dla Skladania Depozytu","votingStartTime":"Czas Rozpoczęcia Głosowania","votingEndTime":"Czas Końcowy Głosowania","totalDeposit":"Kwota Depozytu","description":"Szczegóły","proposalType":"Typ Propozycji","proposalStatus":"Status Propozycji","notStarted":"nie rozpoczęto","final":"końcowy","deposit":"Depozyt","tallyResult":"Wyniki Tally","yes":"Tak","abstain":"Wstrzymaj się od Głosu","no":"Nie","noWithVeto":"Nie z Veto","percentageVoted":"<span class=\"text-info\">{$percent}</span> Głosów Online zostalo oddanych","validMessage":"Podana propozycja jest {$tentative}<strong>ważna</strong>.","invalidMessage":"Mniej niż {$quorum} głosów zostało oddanych. Podana propozycja jest <strong>nieważna</strong>.","moreVoteMessage":"Propozycja zostanie uznana za ważną jeśli <span class=\"text-info\">{$moreVotes}</span> lub więcej głosów zostanie oddanych.","key":"Key","value":"Value","amount":"Kwota","recipient":"Odbiorca","changes":"Zmiany","subspace":"Subspace"},"votingPower":{"distribution":"Podział Siły Głosu","pareto":"Zasada Pareta (zasada 20/80)","minValidators34":"Co najmniej 34% Walidatorów ma prawo do głosowania."},"accounts":{"accountDetails":"Szczegóły Konta","available":"Dostępe","delegated":"Oddelegowane","unbonding":"Unbonding","rewards":"Nagrody","total":"Łącznie","notFound":"Konto nie istnieje. Sprawdź, czy adres odbiorcy został prawidłowo wpisany.","validators":"Walidatorzy","shares":"Akcje","mature":"Dojrzały","no":"Nie ","none":"Brak ","delegation":"Delegacja","plural":"","signOut":"Wyloguj","signInText":"Zalogowany jako ","toLoginAs":"Aby zalogować się jako ","signInWithLedger":"Zaloguj się z Ledgerem","signInWarning":"Upewnij się, że Twój Ledger jest podłączony do komputera oraz aplikacja <strong class=\"text-primary\">{$network} App {$version} lub nowsza </strong> jest uruchomiona.","pleaseAccept":"zaakceptuj połączenie na Twoim Ledgerze.","noRewards":"Brak Nagród"},"activities":{"single":" ","happened":"został wykonany","senders":"Nadawca","sent":"wysłał","receivers":"do podanych odbiorców/cy","received":"otrzymał","failedTo":"Nie udało się","to":"do","from":"od","operatingAt":"operujący pod adresem","withMoniker":"z monikerem","withTitle":"pod tytułem","withA":"razem z"},"messageTypes":{"send":"Wysłał","multiSend":"Wysłał Multi","createValidator":"Utwórz Walidatora","editValidator":"Edytuj Walidatora","delegate":"Oddelegował","undelegate":"Wycofał Oddelegowane Tokeny","redelegate":"Oddelegował Ponownie","submitProposal":"Wyśłał Propozycję","deposit":"Wpłacił Depozyt","vote":"Zagłosował","withdrawComission":"Wypłacił Prowizję","withdrawReward":"Wypłacił Nagrody","modifyWithdrawAddress":"Zmienił adres do wypłaty","unjail":"Unjail","IBCTransfer":"Wyślij IBC","IBCReceive":"Odbierz IBC"}});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"pt-BR.i18n.yml.js":function module(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// both/i18n/pt-BR.i18n.yml.js                                                                                         //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Package['universe:i18n'].i18n.addTranslations('pt-BR','',{"common":{"height":"Altura","voter":"Eleitor","votingPower":"Poder de voto","addresses":"Endereços","amounts":"Quantidades","delegators":"delegadores","block":"bloco","blocks":"blocos","precommit":"precommit","precommits":"precommits","last":"último","backToList":"Voltar para lista","information":"Informação","time":"Data e hora","hash":"Hash","more":"Mais","fullStop":".","searchPlaceholder":"Pesquise por tx hash / altura do bloco / endereço","cancel":"Cancelar","retry":"Tentar novamente","rewards":"Recompensas"},"navbar":{"siteName":"BIG DIPPER","validators":"Validadores","blocks":"Blocos","transactions":"Transações","proposals":"Propostas","votingPower":"Poder de voto","lang":"pt-BR","english":"English","spanish":"Español","italian":"Italiano","polish":"Polski","chinese":"中文（繁）","simChinese":"中文（简）","portuguese":"Português","license":"LICENÇA","forkMe":"Fork me!"},"consensus":{"consensusState":"Estado de consenso","round":"Rodada","step":"Etapa"},"chainStates":{"price":"Preço","marketCap":"Valor de mercado","inflation":"Inflação","communityPool":"Pool da comunidade"},"chainStatus":{"startMessage":"A cadeia vai começar em","stopWarning":"A cadeia parece ter parado por <em>{$time}</em>! Alimente-me com novos blocos 😭!","latestHeight":"Última altura de bloco","averageBlockTime":"Tempo médio de bloco","all":"Tudo","now":"Agora","allTime":"Todo tempo","lastMinute":"Último minuto","lastHour":"Última hora","lastDay":"Último dia","seconds":"segundos","activeValidators":"Validadores ativos","outOfValidators":"de {$totalValidators} validadores","onlineVotingPower":"Poder de votação online","fromTotalStakes":"{$percent} de {$totalStakes} {$denomPlural}"},"analytics":{"blockTimeHistory":"Histórico de tempo de bloco","averageBlockTime":"Tempo médio de bloco","blockInterval":"Intervalo de bloco","noOfValidators":"Nº de validadores"},"validators":{"randomValidators":"Validadores aleatórios","moniker":"Apelido","uptime":"Tempo de atividade","selfPercentage":"Self%","commission":"Comissão","lastSeen":"Visto pela última vez","status":"Status","jailed":"Engaiolado","navActive":"Ativo","navInactive":"Inativo","active":"Validadores Ativos","inactive":"Validadores Inativos","listOfActive":"Aqui está uma lista de validadores ativos.","listOfInactive":"Aqui está uma lista de validadores inativos.","validatorDetails":"Detalhes do validador","lastNumBlocks":"Últimos {$numBlocks} blocos","validatorInfo":"Informação do validador","operatorAddress":"Endereço do operador","selfDelegationAddress":"Endereço de auto-delegação","commissionRate":"Taxa de Comissão","maxRate":"Taxa máxima","maxChangeRate":"Taxa máxima de alteração","selfDelegationRatio":"Razão de auto-delegação","proposerPriority":"Prioridade do proponente","delegatorShares":"Ações do delegador","userDelegateShares":"Ações delegadas por você","tokens":"Tokens","unbondingHeight":"Altura de desvinculação","unbondingTime":"Tempo de desvinculação","powerChange":"Mudança de poder","delegations":"Delegações","transactions":"Transações","validatorNotExists":"O validador não existe.","backToValidator":"Voltar para validador","missedBlocks":"Blocos perdidos","missedPrecommits":"Precommits perdidos","missedBlocksTitle":"Blocos perdidos por {$moniker}","totalMissed":"Total perdido","block":"Bloco","missedCount":"Contagem de perdidos","iDontMiss":"Não há perdidos ","lastSyncTime":"Última sincronização","delegator":"Delegador","amount":"Quantidade"},"blocks":{"block":"Bloco","proposer":"Proponente","latestBlocks":"Últimos Blocos","noBlock":"Sem bloco.","numOfTxs":"No. de Txs","numOfTransactions":"Nº de transações","notFound":"Nenhum bloco encontrado."},"transactions":{"transaction":"Transação","transactions":"Transações","notFound":"Nenhuma transação encontrada.","activities":"Atividades","txHash":"Tx Hash","valid":"Validade","fee":"Taxa","noFee":"Sem taxa","gasUsedWanted":"Gas (usado / desejado)","noTxFound":"Nenhuma transação encontrada.","noValidatorTxsFound":"Nenhuma transação relacionada a este validador foi encontrada.","memo":"Memo","transfer":"Transferência","staking":"Participação","distribution":"Distribuição","governance":"Governança","slashing":"Cortando"},"proposals":{"notFound":"Nenhuma proposta encontrada.","listOfProposals":"Aqui está uma lista de propostas de governança.","proposer":"Proponente","proposal":"proposta","proposals":"Propostas","proposalID":"ID da proposta","title":"Título","status":"Status","submitTime":"Tempo de envio","depositEndTime":"Fim do tempo de depósito","votingStartTime":"Hora do início da votação","votingEndTime":"Fim do tempo de votação","totalDeposit":"Depósito Total","description":"Descrição","proposalType":"Tipo de proposta","proposalStatus":"Status da proposta","notStarted":"não iniciado","final":"final","deposit":"Depósito","tallyResult":"Resultado da contagem","yes":"Sim","abstain":"Abstenção","no":"Não","noWithVeto":"Não com Veto","percentageVoted":"<span class=\"text-info\">{$percent}</span> do poder de voto já votou.","validMessage":"Esta proposta é {$tentative}<strong>válida</strong>.","invalidMessage":"Menos de {$ quorum} do poder de voto foi votado. Esta proposta é <strong>inválida.</strong>.","moreVoteMessage":"Será uma proposta válida uma vez que <span class=\"text-info\">{$moreVotes}</span> mais votos sejam enviados.","key":"Chave","value":"Valor","amount":"Quantidade","recipient":"Recebedor","changes":"Alterações","subspace":"Subespaço"},"votingPower":{"distribution":"Distribuição do poder de voto","pareto":"Princípio de Pareto (regra 20/80)","minValidators34":"Número mínimo de validadores que detem 34%+ de poder"},"accounts":{"accountDetails":"Detalhes da conta","available":"disponível","delegated":"delegado","unbonding":"desvinculação","rewards":"Recompensas","total":"Total","notFound":"Essa conta não existe. Você está informando o endereço correto?","validators":"Validadores","shares":"Ações","mature":"Mature","no":"Não ","none":"Sem ","delegation":"delegação","plural":"s","signOut":"Sair","signInText":"Você está conectado como ","toLoginAs":"Para entrar como","signInWithLedger":"Entrar com Ledger","signInWarning":"Certifique-se de que seu dispositivo Ledger esteja conectado e o <strong class=\"text-primary\">{$network} App {$version} ou superior</strong> esteja aberto.","pleaseAccept":"por favor, aceite em seu dispositivo Ledger.","noRewards":"Sem recompensas"},"activities":{"single":"A","happened":"aconteceu.","senders":"O(s) seguinte(s) remetente(s)","sent":"enviado","receivers":"para o(s) seguinte(s) destinatário(s)","received":"recebido","failedTo":"falhou em","to":"para","from":"de","operatingAt":"operado por","withMoniker":"com o apelido","withTitle":"com o título","withA":"com"},"messageTypes":{"send":"Enviou","multiSend":"Envio múltiplo","createValidator":"Criar Validador","editValidator":"Editar Validador","delegate":"Delegar","undelegate":"Undelegar","redelegate":"Redelegar","submitProposal":"Enviar proposta","deposit":"Depósito","vote":"Vote","withdrawComission":"Retirar Comissão","withdrawReward":"Retirar Recompensa","modifyWithdrawAddress":"Modificar Endereço de Retirada","unjail":"Sair da jaula","IBCTransfer":"IBC transferido","IBCReceive":"IBC recebido"}});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"ru-RU.i18n.yml.js":function module(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// both/i18n/ru-RU.i18n.yml.js                                                                                         //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Package['universe:i18n'].i18n.addTranslations('ru-RU','',{"common":{"height":"Высота Блока","voter":"Избиратель","votingPower":"Право Голоса","addresses":"Адреса","amounts":"Суммы","delegators":"Делегаторы","block":"Блок","blocks":"Блоки","precommit":"Прекоммит","precommits":"Прекоммиты","last":"Последний","backToList":"Назад к списку","information":"Информация","time":"Время","hash":"Хэш","more":"Дальше","fullStop":".","searchPlaceholder":"Поиск по хэшу сделки / высоте блока / адресу","cancel":"Отмена","retry":"Повторить попытку","rewards":"Награды","bondedTokens":"Bonded Tokens","totalNumOfDelegations":"Всего Делегирований","signIn":"Войти","generatingAddresses":"Генерация адресов","selectAddress":"Выберите адрес, с которым хотите авторизоваться, из списка ниже:","defaultAddressMessage":"Ваш адрес по умолчанию это счет 0.","back":"Назад","next":"Вперед","txOutOfGasMessage":"Транзакция не осуществлена: недостаточный баланс. Убедитесь, что вашего баланса достаточно, чтобы покрыть комиссию.","estimatedGasPrice":"Примерная цена газа <b>{$gasPrice}</b>."},"navbar":{"siteName":"BIG DIPPER","version":"-","validators":"Валидаторы","blocks":"Блоки","transactions":"Транзакции","proposals":"Предложения","votingPower":"Право голоса","lang":"RU","english":"English","spanish":"Español","italian":"Italiano","polish":"Polski","russian":"Русский","chinese":"中文（繁）","simChinese":"中文（简）","portuguese":"Português","license":"ЛИЦЕНЗИЯ","forkMe":"Форк!'"},"consensus":{"consensusState":"Состояние консенсуса","round":"Раунд","step":"Этап"},"chainStates":{"price":"Цена","marketCap":"Рыночная капитализация","inflation":"Инфляция","communityPool":"Коммьюнити пул"},"chainStatus":{"startMessage":"Чейн будет запущен в","stopWarning":"Чейн не запущен уже <em>{$time}</em>! Накорми меня новыми блоками 😭!","latestHeight":"Последняя Высота Блока","averageBlockTime":"Среднее Время Блока","all":"Всё","now":"Сейчас","allTime":"За Все Время","lastMinute":"За Последнюю Минуту","lastHour":"За Последний Час","lastDay":"За Последний День","seconds":"секунды","activeValidators":"Активные валидаторы","outOfValidators":"из {$totalValidators} валидаторов","onlineVotingPower":"Онлайн Право Голоса","fromTotalStakes":"{$percent} из {$totalStakes} {$denomPlural}"},"analytics":{"blockTimeHistory":"История Времени Блока","averageBlockTime":"Среднее Время Блока","blockInterval":"Интервал Блока","noOfValidators":"Количество валидаторов"},"validators":{"randomValidators":"Случайные Валидаторы","moniker":"Название","uptime":"Аптайм","selfPercentage":"% самоделегирования","commission":"Комиссия","lastSeen":"Последний раз был онлайн","status":"Статус","jailed":"Jailed","navActive":"Активный","navInactive":"Неактивный","active":"Активные Валидаторы","inactive":"Неактивные Валидаторы","listOfActive":"Вот список активных валидаторов.","listOfInactive":"Вот список неактивных валидаторов.","validatorDetails":"Детали Валидатора","lastNumBlocks":"Последние {$numBlocks} блоков","validatorInfo":"Информация О Валидаторе","operatorAddress":"Адрес Оператора","selfDelegationAddress":"Адрес Самоделегирования","commissionRate":"Ставка Комиссии","maxRate":"Максимальная Ставка","maxChangeRate":"Максимальная Ставка Изменения","selfDelegationRatio":"Коэффициент Самоделегирования","proposerPriority":"Приоритет предложения","delegatorShares":"Доли делегатора","userDelegateShares":"Доли, делегированные вами","tokens":"Токены","unbondingHeight":"Высота Un-Бондинг","unbondingTime":"Время Un-Бондинг","jailedUntil":"Jailed До","powerChange":"Изменение власти","delegations":"Делегации","transactions":"Транзакции","validatorNotExists":"Валидатора не существует.","backToValidator":"Назад К Валидатору","missedBlocks":"Пропущенные Блоки","missedPrecommits":"Пропущенные Прекоммиты","missedBlocksTitle":"Пропущенные блоки {$moniker}","totalMissed":"Всего пропущено","block":"Блок","missedCount":"Пропущено","iDontMiss":"Я не пропускаю","lastSyncTime":"Последнее время синхронизации","delegator":"Делегатор","amount":"Сумма"},"blocks":{"block":"Блок","proposer":"Предложение","latestBlocks":"Последние блоки","noBlock":"Нет блока.","numOfTxs":"Количество транзакций","numOfTransactions":"Количество транзакций","notFound":"Такого блока не найдено."},"transactions":{"transaction":"Транзакция","transactions":"Транзакции","notFound":"Транзакция не найдена.","activities":"Активность","txHash":"Хэш транзакции","valid":"Действительна","fee":"Комиссия","noFee":"Без комиссии","gasUsedWanted":"Газ (использовано / хотелось)","noTxFound":"Транзакция не найдена","noValidatorTxsFound":"Транзакция, связанная с этом валидатором, не найдена.","memo":"Комментарий","transfer":"Передача","staking":"Стейкать","distribution":"Распределение","governance":"Управление","slashing":"Slashing"},"proposals":{"notFound":"Предложение не найдено.","listOfProposals":"Список предложений по управлению","proposer":"Предлагающий","proposal":"Предложение","proposals":"Предложения","proposalID":"ID предложения","title":"Название","status":"Статус","submitTime":"Время Отправки","depositEndTime":"Время Окончания Депозита","votingStartTime":"Время Начала Голосования","votingEndTime":"Время Окончания Голосования","totalDeposit":"Общий депозит","description":"Описание","proposalType":"Тип Предложения","proposalStatus":"Статус Предложения","notStarted":"не начался","final":"окончено","deposit":"Депозит","tallyResult":"Итог Подсчета","yes":"За","abstain":"Воздержался","no":"Против","noWithVeto":"Против с правом Вето","percentageVoted":"<span class=\"text-info\">{$percent}</span> от всех голосов онлайн проголосовало.","validMessage":"Это предложение {$tentative}<strong>действительное</strong>.","invalidMessage":"Меньше чем {$quorum} голосующих проголосовало. Это предложение <strong>недействительное</strong>.","moreVoteMessage":"Предложение будет действительным, если еще <span class=\"text-info\">{$moreVotes}</span> голосующих отдадут свой голос.","key":"Ключ","value":"Значение","amount":"Сумма","recipient":"Получатель","changes":"Изменения","subspace":"Подмножество"},"votingPower":{"distribution":"Распределение Количества Голосов","pareto":"Принцип Парето (правило 20/80)","minValidators34":"Минимальное количество валидаторов c 34%+ количеством голосов"},"accounts":{"accountDetails":"Детали счета","available":"Доступно","delegated":"Заделегировано","unbonding":"Un-Бондинг","rewards":"Награды","total":"Всего","notFound":"Такого счета не существует. Вы ищете неправильный адрес?","validators":"Валидаторы","shares":"Доли","mature":"Зрелые","no":"Нет","none":"Нет","delegation":"Делегация","plural":"","signOut":"Выйти","signInText":"Вы вошли как","toLoginAs":"Войти как","signInWithLedger":"Войти, используя Ledger","signInWarning":"Пожалуйста, убедитесь, что устройство Ledger подключено и <strong class=\"text-primary\">{$network} App {$version} или выше </strong> открыто.","pleaseAccept":"пожалуйста, примите в своем Ledger устройстве.","noRewards":"Нет Наград","BLESupport":"Bluetooth-соединение пока что поддерживается только в браузере Google Chrome."},"activities":{"single":" ","happened":"произошло.","senders":"Этот отправитель(и)","sent":"отправил","receivers":"этому получателю(ям)","received":"получил","failedTo":"не удалось","to":"к","from":"из'","operatingAt":"работающих на","withMoniker":"с названием","withTitle":"с названием","withA":"с","withAmount":"с <span class=\"text-info\">{$amount}</span>"},"messageTypes":{"send":"Отправить","multiSend":"Отправить Нескольким","createValidator":"Создать Валидатора","editValidator":"Редактировать Валидатора","delegate":"Делегировать","undelegate":"Разделегировать","redelegate":"Ре-делегировать","submitProposal":"Отправить Предложение","deposit":"Депозит","vote":"Голосовать","withdrawComission":"Вывести Комиссии","withdrawReward":"Вывести Награду","modifyWithdrawAddress":"Изменить Адрес Вывода","unjail":"Un-Джейл","IBCTransfer":"IBC Трансфер","IBCReceive":"IBC Получение"}});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"zh-hans.i18n.yml.js":function module(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// both/i18n/zh-hans.i18n.yml.js                                                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Package['universe:i18n'].i18n.addTranslations('zh-Hans','',{"common":{"height":"高度","voter":"投票人","votingPower":"投票权","addresses":"地址","amounts":"数量","delegators":"委托人","block":"区块","blocks":"区块","precommit":"建块前保证","precommits":"建块前保证","last":"最后","backToList":"回到列表","information":"资讯","time":"时间","hash":"哈希","more":"更多","fullStop":"。","searchPlaceholder":"搜寻交易哈希 / 区块高度 / 地址","cancel":"取消","retry":"重试","bondedTokens":"受委托量"},"navbar":{"siteName":"北斗","validators":"验证人","blocks":"区块","transactions":"交易","proposals":"治理提案","votingPower":"投票权分布","lang":"中文（简）","english":"English","spanish":"Español","italian":"Italiano","polish":"Polski","russian":"Русский","chinese":"中文（繁）","simChinese":"中文（简）","portuguese":"Português","license":"LICENSE","forkMe":"Fork me!"},"consensus":{"consensusState":"共识状态","round":"轮数","step":"阶数"},"chainStates":{"price":"价格","marketCap":"市值","inflation":"通胀率","communityPool":"社区储备"},"chainStatus":{"startMessage":"这链将还有以下时间便会开始","stopWarning":"这链似乎已经停了 <em>{$time}</em>！ 请继续喂我吃新的区块 😭!","latestHeight":"最新区块高度","averageBlockTime":"平均区块时间","all":"全部","now":"现在","allTime":"全部","lastMinute":"前一分钟","lastHour":"前一小时","lastDay":"前一天","seconds":"秒","activeValidators":"有效验证人","outOfValidators":"来自总共 {$totalValidators} 个验证人","onlineVotingPower":"在线投票权","fromTotalStakes":"为 {$totalStakes} 颗 {$denom} 的 {$percent}"},"analytics":{"blockTimeHistory":"在线投票权","averageBlockTime":"Average Block Time","blockInterval":"Block Interval","noOfValidators":"No. of Validators"},"validators":{"randomValidators":"随机验证人","moniker":"验证人代号","uptime":"上线时间比重","selfPercentage":"自我委托%","commission":"佣金","lastSeen":"最后投票时间","status":"状态","jailed":"被禁制","navActive":"有效","navInactive":"无效","active":"有效验证人","inactive":"无效验证人","listOfActive":"这名单显示所有有效验证人","listOfInactive":"这名单显示所有无效验证人","validatorDetails":"验证人详情","lastNumBlocks":"最后 {$numBlocks} 个区块","validatorInfo":"验证人资讯","operatorAddress":"操作地址","selfDelegationAddress":"自我委托地址","commissionRate":"佣金","maxRate":"最大佣金限制","maxChangeRate":"每天最大佣金变化限制","selfDelegationRatio":"自我委托比例","proposerPriority":"建块优先权","delegatorShares":"委托股数","userDelegateShares":"你委托的股数","tokens":"代币数量","unbondingHeight":"解绑高度","unbondingTime":"解绑时间","jailedUntil":"被禁制至","powerChange":"投票权变更","delegations":"委托","transactions":"交易","validatorNotExists":"验证人不存在。","backToValidator":"回到验证人页面","missedBlocks":"错过了的区块","missedPrecommits":"遗留了的建块前保证","missedBlocksTitle":"错过了 {$moniker} 的区块","totalMissed":"一共错过了","block":"区块","missedCount":"错过数量","iDontMiss":"我不会错过任何一个","lastSyncTime":"上一次同步时间","delegator":"委托人","amount":"数量"},"blocks":{"proposer":"建块人","block":"区块","latestBlocks":"最近区块","noBlock":"没有区块。","numOfTxs":"交易数量","numOfTransactions":"交易数量","notFound":"没有这个区块。"},"transactions":{"transaction":"交易","transactions":"交易","notFound":"沒有交易。","activities":"活动","txHash":"交易哈希","valid":"有效","fee":"费用","noFee":"No fee","gasUsedWanted":"瓦斯 (已用 / 要求)","noTxFound":"没有这笔交易。","noValidatorTxsFound":"没有跟这个验证人有关的交易","memo":"备忘录","transfer":"代币转移","staking":"委托","distribution":"收益分配","governance":"链上治理","slashing":"削减"},"proposals":{"notFound":"没有治理提案","listOfProposals":"这名单显示所有治理提案","proposer":"提案人","proposal":"治理提案","proposals":"治理提案","proposalID":"提案编号","title":"主题","status":"状态","submitTime":"提案时间","depositEndTime":"存入押金","votingStartTime":"投票开始时间","votingEndTime":"投票结束时间","totalDeposit":"押金总额","description":"详细内容","proposalType":"提案类型","proposalStatus":"提案状态","notStarted":"未开始","final":"最后结果","deposit":"押金","tallyResult":"投票结果","yes":"赞成","abstain":"弃权","no":"反对","noWithVeto":"强烈反对","percentageVoted":"现时在线投票权的投票率是 <span class=\"text-info\">{$percent}</span>。","validMessage":"这个提案 {$tentative} <strong>有效</strong>.","invalidMessage":"已投票的在线投票权少于 {$quorum}。这个提案 <strong>無效</strong>。","moreVoteMessage":"当再有多 <span class=\"text-info\">{$moreVotes}</span> 投票权投了票的话，这个提案将会有效。","key":"Key","value":"Value","amount":"Amount","recipient":"Recipient","changes":"Changes","subspace":"Subspace"},"votingPower":{"distribution":"投票权分布","pareto":"帕累托原则 (20/80 定率)","minValidators34":"最少合共有超过 34% 投票权的验证人"},"accounts":{"accountDetails":"帐户详情","available":"可用的","delegated":"委托中","unbonding":"解绑中","rewards":"未取回收益","total":"总共","notFound":"这个帐户不存在。你是否在查看一个错误的地址？","validators":"验证人","shares":"股数","mature":"成熟日期","no":"没有","none":"没有","delegation":"委托","plural":"","signOut":"登出","signInText":"你已登录以下帐户","toLoginAs":"登录以下帐户","signInWithLedger":"透过 Ledger 登录","signInWarning":"请确定你已经连接 Ledger 设备，并已开启 <strong class=\"text-primary\">Cosmos App 版本 1.5.0 或以上</strong>。","pleaseAccept":"请从你的 Ledger 设备确认。","noRewards":"No Rewards"},"activities":{"single":"一个","happened":"发生了","senders":"以下的帐户","sent":"发了","receivers":"到以下的帐户","received":"收到","failedTo":"未能","to":"到","from":"从","operatingAt":"操作地址为","withMoniker":"而验证人代号为","withTitle":"治理提案主题为","withA":"投了"},"messageTypes":{"send":"发送","multiSend":"多重发送","createValidator":"建立验证人","editValidator":"编辑验证人资料","delegate":"委托","undelegate":"解委托","redelegate":"转委托","submitProposal":"提交议案","deposit":"存入","vote":"投票","withdrawComission":"提取手续费","withdrawReward":"提取收益","modifyWithdrawAddress":"更改收益取回地址","unjail":"赦免","IBCTransfer":"IBC Transfer","IBCReceive":"IBC Receive"}});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"zh-hant.i18n.yml.js":function module(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// both/i18n/zh-hant.i18n.yml.js                                                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
Package['universe:i18n'].i18n.addTranslations('zh-Hant','',{"common":{"height":"高度","voter":"投票人","votingPower":"投票權","addresses":"地址","amounts":"數量","delegators":"委托人","block":"區塊","blocks":"區塊","precommit":"建塊前保證","precommits":"建塊前保證","last":"最後","backToList":"回到列表","information":"資訊","time":"時間","hash":"哈希","more":"更多","fullStop":"。","searchPlaceholder":"搜尋交易哈希 / 區塊高度 / 地址","cancel":"取消","retry":"重試","bondedTokens":"受委托量"},"navbar":{"siteName":"北斗","validators":"驗證人","blocks":"區塊","transactions":"交易","proposals":"治理提案","votingPower":"投票權分佈","lang":"中文（繁）","english":"English","spanish":"Español","italian":"Italiano","polish":"Polski","russian":"Русский","chinese":"中文（繁）","simChinese":"中文（简）","portuguese":"Português","license":"LICENSE","forkMe":"Fork me!"},"consensus":{"consensusState":"共識狀態","round":"輪數","step":"階數"},"chainStates":{"price":"價格","marketCap":"市值","inflation":"通漲率","communityPool":"社區儲備"},"chainStatus":{"startMessage":"這鏈將還有以下時間便會開始","stopWarning":"這鏈似乎已經停了 <em>{$time}</em>！ 請繼續餵我吃新的區塊 😭!","latestHeight":"最新區塊高度","averageBlockTime":"平均區塊時間","all":"全部","now":"現在","allTime":"全部","lastMinute":"前一分鐘","lastHour":"前一小時","lastDay":"前一天","seconds":"秒","activeValidators":"有效驗證人","outOfValidators":"來自總共 {$totalValidators} 個驗證人","onlineVotingPower":"在線投票權","fromTotalStakes":"為 {$totalStakes} 顆 {$denom} 的 {$percent}"},"analytics":{"blockTimeHistory":"在線投票權","averageBlockTime":"Average Block Time","blockInterval":"Block Interval","noOfValidators":"No. of Validators"},"validators":{"randomValidators":"隨機驗證人","moniker":"驗證人代號","uptime":"上線時間比重","selfPercentage":"自我委托%","commission":"佣金","lastSeen":"最後投票時間","status":"狀態","jailed":"被禁制","navActive":"有效","navInactive":"無效","active":"有效驗證人","inactive":"無效驗證人","listOfActive":"這名單顯示所有有效驗證人","listOfInactive":"這名單顯示所有無效驗證人","validatorDetails":"驗證人詳情","lastNumBlocks":"最後 {$numBlocks} 個區塊","validatorInfo":"驗證人資訊","operatorAddress":"操作地址","selfDelegationAddress":"自我委托地址","commissionRate":"佣金","maxRate":"最大佣金限制","maxChangeRate":"每天最大佣金變化限制","selfDelegationRatio":"自我委托比列","proposerPriority":"建塊優先權","delegatorShares":"委托股數","userDelegateShares":"你委托的股數","tokens":"代幣數量","unbondingHeight":"解綁高度","unbondingTime":"解綁時間","jailedUntil":"被禁制至","powerChange":"投票權變更","delegations":"委托","transactions":"交易","validatorNotExists":"驗證人不存在。","backToValidator":"回到驗證人頁面","missedBlocks":"錯過了的區塊","missedPrecommits":"遺留了的建塊前保證","missedBlocksTitle":"錯過了 {$moniker} 的區塊","totalMissed":"一共錯過了","block":"區塊","missedCount":"錯過數量","iDontMiss":"我不會錯過任何一個","lastSyncTime":"上一次同步時間","delegator":"委托人","amount":"數量"},"blocks":{"proposer":"建塊人","block":"區塊","latestBlocks":"最近區塊","noBlock":"沒有區塊。","numOfTxs":"交易數量","numOfTransactions":"交易數量","notFound":"沒有這個區塊。"},"transactions":{"transaction":"交易","transactions":"交易","notFound":"沒有交易。","activities":"活動","txHash":"交易哈希","valid":"有效","fee":"費用","noFee":"No fee","gasUsedWanted":"瓦斯 (已用 / 要求)","noTxFound":"沒有這筆交易。","noValidatorTxsFound":"沒有跟這個驗證人有關的交易","memo":"備忘錄","transfer":"代幣轉移","staking":"委托","distribution":"收益分配","governance":"鏈上治理","slashing":"削減"},"proposals":{"notFound":"沒有治理提案","listOfProposals":"這名單顯示所有治理提案","proposer":"提案人","proposal":"治理提案","proposals":"治理提案","proposalID":"提案編號","title":"主題","status":"狀態","submitTime":"提案時間","depositEndTime":"存入押金","votingStartTime":"投票開始時間","votingEndTime":"投票結束時間","totalDeposit":"押金總額","description":"詳細內容","proposalType":"提案類型","proposalStatus":"提案狀態","notStarted":"未開始","final":"最後結果","deposit":"押金","tallyResult":"投票結果","yes":"贊成","abstain":"棄權","no":"反對","none":"反對","noWithVeto":"強烈反對","percentageVoted":"現時在線投票權的投票率是 <span class=\"text-info\">{$percent}</span>。","validMessage":"這個提案 {$tentative} <strong>有效</strong>.","invalidMessage":"已投票的在線投票權少於 {$quorum}。這個 <strong>無效</strong>。","moreVoteMessage":"當再有多 <span class=\"text-info\">{$moreVotes}</span> 投票權投了票的話，這個提案將會有效。","key":"Key","value":"Value","amount":"Amount","recipient":"Recipient","changes":"Changes","subspace":"Subspace"},"votingPower":{"distribution":"投票權分佈","pareto":"帕累托原則 (20/80 定率)","minValidators34":"最少合共有超過 34% 投票權的驗證人"},"accounts":{"accountDetails":"帳戶詳情","available":"可用的","delegated":"委托中","unbonding":"解綁中","rewards":"未取回收益","total":"總共","notFound":"這個帳戶不存在。你是否在查看一個錯誤的地址？","validators":"驗證人","shares":"股數","mature":"成熟日期","no":"沒有","delegation":"委托","plural":"","signOut":"登出","signInText":"你已登入以下帳戶","toLoginAs":"登入以下帳戶","signInWithLedger":"透過 Ledger 登入","signInWarning":"請確定你已經連接 Ledger 設備，並已開啓 <strong class=\"text-primary\">Cosmos App 版本 1.5.0 或以上</strong>。","pleaseAccept":"請從你的 Ledger 設備確認。","noRewards":"No Rewards"},"activities":{"single":"一個","happened":"發生了","senders":"以下的帳戶","sent":"發了","receivers":"到以下的帳戶","received":"收到","failedTo":"未能","to":"到","from":"從","operatingAt":"操作地止為","withMoniker":"而驗證人代號為","withTitle":"治理提案主題為","withA":"投了"},"messageTypes":{"send":"發送","multiSend":"多重發送","createValidator":"建立驗證人","editValidator":"編輯驗證人資料","delegate":"委托","undelegate":"解委托","redelegate":"轉委托","submitProposal":"提交議案","deposit":"存入","vote":"投票","withdrawComission":"提取手續費","withdrawReward":"提取收益","modifyWithdrawAddress":"更改收益取回地址","unjail":"赦免","IBCTransfer":"IBC Transfer","IBCReceive":"IBC Receive"}});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"utils":{"coins.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// both/utils/coins.js                                                                                                 //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  default: () => Coin
});
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let numbro;
module.link("numbro", {
  default(v) {
    numbro = v;
  }

}, 1);

autoformat = value => {
  let formatter = '0,0.0000';
  value = Math.round(value * 1000) / 1000;
  if (Math.round(value) === value) formatter = '0,0';else if (Math.round(value * 10) === value * 10) formatter = '0,0.0';else if (Math.round(value * 100) === value * 100) formatter = '0,0.00';else if (Math.round(value * 1000) === value * 1000) formatter = '0,0.000';
  return numbro(value).format(formatter);
};

const coinList = Meteor.settings.public.coins;

class Coin {
  constructor(amount) {
    let denom = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : Meteor.settings.public.bondDenom;
    const lowerDenom = denom.toLowerCase();
    this._coin = coinList.find(coin => coin.denom.toLowerCase() === lowerDenom || coin.displayName.toLowerCase() === lowerDenom);

    if (this._coin) {
      if (lowerDenom === this._coin.denom.toLowerCase()) {
        this._amount = Number(amount);
      } else if (lowerDenom === this._coin.displayName.toLowerCase()) {
        this._amount = Number(amount) * this._coin.fraction;
      }
    } else {
      this._coin = "";
      this._amount = Number(amount);
    }
  }

  get amount() {
    return this._amount;
  }

  get stakingAmount() {
    return this._coin ? this._amount / this._coin.fraction : this._amount;
  }

  toString(precision) {
    // default to display in mint denom if it has more than 4 decimal places
    let minStake = Coin.StakingCoin.fraction / (precision ? Math.pow(10, precision) : 10000);

    if (this.amount === 0) {
      return "0 ".concat(this._coin.displayName);
    } else if (this.amount < minStake) {
      return "".concat(numbro(this.amount).format('0,0.000000'), " ").concat(this._coin.denom);
    } else if (!this._coin.displayName) {
      var _this$stakingAmount;

      return "".concat((_this$stakingAmount = this.stakingAmount) !== null && _this$stakingAmount !== void 0 ? _this$stakingAmount : 0, " ").concat(Coin.StakingCoin.displayName);
    } else if (this.amount % 1 === 0) {
      return "".concat(this.stakingAmount, " ").concat(this._coin.displayName);
    } else {
      return "".concat(precision ? numbro(this.stakingAmount).format('0,0.' + '0'.repeat(precision)) : autoformat(this.stakingAmount), " ").concat(this._coin.displayName);
    }
  }

}

Coin.StakingCoin = coinList.find(coin => coin.denom === Meteor.settings.public.bondDenom);
Coin.MinStake = 1 / Number(Coin.StakingCoin.fraction);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"loader.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// both/utils/loader.js                                                                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let React;
module.link("react", {
  default(v) {
    React = v;
  }

}, 0);
let DisappearedLoading;
module.link("react-loadingg", {
  DisappearedLoading(v) {
    DisappearedLoading = v;
  }

}, 1);

const Loader = () => /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(DisappearedLoading, {
  color: "#bd081c",
  size: "sm"
}));

module.exportDefault(Loader);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"time.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// both/utils/time.js                                                                                                  //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  goTimeToISOString: () => goTimeToISOString
});

const goTimeToISOString = time => {
  const millisecond = parseInt(time.seconds + time.nanos.toString().substring(0, 3));
  return new Date(millisecond).toISOString();
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},"server":{"main.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// server/main.js                                                                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.link("/imports/startup/server");
module.link("/imports/startup/both");
// import moment from 'moment';
// import '/imports/api/blocks/blocks.js';
SYNCING = false;
TXSYNCING = false;
COUNTMISSEDBLOCKS = false;
COUNTMISSEDBLOCKSSTATS = false;
RPC = Meteor.settings.remote.rpc;
API = Meteor.settings.remote.api;
timerBlocks = 0;
timerTransactions = 0;
timerChain = 0;
timerConsensus = 0;
timerProposal = 0;
timerProposalsResults = 0;
timerMissedBlock = 0;
timerDelegation = 0;
timerAggregate = 0;
timerFetchKeybase = 0;
const DEFAULTSETTINGS = '/default_settings.json';

updateChainStatus = () => {
  Meteor.call('chain.updateStatus', (error, result) => {
    if (error) {
      console.log("updateStatus: %o", error);
    } else {
      console.log("updateStatus: %o", result);
    }
  });
};

updateBlock = () => {
  Meteor.call('blocks.blocksUpdate', (error, result) => {
    if (error) {
      console.log("updateBlocks: %o", error);
    } else {
      console.log("updateBlocks: %o", result);
    }
  });
};

updateTransactions = () => {
  Meteor.call('Transactions.updateTransactions', (error, result) => {
    if (error) {
      console.log("updateTransactions: %o", error);
    } else {
      console.log("updateTransactions: %o", result);
    }
  });
};

getConsensusState = () => {
  Meteor.call('chain.getConsensusState', (error, result) => {
    if (error) {
      console.log("get consensus: %o", error);
    }
  });
};

getProposals = () => {
  Meteor.call('proposals.getProposals', (error, result) => {
    if (error) {
      console.log("get proposal: %o", error);
    }

    if (result) {
      console.log("get proposal: %o", result);
    }
  });
};

getProposalsResults = () => {
  Meteor.call('proposals.getProposalResults', (error, result) => {
    if (error) {
      console.log("get proposals result: %o", error);
    }

    if (result) {
      console.log("get proposals result: %o", result);
    }
  });
};

updateMissedBlocks = () => {
  Meteor.call('ValidatorRecords.calculateMissedBlocks', (error, result) => {
    if (error) {
      console.log("missed blocks error: %o", error);
    }

    if (result) {
      console.log("missed blocks ok: %o", result);
    }
  });
};

fetchKeybase = () => {
  Meteor.call('Validators.fetchKeybase', (error, result) => {
    if (error) {
      console.log("Error when fetching Keybase" + error);
    }

    if (result) {
      console.log("Keybase profile_url updated ", result);
    }
  });
};

getDelegations = () => {
  Meteor.call('delegations.getDelegations', (error, result) => {
    if (error) {
      console.log("get delegations error: %o", error);
    } else {
      console.log("get delegations ok: %o", result);
    }
  });
};

aggregateMinutely = () => {
  // doing something every min
  Meteor.call('Analytics.aggregateBlockTimeAndVotingPower', "m", (error, result) => {
    if (error) {
      console.log("aggregate minutely block time error: %o", error);
    } else {
      console.log("aggregate minutely block time ok: %o", result);
    }
  });
  Meteor.call('coinStats.getCoinStats', (error, result) => {
    if (error) {
      console.log("get coin stats error: %o", error);
    } else {
      console.log("get coin stats ok: %o", result);
    }
  });
};

aggregateHourly = () => {
  // doing something every hour
  Meteor.call('Analytics.aggregateBlockTimeAndVotingPower', "h", (error, result) => {
    if (error) {
      console.log("aggregate hourly block time error: %o", error);
    } else {
      console.log("aggregate hourly block time ok: %o", result);
    }
  });
};

aggregateDaily = () => {
  // doing somthing every day
  Meteor.call('Analytics.aggregateBlockTimeAndVotingPower', "d", (error, result) => {
    if (error) {
      console.log("aggregate daily block time error: %o", error);
    } else {
      console.log("aggregate daily block time ok: %o", result);
    }
  });
  Meteor.call('Analytics.aggregateValidatorDailyBlockTime', (error, result) => {
    if (error) {
      console.log("aggregate validators block time error: %o", error);
    } else {
      console.log("aggregate validators block time ok: %o", result);
    }
  });
};

Meteor.startup(function () {
  return Promise.asyncApply(() => {
    if (Meteor.isDevelopment) {
      let DEFAULTSETTINGSJSON;
      module.link("../default_settings.json", {
        default(v) {
          DEFAULTSETTINGSJSON = v;
        }

      }, 0);
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;
      Object.keys(DEFAULTSETTINGSJSON).forEach(key => {
        if (Meteor.settings[key] == undefined) {
          console.warn("CHECK SETTINGS JSON: ".concat(key, " is missing from settings"));
          Meteor.settings[key] = {};
        }

        Object.keys(DEFAULTSETTINGSJSON[key]).forEach(param => {
          if (Meteor.settings[key][param] == undefined) {
            console.warn("CHECK SETTINGS JSON: ".concat(key, ".").concat(param, " is missing from settings"));
            Meteor.settings[key][param] = DEFAULTSETTINGSJSON[key][param];
          }
        });
      });
    }

    if (Meteor.settings.debug.startTimer) {
      timerConsensus = Meteor.setInterval(function () {
        getConsensusState();
      }, Meteor.settings.params.consensusInterval);
      timerBlocks = Meteor.setInterval(function () {
        updateBlock();
      }, Meteor.settings.params.blockInterval);
      timerTransactions = Meteor.setInterval(function () {
        updateTransactions();
      }, Meteor.settings.params.transactionsInterval);
      timerChain = Meteor.setInterval(function () {
        updateChainStatus();
      }, Meteor.settings.params.statusInterval);

      if (Meteor.settings.public.modules.gov) {
        timerProposal = Meteor.setInterval(function () {
          getProposals();
        }, Meteor.settings.params.proposalInterval);
        timerProposalsResults = Meteor.setInterval(function () {
          getProposalsResults();
        }, Meteor.settings.params.proposalInterval);
      }

      timerMissedBlock = Meteor.setInterval(function () {
        updateMissedBlocks();
      }, Meteor.settings.params.missedBlocksInterval);
      timerFetchKeybase = Meteor.setInterval(function () {
        fetchKeybase();
      }, Meteor.settings.params.keybaseFetchingInterval); // timerDelegation = Meteor.setInterval(function(){
      //     getDelegations();
      // }, Meteor.settings.params.delegationInterval);

      timerAggregate = Meteor.setInterval(function () {
        let now = new Date();

        if (now.getUTCSeconds() == 0) {
          aggregateMinutely();
        }

        if (now.getUTCMinutes() == 0 && now.getUTCSeconds() == 0) {
          aggregateHourly();
        }

        if (now.getUTCHours() == 0 && now.getUTCMinutes() == 0 && now.getUTCSeconds() == 0) {
          aggregateDaily();
        }
      }, 1000);
    }
  });
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"default_settings.json":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// default_settings.json                                                                                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.exports = {
  "public": {
    "chainName": "Cosmos",
    "chainId": "{Chain ID}",
    "gtm": "{Add your Google Tag Manager ID here}",
    "slashingWindow": 10000,
    "uptimeWindow": 250,
    "initialPageSize": 30,
    "secp256k1": false,
    "bech32PrefixAccAddr": "cosmos",
    "bech32PrefixAccPub": "cosmospub",
    "bech32PrefixValAddr": "cosmosvaloper",
    "bech32PrefixValPub": "cosmosvaloperpub",
    "bech32PrefixConsAddr": "cosmosvalcons",
    "bech32PrefixConsPub": "cosmosvalconspub",
    "bondDenom": "uatom",
    "powerReduction": 1000000,
    "coins": [
      {
        "denom": "uatom",
        "displayName": "ATOM",
        "fraction": 1000000
      },
      {
        "denom": "umuon",
        "displayName": "MUON",
        "fraction": 1000000
      }
    ],
    "ledger": {
      "coinType": 118,
      "appName": "Cosmos",
      "appVersion": "2.16.0",
      "gasPrice": 0.02
    },
    "modules": {
      "bank": true,
      "supply": true,
      "minting": false,
      "gov": true,
      "distribution": false
    },
    "coingeckoId": "cosmos",
    "networks": "https://gist.githubusercontent.com/kwunyeung/8be4598c77c61e497dfc7220a678b3ee/raw/bd-networks.json",
    "banners": false
  },
  "remote": {
    "rpc": "https://rpc.stargate.forbole.com:443",
    "api": "https://api.stargate.forbole.com:443"
  },
  "debug": {
    "startTimer": true
  },
  "params": {
    "startHeight": 0,
    "defaultBlockTime": 5000,
    "validatorUpdateWindow": 300,
    "blockInterval": 15000,
    "transactionsInterval": 18000,
    "keybaseFetchingInterval": 18000000,
    "consensusInterval": 1000,
    "statusInterval": 7500,
    "signingInfoInterval": 1800000,
    "proposalInterval": 5000,
    "missedBlocksInterval": 60000,
    "delegationInterval": 900000
  }
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},{
  "extensions": [
    ".js",
    ".json",
    ".mjs",
    ".jsx",
    ".i18n.yml"
  ]
});

require("/both/i18n/en-us.i18n.yml.js");
require("/both/i18n/es-es.i18n.yml.js");
require("/both/i18n/it-IT.i18n.yml.js");
require("/both/i18n/pl-PL.i18n.yml.js");
require("/both/i18n/pt-BR.i18n.yml.js");
require("/both/i18n/ru-RU.i18n.yml.js");
require("/both/i18n/zh-hans.i18n.yml.js");
require("/both/i18n/zh-hant.i18n.yml.js");
require("/both/utils/coins.js");
require("/both/utils/loader.js");
require("/both/utils/time.js");
require("/server/main.js");
//# sourceURL=meteor://💻app/app/app.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvaW1wb3J0cy9hcGkvYWNjb3VudHMvc2VydmVyL21ldGhvZHMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL2ltcG9ydHMvYXBpL2Jsb2Nrcy9zZXJ2ZXIvbWV0aG9kcy5qcyIsIm1ldGVvcjovL/CfkrthcHAvaW1wb3J0cy9hcGkvYmxvY2tzL3NlcnZlci9wdWJsaWNhdGlvbnMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL2ltcG9ydHMvYXBpL2Jsb2Nrcy9ibG9ja3MuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL2ltcG9ydHMvYXBpL2NoYWluL3NlcnZlci9tZXRob2RzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9pbXBvcnRzL2FwaS9jaGFpbi9zZXJ2ZXIvcHVibGljYXRpb25zLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9pbXBvcnRzL2FwaS9jaGFpbi9jaGFpbi5qcyIsIm1ldGVvcjovL/CfkrthcHAvaW1wb3J0cy9hcGkvY29pbi1zdGF0cy9zZXJ2ZXIvbWV0aG9kcy5qcyIsIm1ldGVvcjovL/CfkrthcHAvaW1wb3J0cy9hcGkvY29pbi1zdGF0cy9jb2luLXN0YXRzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9pbXBvcnRzL2FwaS9kZWxlZ2F0aW9ucy9zZXJ2ZXIvbWV0aG9kcy5qcyIsIm1ldGVvcjovL/CfkrthcHAvaW1wb3J0cy9hcGkvZGVsZWdhdGlvbnMvZGVsZWdhdGlvbnMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL2ltcG9ydHMvYXBpL2xlZGdlci9zZXJ2ZXIvbWV0aG9kcy5qcyIsIm1ldGVvcjovL/CfkrthcHAvaW1wb3J0cy9hcGkvcHJvcG9zYWxzL3NlcnZlci9tZXRob2RzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9pbXBvcnRzL2FwaS9wcm9wb3NhbHMvc2VydmVyL3B1YmxpY2F0aW9ucy5qcyIsIm1ldGVvcjovL/CfkrthcHAvaW1wb3J0cy9hcGkvcHJvcG9zYWxzL3Byb3Bvc2Fscy5qcyIsIm1ldGVvcjovL/CfkrthcHAvaW1wb3J0cy9hcGkvcmVjb3Jkcy9zZXJ2ZXIvbWV0aG9kcy5qcyIsIm1ldGVvcjovL/CfkrthcHAvaW1wb3J0cy9hcGkvcmVjb3Jkcy9zZXJ2ZXIvcHVibGljYXRpb25zLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9pbXBvcnRzL2FwaS9yZWNvcmRzL3JlY29yZHMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL2ltcG9ydHMvYXBpL3N0YXR1cy9zZXJ2ZXIvcHVibGljYXRpb25zLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9pbXBvcnRzL2FwaS9zdGF0dXMvc3RhdHVzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9pbXBvcnRzL2FwaS90cmFuc2FjdGlvbnMvc2VydmVyL21ldGhvZHMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL2ltcG9ydHMvYXBpL3RyYW5zYWN0aW9ucy9zZXJ2ZXIvcHVibGljYXRpb25zLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9pbXBvcnRzL2FwaS90cmFuc2FjdGlvbnMvdHJhbnNhY3Rpb25zLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9pbXBvcnRzL2FwaS92YWxpZGF0b3JzL3NlcnZlci9tZXRob2RzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9pbXBvcnRzL2FwaS92YWxpZGF0b3JzL3NlcnZlci9wdWJsaWNhdGlvbnMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL2ltcG9ydHMvYXBpL3ZhbGlkYXRvcnMvdmFsaWRhdG9ycy5qcyIsIm1ldGVvcjovL/CfkrthcHAvaW1wb3J0cy9hcGkvdm90aW5nLXBvd2VyL2hpc3RvcnkuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL2ltcG9ydHMvYXBpL2V2aWRlbmNlcy9ldmlkZW5jZXMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL2ltcG9ydHMvYXBpL3ZhbGlkYXRvci1zZXRzL3ZhbGlkYXRvci1zZXRzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9pbXBvcnRzL3N0YXJ0dXAvYm90aC9pbmRleC5qcyIsIm1ldGVvcjovL/CfkrthcHAvaW1wb3J0cy9zdGFydHVwL3NlcnZlci9jcmVhdGUtaW5kZXhlcy5qcyIsIm1ldGVvcjovL/CfkrthcHAvaW1wb3J0cy9zdGFydHVwL3NlcnZlci9pbmRleC5qcyIsIm1ldGVvcjovL/CfkrthcHAvaW1wb3J0cy9zdGFydHVwL3NlcnZlci9yZWdpc3Rlci1hcGkuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL2ltcG9ydHMvc3RhcnR1cC9zZXJ2ZXIvdXRpbC5qcyIsIm1ldGVvcjovL/CfkrthcHAvaW1wb3J0cy91aS9jb21wb25lbnRzL0ljb25zLmpzeCIsIm1ldGVvcjovL/CfkrthcHAvYm90aC91dGlscy9jb2lucy5qcyIsIm1ldGVvcjovL/CfkrthcHAvYm90aC91dGlscy9sb2FkZXIuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL2JvdGgvdXRpbHMvdGltZS5qcyIsIm1ldGVvcjovL/CfkrthcHAvc2VydmVyL21haW4uanMiXSwibmFtZXMiOlsiTWV0ZW9yIiwibW9kdWxlIiwibGluayIsInYiLCJIVFRQIiwiVmFsaWRhdG9ycyIsImZldGNoRnJvbVVybCIsInVybCIsInJlcyIsImdldCIsIkFQSSIsInN0YXR1c0NvZGUiLCJlIiwiY29uc29sZSIsImxvZyIsIm1ldGhvZHMiLCJhZGRyZXNzIiwidW5ibG9jayIsImF2YWlsYWJsZSIsInJlc3BvbnNlIiwiSlNPTiIsInBhcnNlIiwiY29udGVudCIsInJlc3VsdCIsImFjY291bnQiLCJ0eXBlIiwidmFsdWUiLCJCYXNlVmVzdGluZ0FjY291bnQiLCJCYXNlQWNjb3VudCIsImJhbGFuY2VzIiwiY29pbnMiLCJhY2NvdW50X251bWJlciIsImJhbGFuY2UiLCJkZWxlZ2F0aW9ucyIsImRlbGVnYXRpb25fcmVzcG9uc2VzIiwidW5ib25kaW5nIiwidW5ib25kaW5nX3Jlc3BvbnNlcyIsInJld2FyZHMiLCJ0b3RhbF9yZXdhcmRzIiwidG90YWwiLCJ2YWxpZGF0b3IiLCJmaW5kT25lIiwiJG9yIiwib3BlcmF0b3JfYWRkcmVzcyIsImRlbGVnYXRvcl9hZGRyZXNzIiwib3BlcmF0b3JBZGRyZXNzIiwiY29tbWlzc2lvbiIsImxlbmd0aCIsImRhdGEiLCJkZWxlZ2F0aW9uX3Jlc3BvbnNlIiwiZGVsZWdhdGlvbiIsInNoYXJlcyIsInBhcnNlRmxvYXQiLCJyZWxlZ2F0aW9ucyIsInJlZGVsZWdhdGlvbl9yZXNwb25zZXMiLCJjb21wbGV0aW9uVGltZSIsImZvckVhY2giLCJyZWxlZ2F0aW9uIiwiZW50cmllcyIsInRpbWUiLCJEYXRlIiwiY29tcGxldGlvbl90aW1lIiwicmVkZWxlZ2F0aW9uQ29tcGxldGlvblRpbWUiLCJ1bmRlbGVnYXRpb25zIiwidW5ib25kaW5nQ29tcGxldGlvblRpbWUiLCJpIiwidW5ib25kaW5ncyIsInJlZGVsZWdhdGlvbnMiLCJyZWRlbGVnYXRpb24iLCJ2YWxpZGF0b3JfZHN0X2FkZHJlc3MiLCJjb3VudCIsInVzZXJSZWRlbGVnYXRpb25zIiwiZXhwb3J0IiwiZ2V0VmFsaWRhdG9yUHJvZmlsZVVybCIsIkJsb2Nrc2NvbiIsIkNoYWluIiwiVmFsaWRhdG9yU2V0cyIsIlZhbGlkYXRvclJlY29yZHMiLCJBbmFseXRpY3MiLCJWUERpc3RyaWJ1dGlvbnMiLCJWb3RpbmdQb3dlckhpc3RvcnkiLCJUcmFuc2FjdGlvbnMiLCJFdmlkZW5jZXMiLCJzaGEyNTYiLCJjaGVlcmlvIiwiZ2V0UmVtb3ZlZFZhbGlkYXRvcnMiLCJwcmV2VmFsaWRhdG9ycyIsInZhbGlkYXRvcnMiLCJwIiwic3BsaWNlIiwiZ2V0VmFsaWRhdG9yRnJvbUNvbnNlbnN1c0tleSIsImNvbnNlbnN1c0tleSIsInB1YmtleVR5cGUiLCJzZXR0aW5ncyIsInB1YmxpYyIsInNlY3AyNTZrMSIsInB1YmtleSIsImNhbGwiLCJwdWJfa2V5IiwiaWRlbnRpdHkiLCJ0aGVtIiwicGljdHVyZXMiLCJwcmltYXJ5Iiwic3RyaW5naWZ5IiwiaW5kZXhPZiIsInRlYW1QYWdlIiwicGFnZSIsImxvYWQiLCJhdHRyIiwiZ2V0VmFsaWRhdG9yVXB0aW1lIiwidmFsaWRhdG9yU2V0Iiwic2xhc2hpbmdQYXJhbXMiLCJ1cHNlcnQiLCJjaGFpbklkIiwiJHNldCIsImtleSIsImJlY2gzMlZhbENvbnNBZGRyZXNzIiwic2lnbmluZ0luZm8iLCJ2YWxfc2lnbmluZ19pbmZvIiwidmFsRGF0YSIsInRvbWJzdG9uZWQiLCJqYWlsZWRfdW50aWwiLCJpbmRleF9vZmZzZXQiLCJwYXJzZUludCIsInN0YXJ0X2hlaWdodCIsInVwdGltZSIsInBhcmFtcyIsInNpZ25lZF9ibG9ja3Nfd2luZG93IiwibWlzc2VkX2Jsb2Nrc19jb3VudGVyIiwiY2FsY3VsYXRlVlBEaXN0IiwiYW5hbHl0aWNzRGF0YSIsImJsb2NrRGF0YSIsImFjdGl2ZVZhbGlkYXRvcnMiLCJmaW5kIiwic3RhdHVzIiwiamFpbGVkIiwic29ydCIsInZvdGluZ19wb3dlciIsImZldGNoIiwibnVtVG9wVHdlbnR5IiwiTWF0aCIsImNlaWwiLCJudW1Cb3R0b21FaWdodHkiLCJ0b3BUd2VudHlQb3dlciIsImJvdHRvbUVpZ2h0eVBvd2VyIiwibnVtVG9wVGhpcnR5Rm91ciIsIm51bUJvdHRvbVNpeHR5U2l4IiwidG9wVGhpcnR5Rm91clBlcmNlbnQiLCJib3R0b21TaXh0eVNpeFBlcmNlbnQiLCJ2cERpc3QiLCJoZWlnaHQiLCJudW1WYWxpZGF0b3JzIiwidG90YWxWb3RpbmdQb3dlciIsImJsb2NrVGltZSIsImNyZWF0ZUF0IiwiaW5zZXJ0IiwiYmxvY2tzIiwicHJvcG9zZXJBZGRyZXNzIiwiaGVpZ2h0cyIsIm1hcCIsImJsb2NrIiwiYmxvY2tzU3RhdHMiLCIkaW4iLCJ0b3RhbEJsb2NrRGlmZiIsImIiLCJ0aW1lRGlmZiIsIlJQQyIsInN5bmNfaW5mbyIsImxhdGVzdF9ibG9ja19oZWlnaHQiLCJjdXJySGVpZ2h0IiwibGltaXQiLCJzdGFydEhlaWdodCIsIlNZTkNJTkciLCJ1bnRpbCIsImN1cnIiLCJjb25zZW5zdXNfcHVia2V5IiwidG90YWxWYWxpZGF0b3JzIiwiT2JqZWN0Iiwia2V5cyIsInVwZGF0ZSIsInN0YXJ0QmxvY2tUaW1lIiwiYnVsa1ZhbGlkYXRvcnMiLCJyYXdDb2xsZWN0aW9uIiwiaW5pdGlhbGl6ZVVub3JkZXJlZEJ1bGtPcCIsImJ1bGtVcGRhdGVMYXN0U2VlbiIsImJ1bGtWYWxpZGF0b3JSZWNvcmRzIiwiYnVsa1ZQSGlzdG9yeSIsImJ1bGtUcmFuc2FjdGlvbnMiLCJzdGFydEdldEhlaWdodFRpbWUiLCJoYXNoIiwiYmxvY2tfaWQiLCJ0cmFuc051bSIsInR4cyIsImhlYWRlciIsImxhc3RCbG9ja0hhc2giLCJsYXN0X2Jsb2NrX2lkIiwicHJvcG9zZXJfYWRkcmVzcyIsInQiLCJ0eGhhc2giLCJCdWZmZXIiLCJmcm9tIiwidG9VcHBlckNhc2UiLCJwcm9jZXNzZWQiLCJleGVjdXRlIiwiZXJyIiwiZXZpZGVuY2UiLCJldmlkZW5jZUxpc3QiLCJwcmVjb21taXRzQ291bnQiLCJsYXN0X2NvbW1pdCIsInNpZ25hdHVyZXMiLCJlbmRHZXRIZWlnaHRUaW1lIiwic3RhcnRHZXRWYWxpZGF0b3JzVGltZSIsImJsb2NrX2hlaWdodCIsInZhbGlkYXRvcnNDb3VudCIsInRlbXBWYWxpZGF0b3JzIiwidmFsY29uc0FkZHJlc3MiLCJiZWNoMzJQcmVmaXhDb25zQWRkciIsInByZWNvbW1pdHMiLCJwdXNoIiwidmFsaWRhdG9yX2FkZHJlc3MiLCJyZWNvcmQiLCJleGlzdHMiLCJqIiwicHJlY29tbWl0QWRkcmVzcyIsInVwZGF0ZU9uZSIsImxhc3RTZWVuIiwic3RhcnRCbG9ja0luc2VydFRpbWUiLCJlbmRCbG9ja0luc2VydFRpbWUiLCJjaGFpblN0YXR1cyIsImNoYWluX2lkIiwibGFzdFN5bmNlZFRpbWUiLCJkZWZhdWx0QmxvY2tUaW1lIiwiZGF0ZUxhdGVzdCIsImRhdGVMYXN0IiwiZ2VuZXNpc1RpbWUiLCJhYnMiLCJnZXRUaW1lIiwiZW5kR2V0VmFsaWRhdG9yc1RpbWUiLCJhdmVyYWdlQmxvY2tUaW1lIiwic3RhcnRGaW5kVmFsaWRhdG9yc05hbWVUaW1lIiwidG9rZW5zIiwidW5ib25kaW5nX2hlaWdodCIsInZhbEV4aXN0IiwiYmVjaDMyQ29uc2Vuc3VzUHViS2V5IiwiYmVjaDMyUHJlZml4Q29uc1B1YiIsImRlc2NyaXB0aW9uIiwicHJvZmlsZV91cmwiLCJhY2NwdWIiLCJiZWNoMzJQcmVmaXhBY2NQdWIiLCJvcGVyYXRvcl9wdWJrZXkiLCJiZWNoMzJQcmVmaXhWYWxQdWIiLCJwcm9wb3Nlcl9wcmlvcml0eSIsInByZXZfdm90aW5nX3Bvd2VyIiwiYmxvY2tfdGltZSIsInByZXZWb3RpbmdQb3dlciIsImNoYW5nZVR5cGUiLCJjaGFuZ2VEYXRhIiwidmFsaWRhdG9yVXBkYXRlV2luZG93Iiwic2VsZkRlbGVnYXRpb24iLCJzZWxmX2RlbGVnYXRpb24iLCJkZWxlZ2F0b3Jfc2hhcmVzIiwiZW5kRmluZFZhbGlkYXRvcnNOYW1lVGltZSIsInN0YXJ0QW5heXRpY3NJbnNlcnRUaW1lIiwiZW5kQW5hbHl0aWNzSW5zZXJ0VGltZSIsInN0YXJ0VlVwVGltZSIsImVuZFZVcFRpbWUiLCJzdGFydFZSVGltZSIsImVuZFZSVGltZSIsImVuZEJsb2NrVGltZSIsImxhc3RCbG9ja3NTeW5jZWRUaW1lIiwicHVibGlzaENvbXBvc2l0ZSIsImNoaWxkcmVuIiwiTW9uZ28iLCJDb2xsZWN0aW9uIiwiaGVscGVycyIsInByb3Bvc2VyIiwiQ2hhaW5TdGF0ZXMiLCJDb2luIiwiZGVmYXVsdCIsImZpbmRWb3RpbmdQb3dlciIsImdlblZhbGlkYXRvcnMiLCJwb3dlciIsImNvbnNlbnN1cyIsInJvdW5kX3N0YXRlIiwicm91bmQiLCJzdGVwIiwidm90ZWRQb3dlciIsInZvdGVzIiwicHJldm90ZXNfYml0X2FycmF5Iiwic3BsaXQiLCJ2b3RpbmdIZWlnaHQiLCJ2b3RpbmdSb3VuZCIsInZvdGluZ1N0ZXAiLCJwcmV2b3RlcyIsImxhdGVzdEJsb2NrIiwiY2hhaW4iLCJsYXRlc3RCbG9ja0hlaWdodCIsImxhdGVzdEJsb2NrVGltZSIsImxhdGVzdFN0YXRlIiwiYWN0aXZlVlAiLCJhY3RpdmVWb3RpbmdQb3dlciIsInN0YWtpbmciLCJjaGFpblN0YXRlcyIsImJvbmRpbmciLCJwb29sIiwiYm9uZGVkVG9rZW5zIiwiYm9uZGVkX3Rva2VucyIsIm5vdEJvbmRlZFRva2VucyIsIm5vdF9ib25kZWRfdG9rZW5zIiwiU3Rha2luZ0NvaW4iLCJkZW5vbSIsIm1vZHVsZXMiLCJiYW5rIiwic3VwcGx5IiwidG90YWxTdXBwbHkiLCJhbW91bnQiLCJkaXN0cmlidXRpb24iLCJjb21tdW5pdHlQb29sIiwibWludGluZyIsImluZmxhdGlvbiIsInByb3Zpc2lvbnMiLCJhbm51YWxfcHJvdmlzaW9ucyIsImFubnVhbFByb3Zpc2lvbnMiLCJtaW50IiwiZ292IiwiY3JlYXRlZCIsIkNvaW5TdGF0cyIsInB1Ymxpc2giLCJsYXN0X3VwZGF0ZWRfYXQiLCJmaWVsZHMiLCJjb2luSWQiLCJjb2luZ2Vja29JZCIsIm5vdyIsInNldE1pbnV0ZXMiLCJEZWxlZ2F0aW9ucyIsImNvbmNhdCIsImNyZWF0ZWRBdCIsIl9vYmplY3RTcHJlYWQiLCJ0eEluZm8iLCJ0aW1lc3RhbXAiLCJwb3N0IiwiY29kZSIsIkVycm9yIiwicmF3X2xvZyIsIm1lc3NhZ2UiLCJib2R5IiwicGF0aCIsInR4TXNnIiwiYWNjb3VudE51bWJlciIsInNlcXVlbmNlIiwiYWRqdXN0bWVudCIsInRvU3RyaW5nIiwiZ2FzX2VzdGltYXRlIiwiUHJvcG9zYWxzIiwidGFsbHlfcGFyYW1zIiwicHJvcG9zYWxzIiwiZmluaXNoZWRQcm9wb3NhbElkcyIsIlNldCIsInByb3Bvc2FsSWQiLCJhY3RpdmVQcm9wb3NhbHMiLCJwcm9wb3NhbElkcyIsImJ1bGtQcm9wb3NhbHMiLCJwcm9wb3NhbCIsInByb3Bvc2FsX2lkIiwiaGFzIiwiJG5pbiIsImRlcG9zaXRzIiwiZ2V0Vm90ZURldGFpbCIsInRhbGx5IiwidXBkYXRlZEF0Iiwidm90ZXJzIiwidm90ZSIsInZvdGVyIiwidm90aW5nUG93ZXJNYXAiLCJ2YWxpZGF0b3JBZGRyZXNzTWFwIiwibW9uaWtlciIsImRlbGVnYXRvclNoYXJlcyIsImRlZHVjdGVkU2hhcmVzIiwidm90aW5nUG93ZXIiLCJ1bmRlZmluZWQiLCJjaGVjayIsImlkIiwiTnVtYmVyIiwiQXZlcmFnZURhdGEiLCJBdmVyYWdlVmFsaWRhdG9yRGF0YSIsIlN0YXR1cyIsIk1pc3NlZEJsb2Nrc1N0YXRzIiwiTWlzc2VkQmxvY2tzIiwiXyIsIkJVTEtVUERBVEVNQVhTSVpFIiwiZ2V0QmxvY2tTdGF0cyIsImxhdGVzdEhlaWdodCIsImJsb2NrU3RhdHMiLCJjb25kIiwiJGFuZCIsIiRndCIsIiRsdGUiLCJvcHRpb25zIiwiYXNzaWduIiwiZ2V0UHJldmlvdXNSZWNvcmQiLCJ2b3RlckFkZHJlc3MiLCJwcmV2aW91c1JlY29yZCIsImJsb2NrSGVpZ2h0IiwibGFzdFVwZGF0ZWRIZWlnaHQiLCJwcmV2U3RhdHMiLCJwaWNrIiwibWlzc0NvdW50IiwidG90YWxDb3VudCIsIkNPVU5UTUlTU0VEQkxPQ0tTIiwic3RhcnRUaW1lIiwiZXhwbG9yZXJTdGF0dXMiLCJsYXN0UHJvY2Vzc2VkTWlzc2VkQmxvY2tIZWlnaHQiLCJtaW4iLCJidWxrTWlzc2VkU3RhdHMiLCJpbml0aWFsaXplT3JkZXJlZEJ1bGtPcCIsInZhbGlkYXRvcnNNYXAiLCJwcm9wb3NlclZvdGVyU3RhdHMiLCJ2b3RlZFZhbGlkYXRvcnMiLCJ2YWxpZGF0b3JTZXRzIiwidm90ZWRWb3RpbmdQb3dlciIsImFjdGl2ZVZhbGlkYXRvciIsImN1cnJlbnRWYWxpZGF0b3IiLCJzZXQiLCJuIiwic3RhdHMiLCJjbGllbnQiLCJfZHJpdmVyIiwibW9uZ28iLCJidWxrUHJvbWlzZSIsInRoZW4iLCJiaW5kRW52aXJvbm1lbnQiLCJuSW5zZXJ0ZWQiLCJuVXBzZXJ0ZWQiLCJuTW9kaWZpZWQiLCJQcm9taXNlIiwiYXdhaXQiLCJsYXN0UHJvY2Vzc2VkTWlzc2VkQmxvY2tUaW1lIiwiQ09VTlRNSVNTRURCTE9DS1NTVEFUUyIsImxhc3RNaXNzZWRCbG9ja0hlaWdodCIsIm1pc3NlZFJlY29yZHMiLCJjb3VudHMiLCJleGlzdGluZ1JlY29yZCIsImxhc3RNaXNzZWRCbG9ja1RpbWUiLCJhdmVyYWdlVm90aW5nUG93ZXIiLCJhbmFseXRpY3MiLCJsYXN0TWludXRlVm90aW5nUG93ZXIiLCJsYXN0TWludXRlQmxvY2tUaW1lIiwibGFzdEhvdXJWb3RpbmdQb3dlciIsImxhc3RIb3VyQmxvY2tUaW1lIiwibGFzdERheVZvdGluZ1Bvd2VyIiwibGFzdERheUJsb2NrVGltZSIsImJsb2NrSGVpZ2h0cyIsImEiLCJudW0iLCJjb25kaXRpb25zIiwicHJvcG9zZXJNb25pa2VyIiwidm90ZXJNb25pa2VyIiwiQWRkcmVzc0xlbmd0aCIsIlRYU1lOQ0lORyIsInRyYW5zYWN0aW9ucyIsInR4IiwidHhfcmVzcG9uc2UiLCJtaXNzaW5nIiwiJGx0IiwiaW5jbHVkZXMiLCJiZWNoMzJQcmVmaXhWYWxBZGRyIiwiYmVjaDMyUHJlZml4QWNjQWRkciIsIiRleGlzdHMiLCIkbmUiLCJ2YWxpZGF0b3JBZGRyZXNzIiwiZGVsZWdhdG9yQWRkcmVzcyIsInF1ZXJ5IiwiVHhJY29uIiwiZGVsZWdhdGlvbnNDb3VudCIsInBhZ2luYXRpb24iLCJub2RlX2luZm8iLCJuZXR3b3JrIiwibGFzdEtleWJhc2VGZXRjaFRpbWUiLCJwcm9maWxlVXJsIiwidG9VVENTdHJpbmciLCJkaXJlY3Rpb24iLCJ2YWwiLCJ1cHRpbWVXaW5kb3ciLCJmaXJzdFNlZW4iLCJoaXN0b3J5IiwiY3JlYXRlSW5kZXgiLCJ1bmlxdWUiLCJwYXJ0aWFsRmlsdGVyRXhwcmVzc2lvbiIsIm9uUGFnZUxvYWQiLCJIZWxtZXQiLCJzaW5rIiwiaGVsbWV0IiwicmVuZGVyU3RhdGljIiwiYXBwZW5kVG9IZWFkIiwibWV0YSIsInRpdGxlIiwiYmVjaDMyIiwidG1oYXNoIiwiaGV4VG9CZWNoMzIiLCJwcmVmaXgiLCJhZGRyZXNzQnVmZmVyIiwiZW5jb2RlIiwidG9Xb3JkcyIsInB1YmtleVRvQmVjaDMyT2xkIiwiYnVmZmVyIiwicHVia2V5QW1pbm9QcmVmaXgiLCJhbGxvYyIsImNvcHkiLCJwdWJrZXlUb0JlY2gzMiIsImJlY2gzMlRvUHVia2V5IiwiZnJvbVdvcmRzIiwiZGVjb2RlIiwid29yZHMiLCJzbGljZSIsImdldEFkZHJlc3NGcm9tUHVia2V5IiwiYnl0ZXMiLCJnZXREZWxlZ2F0b3IiLCJvcGVyYXRvckFkZHIiLCJnZXRLZXliYXNlVGVhbVBpYyIsImtleWJhc2VVcmwiLCJnZXRWZXJzaW9uIiwidmVyc2lvbiIsIkFzc2V0cyIsImdldFRleHQiLCJEZW5vbVN5bWJvbCIsIlByb3Bvc2FsU3RhdHVzSWNvbiIsIlZvdGVJY29uIiwiSW5mb0ljb24iLCJSZWFjdCIsIlVuY29udHJvbGxlZFRvb2x0aXAiLCJwcm9wcyIsInZhbGlkIiwiQ29tcG9uZW50IiwiY29uc3RydWN0b3IiLCJyZWYiLCJjcmVhdGVSZWYiLCJyZW5kZXIiLCJ0b29sdGlwVGV4dCIsIm51bWJybyIsImF1dG9mb3JtYXQiLCJmb3JtYXR0ZXIiLCJmb3JtYXQiLCJjb2luTGlzdCIsImJvbmREZW5vbSIsImxvd2VyRGVub20iLCJ0b0xvd2VyQ2FzZSIsIl9jb2luIiwiY29pbiIsImRpc3BsYXlOYW1lIiwiX2Ftb3VudCIsImZyYWN0aW9uIiwic3Rha2luZ0Ftb3VudCIsInByZWNpc2lvbiIsIm1pblN0YWtlIiwicmVwZWF0IiwiTWluU3Rha2UiLCJEaXNhcHBlYXJlZExvYWRpbmciLCJMb2FkZXIiLCJleHBvcnREZWZhdWx0IiwiZ29UaW1lVG9JU09TdHJpbmciLCJtaWxsaXNlY29uZCIsInNlY29uZHMiLCJuYW5vcyIsInN1YnN0cmluZyIsInRvSVNPU3RyaW5nIiwicmVtb3RlIiwicnBjIiwiYXBpIiwidGltZXJCbG9ja3MiLCJ0aW1lclRyYW5zYWN0aW9ucyIsInRpbWVyQ2hhaW4iLCJ0aW1lckNvbnNlbnN1cyIsInRpbWVyUHJvcG9zYWwiLCJ0aW1lclByb3Bvc2Fsc1Jlc3VsdHMiLCJ0aW1lck1pc3NlZEJsb2NrIiwidGltZXJEZWxlZ2F0aW9uIiwidGltZXJBZ2dyZWdhdGUiLCJ0aW1lckZldGNoS2V5YmFzZSIsIkRFRkFVTFRTRVRUSU5HUyIsInVwZGF0ZUNoYWluU3RhdHVzIiwiZXJyb3IiLCJ1cGRhdGVCbG9jayIsInVwZGF0ZVRyYW5zYWN0aW9ucyIsImdldENvbnNlbnN1c1N0YXRlIiwiZ2V0UHJvcG9zYWxzIiwiZ2V0UHJvcG9zYWxzUmVzdWx0cyIsInVwZGF0ZU1pc3NlZEJsb2NrcyIsImZldGNoS2V5YmFzZSIsImdldERlbGVnYXRpb25zIiwiYWdncmVnYXRlTWludXRlbHkiLCJhZ2dyZWdhdGVIb3VybHkiLCJhZ2dyZWdhdGVEYWlseSIsInN0YXJ0dXAiLCJpc0RldmVsb3BtZW50IiwiREVGQVVMVFNFVFRJTkdTSlNPTiIsInByb2Nlc3MiLCJlbnYiLCJOT0RFX1RMU19SRUpFQ1RfVU5BVVRIT1JJWkVEIiwid2FybiIsInBhcmFtIiwiZGVidWciLCJzdGFydFRpbWVyIiwic2V0SW50ZXJ2YWwiLCJjb25zZW5zdXNJbnRlcnZhbCIsImJsb2NrSW50ZXJ2YWwiLCJ0cmFuc2FjdGlvbnNJbnRlcnZhbCIsInN0YXR1c0ludGVydmFsIiwicHJvcG9zYWxJbnRlcnZhbCIsIm1pc3NlZEJsb2Nrc0ludGVydmFsIiwia2V5YmFzZUZldGNoaW5nSW50ZXJ2YWwiLCJnZXRVVENTZWNvbmRzIiwiZ2V0VVRDTWludXRlcyIsImdldFVUQ0hvdXJzIl0sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFBLElBQUlBLE1BQUo7QUFBV0MsTUFBTSxDQUFDQyxJQUFQLENBQVksZUFBWixFQUE0QjtBQUFDRixRQUFNLENBQUNHLENBQUQsRUFBRztBQUFDSCxVQUFNLEdBQUNHLENBQVA7QUFBUzs7QUFBcEIsQ0FBNUIsRUFBa0QsQ0FBbEQ7QUFBcUQsSUFBSUMsSUFBSjtBQUFTSCxNQUFNLENBQUNDLElBQVAsQ0FBWSxhQUFaLEVBQTBCO0FBQUNFLE1BQUksQ0FBQ0QsQ0FBRCxFQUFHO0FBQUNDLFFBQUksR0FBQ0QsQ0FBTDtBQUFPOztBQUFoQixDQUExQixFQUE0QyxDQUE1QztBQUErQyxJQUFJRSxVQUFKO0FBQWVKLE1BQU0sQ0FBQ0MsSUFBUCxDQUFZLHVDQUFaLEVBQW9EO0FBQUNHLFlBQVUsQ0FBQ0Ys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QixJQUE2QnhSLEdBQUcsQ0FBQ3VSLGFBQUosTUFBdUIsQ0FBcEQsSUFBMkR2UixHQUFHLENBQUNzUixhQUFKLE1BQXVCLENBQXRGLEVBQXlGO0FBQ3JGbkIsd0JBQWM7QUFDakI7QUFDSixPQWJnQixFQWFkLElBYmMsQ0FBakI7QUFjSDtBQUNKLEdBeEVjO0FBQUEsQ0FBZixFIiwiZmlsZSI6Ii9hcHAuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBNZXRlb3IgfSBmcm9tICdtZXRlb3IvbWV0ZW9yJztcbmltcG9ydCB7IEhUVFAgfSBmcm9tICdtZXRlb3IvaHR0cCc7XG5pbXBvcnQgeyBWYWxpZGF0b3JzIH0gZnJvbSAnL2ltcG9ydHMvYXBpL3ZhbGlkYXRvcnMvdmFsaWRhdG9ycy5qcyc7XG5jb25zdCBmZXRjaEZyb21VcmwgPSAodXJsKSA9PiB7XG4gICAgdHJ5e1xuICAgICAgICBsZXQgcmVzID0gSFRUUC5nZXQoQVBJICsgdXJsKTtcbiAgICAgICAgaWYgKHJlcy5zdGF0dXNDb2RlID09IDIwMCl7XG4gICAgICAgICAgICByZXR1cm4gcmVzXG4gICAgICAgIH07XG4gICAgfVxuICAgIGNhdGNoIChlKXtcbiAgICAgICAgY29uc29sZS5sb2codXJsKTtcbiAgICAgICAgY29uc29sZS5sb2coZSk7XG4gICAgfVxufVxuXG5NZXRlb3IubWV0aG9kcyh7XG4gICAgJ2FjY291bnRzLmdldEFjY291bnREZXRhaWwnOiBmdW5jdGlvbihhZGRyZXNzKXtcbiAgICAgICAgdGhpcy51bmJsb2NrKCk7XG4gICAgICAgIGxldCB1cmwgPSBBUEkgKyAnL2F1dGgvYWNjb3VudHMvJysgYWRkcmVzcztcbiAgICAgICAgdHJ5e1xuICAgICAgICAgICAgbGV0IGF2YWlsYWJsZSA9IEhUVFAuZ2V0KHVybCk7XG4gICAgICAgICAgICBpZiAoYXZhaWxhYmxlLnN0YXR1c0NvZGUgPT0gMjAwKXtcbiAgICAgICAgICAgICAgICAvLyByZXR1cm4gSlNPTi5wYXJzZShhdmFpbGFibGUuY29udGVudCkuYWNjb3VudFxuICAgICAgICAgICAgICAgIGxldCByZXNwb25zZSA9IEpTT04ucGFyc2UoYXZhaWxhYmxlLmNvbnRlbnQpLnJlc3VsdDtcbiAgICAgICAgICAgICAgICBsZXQgYWNjb3VudDtcbiAgICAgICAgICAgICAgICBpZiAoKHJlc3BvbnNlLnR5cGUgPT09ICdjb3Ntb3Mtc2RrL0FjY291bnQnKSB8fCAocmVzcG9uc2UudHlwZSA9PT0gJ2Nvc21vcy1zZGsvQmFzZUFjY291bnQnKSlcbiAgICAgICAgICAgICAgICAgICAgYWNjb3VudCA9IHJlc3BvbnNlLnZhbHVlO1xuICAgICAgICAgICAgICAgIGVsc2UgaWYgKHJlc3BvbnNlLnR5cGUgPT09ICdjb3Ntb3Mtc2RrL0RlbGF5ZWRWZXN0aW5nQWNjb3VudCcgfHwgcmVzcG9uc2UudHlwZSA9PT0gJ2Nvc21vcy1zZGsvQ29udGludW91c1Zlc3RpbmdBY2NvdW50JylcbiAgICAgICAgICAgICAgICAgICAgYWNjb3VudCA9IHJlc3BvbnNlLnZhbHVlLkJhc2VWZXN0aW5nQWNjb3VudC5CYXNlQWNjb3VudFxuXG4gICAgICAgICAgICAgICAgdHJ5e1xuICAgICAgICAgICAgICAgICAgICB1cmwgPSBBUEkgKyAnL2JhbmsvYmFsYW5jZXMvJyArIGFkZHJlc3M7XG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlID0gSFRUUC5nZXQodXJsKTtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGJhbGFuY2VzID0gSlNPTi5wYXJzZShyZXNwb25zZS5jb250ZW50KS5yZXN1bHQ7XG4gICAgICAgICAgICAgICAgICAgIGFjY291bnQuY29pbnMgPSBiYWxhbmNlcztcblxuICAgICAgICAgICAgICAgICAgICBpZiAoYWNjb3VudCAmJiBhY2NvdW50LmFjY291bnRfbnVtYmVyICE9IG51bGwpXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYWNjb3VudFxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYXRjaCAoZSl7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZSl7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyh1cmwpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coZSlcbiAgICAgICAgfVxuICAgIH0sXG4gICAgJ2FjY291bnRzLmdldEJhbGFuY2UnOiBmdW5jdGlvbihhZGRyZXNzKXtcbiAgICAgICAgdGhpcy51bmJsb2NrKCk7XG4gICAgICAgIGxldCBiYWxhbmNlID0ge31cblxuICAgICAgICAvLyBnZXQgYXZhaWxhYmxlIGF0b21zXG4gICAgICAgIGxldCB1cmwgPSBBUEkgKyAnL2Nvc21vcy9iYW5rL3YxYmV0YTEvYmFsYW5jZXMvJysgYWRkcmVzcztcbiAgICAgICAgdHJ5e1xuICAgICAgICAgICAgbGV0IGF2YWlsYWJsZSA9IEhUVFAuZ2V0KHVybCk7XG4gICAgICAgICAgICBpZiAoYXZhaWxhYmxlLnN0YXR1c0NvZGUgPT0gMjAwKXtcbiAgICAgICAgICAgICAgICBiYWxhbmNlLmF2YWlsYWJsZSA9IEpTT04ucGFyc2UoYXZhaWxhYmxlLmNvbnRlbnQpLmJhbGFuY2VzO1xuXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGUpe1xuICAgICAgICAgICAgY29uc29sZS5sb2codXJsKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGUpXG4gICAgICAgIH1cblxuICAgICAgICAvLyBnZXQgZGVsZWdhdGVkIGFtbm91bnRzXG4gICAgICAgIHVybCA9IEFQSSArICcvY29zbW9zL3N0YWtpbmcvdjFiZXRhMS9kZWxlZ2F0aW9ucy8nK2FkZHJlc3M7XG4gICAgICAgIHRyeXtcbiAgICAgICAgICAgIGxldCBkZWxlZ2F0aW9ucyA9IEhUVFAuZ2V0KHVybCk7XG4gICAgICAgICAgICBpZiAoZGVsZWdhdGlvbnMuc3RhdHVzQ29kZSA9PSAyMDApe1xuICAgICAgICAgICAgICAgIGJhbGFuY2UuZGVsZWdhdGlvbnMgPSBKU09OLnBhcnNlKGRlbGVnYXRpb25zLmNvbnRlbnQpLmRlbGVnYXRpb25fcmVzcG9uc2VzO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlKXtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKHVybCk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhlKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBnZXQgdW5ib25kaW5nXG4gICAgICAgIHVybCA9IEFQSSArICcvY29zbW9zL3N0YWtpbmcvdjFiZXRhMS9kZWxlZ2F0b3JzLycrYWRkcmVzcysnL3VuYm9uZGluZ19kZWxlZ2F0aW9ucyc7XG4gICAgICAgIHRyeXtcbiAgICAgICAgICAgIGxldCB1bmJvbmRpbmcgPSBIVFRQLmdldCh1cmwpO1xuICAgICAgICAgICAgaWYgKHVuYm9uZGluZy5zdGF0dXNDb2RlID09IDIwMCl7XG4gICAgICAgICAgICAgICAgYmFsYW5jZS51bmJvbmRpbmcgPSBKU09OLnBhcnNlKHVuYm9uZGluZy5jb250ZW50KS51bmJvbmRpbmdfcmVzcG9uc2VzO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlKXtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKHVybCk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGdldCByZXdhcmRzXG4gICAgICAgIHVybCA9IEFQSSArICcvY29zbW9zL2Rpc3RyaWJ1dGlvbi92MWJldGExL2RlbGVnYXRvcnMvJythZGRyZXNzKycvcmV3YXJkcyc7XG4gICAgICAgIHRyeXtcbiAgICAgICAgICAgIGxldCByZXdhcmRzID0gSFRUUC5nZXQodXJsKTtcbiAgICAgICAgICAgIGlmIChyZXdhcmRzLnN0YXR1c0NvZGUgPT0gMjAwKXtcbiAgICAgICAgICAgICAgICAvL2dldCBzZXBlcmF0ZSByZXdhcmRzIHZhbHVlXG4gICAgICAgICAgICAgICAgYmFsYW5jZS5yZXdhcmRzID0gSlNPTi5wYXJzZShyZXdhcmRzLmNvbnRlbnQpLnJld2FyZHM7XG4gICAgICAgICAgICAgICAgLy9nZXQgdG90YWwgcmV3YXJkcyB2YWx1ZVxuICAgICAgICAgICAgICAgIGJhbGFuY2UudG90YWxfcmV3YXJkcz0gSlNPTi5wYXJzZShyZXdhcmRzLmNvbnRlbnQpLnRvdGFsO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlKXtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKHVybCk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGdldCBjb21taXNzaW9uXG4gICAgICAgIGxldCB2YWxpZGF0b3IgPSBWYWxpZGF0b3JzLmZpbmRPbmUoXG4gICAgICAgICAgICB7JG9yOiBbe29wZXJhdG9yX2FkZHJlc3M6YWRkcmVzc30sIHtkZWxlZ2F0b3JfYWRkcmVzczphZGRyZXNzfSwge2FkZHJlc3M6YWRkcmVzc31dfSlcbiAgICAgICAgaWYgKHZhbGlkYXRvcikge1xuICAgICAgICAgICAgbGV0IHVybCA9IEFQSSArICcvY29zbW9zL2Rpc3RyaWJ1dGlvbi92MWJldGExL3ZhbGlkYXRvcnMvJyt2YWxpZGF0b3Iub3BlcmF0b3JfYWRkcmVzcysnL2NvbW1pc3Npb24nO1xuICAgICAgICAgICAgYmFsYW5jZS5vcGVyYXRvckFkZHJlc3MgPSB2YWxpZGF0b3Iub3BlcmF0b3JfYWRkcmVzcztcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgbGV0IHJld2FyZHMgPSBIVFRQLmdldCh1cmwpO1xuICAgICAgICAgICAgICAgIGlmIChyZXdhcmRzLnN0YXR1c0NvZGUgPT0gMjAwKXtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGNvbnRlbnQgPSBKU09OLnBhcnNlKHJld2FyZHMuY29udGVudCkuY29tbWlzc2lvbjtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNvbnRlbnQuY29tbWlzc2lvbiAmJiBjb250ZW50LmNvbW1pc3Npb24ubGVuZ3RoID4gMClcbiAgICAgICAgICAgICAgICAgICAgICAgIGJhbGFuY2UuY29tbWlzc2lvbiA9IGNvbnRlbnQuY29tbWlzc2lvbjtcblxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2F0Y2ggKGUpe1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHVybCk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBiYWxhbmNlO1xuICAgIH0sXG4gICAgJ2FjY291bnRzLmdldERlbGVnYXRpb24nKGFkZHJlc3MsIHZhbGlkYXRvcil7XG4gICAgICAgIHRoaXMudW5ibG9jaygpO1xuICAgICAgICBsZXQgdXJsID0gYC9jb3Ntb3Mvc3Rha2luZy92MWJldGExL3ZhbGlkYXRvcnMvJHt2YWxpZGF0b3J9L2RlbGVnYXRpb25zLyR7YWRkcmVzc31gO1xuICAgICAgICBsZXQgZGVsZWdhdGlvbnMgPSBmZXRjaEZyb21VcmwodXJsKTtcbiAgICAgICAgY29uc29sZS5sb2coZGVsZWdhdGlvbnMpO1xuICAgICAgICBkZWxlZ2F0aW9ucyA9IGRlbGVnYXRpb25zICYmIGRlbGVnYXRpb25zLmRhdGEuZGVsZWdhdGlvbl9yZXNwb25zZTtcbiAgICAgICAgaWYgKGRlbGVnYXRpb25zICYmIGRlbGVnYXRpb25zLmRlbGVnYXRpb24uc2hhcmVzKVxuICAgICAgICAgICAgZGVsZWdhdGlvbnMuZGVsZWdhdGlvbi5zaGFyZXMgPSBwYXJzZUZsb2F0KGRlbGVnYXRpb25zLmRlbGVnYXRpb24uc2hhcmVzKTtcblxuICAgICAgICB1cmwgPSBgL2Nvc21vcy9zdGFraW5nL3YxYmV0YTEvZGVsZWdhdG9ycy8ke2FkZHJlc3N9L3JlZGVsZWdhdGlvbnM/ZHN0X3ZhbGlkYXRvcl9hZGRyPSR7dmFsaWRhdG9yfWA7XG4gICAgICAgIGxldCByZWxlZ2F0aW9ucyA9IGZldGNoRnJvbVVybCh1cmwpO1xuICAgICAgICByZWxlZ2F0aW9ucyA9IHJlbGVnYXRpb25zICYmIHJlbGVnYXRpb25zLmRhdGEucmVkZWxlZ2F0aW9uX3Jlc3BvbnNlcztcbiAgICAgICAgbGV0IGNvbXBsZXRpb25UaW1lO1xuICAgICAgICBpZiAocmVsZWdhdGlvbnMpIHtcbiAgICAgICAgICAgIHJlbGVnYXRpb25zLmZvckVhY2goKHJlbGVnYXRpb24pID0+IHtcbiAgICAgICAgICAgICAgICBsZXQgZW50cmllcyA9IHJlbGVnYXRpb24uZW50cmllc1xuICAgICAgICAgICAgICAgIGxldCB0aW1lID0gbmV3IERhdGUoZW50cmllc1tlbnRyaWVzLmxlbmd0aC0xXS5jb21wbGV0aW9uX3RpbWUpXG4gICAgICAgICAgICAgICAgaWYgKCFjb21wbGV0aW9uVGltZSB8fCB0aW1lID4gY29tcGxldGlvblRpbWUpXG4gICAgICAgICAgICAgICAgICAgIGNvbXBsZXRpb25UaW1lID0gdGltZVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIGRlbGVnYXRpb25zLnJlZGVsZWdhdGlvbkNvbXBsZXRpb25UaW1lID0gY29tcGxldGlvblRpbWU7XG4gICAgICAgIH1cblxuICAgICAgICB1cmwgPSBgL2Nvc21vcy9zdGFraW5nL3YxYmV0YTEvdmFsaWRhdG9ycy8ke3ZhbGlkYXRvcn0vZGVsZWdhdGlvbnMvJHthZGRyZXNzfS91bmJvbmRpbmdfZGVsZWdhdGlvbmA7XG4gICAgICAgIGxldCB1bmRlbGVnYXRpb25zID0gZmV0Y2hGcm9tVXJsKHVybCk7XG4gICAgICAgIHVuZGVsZWdhdGlvbnMgPSB1bmRlbGVnYXRpb25zICYmIHVuZGVsZWdhdGlvbnMuZGF0YS5yZXN1bHQ7XG4gICAgICAgIGlmICh1bmRlbGVnYXRpb25zKSB7XG4gICAgICAgICAgICBkZWxlZ2F0aW9ucy51bmJvbmRpbmcgPSB1bmRlbGVnYXRpb25zLmVudHJpZXMubGVuZ3RoO1xuICAgICAgICAgICAgZGVsZWdhdGlvbnMudW5ib25kaW5nQ29tcGxldGlvblRpbWUgPSB1bmRlbGVnYXRpb25zLmVudHJpZXNbMF0uY29tcGxldGlvbl90aW1lO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkZWxlZ2F0aW9ucztcbiAgICB9LFxuICAgICdhY2NvdW50cy5nZXRBbGxEZWxlZ2F0aW9ucycoYWRkcmVzcyl7XG4gICAgICAgIHRoaXMudW5ibG9jaygpO1xuICAgICAgICBsZXQgdXJsID0gQVBJICsgJy9jb3Ntb3Mvc3Rha2luZy92MWJldGExL2RlbGVnYXRvcnMvJythZGRyZXNzKycvZGVsZWdhdGlvbnMnO1xuXG4gICAgICAgIHRyeXtcbiAgICAgICAgICAgIGxldCBkZWxlZ2F0aW9ucyA9IEhUVFAuZ2V0KHVybCk7XG4gICAgICAgICAgICBpZiAoZGVsZWdhdGlvbnMuc3RhdHVzQ29kZSA9PSAyMDApe1xuICAgICAgICAgICAgICAgIGRlbGVnYXRpb25zID0gSlNPTi5wYXJzZShkZWxlZ2F0aW9ucy5jb250ZW50KS5yZXN1bHQ7XG4gICAgICAgICAgICAgICAgaWYgKGRlbGVnYXRpb25zICYmIGRlbGVnYXRpb25zLmxlbmd0aCA+IDApe1xuICAgICAgICAgICAgICAgICAgICBkZWxlZ2F0aW9ucy5mb3JFYWNoKChkZWxlZ2F0aW9uLCBpKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGVsZWdhdGlvbnNbaV0gJiYgZGVsZWdhdGlvbnNbaV0uc2hhcmVzKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlbGVnYXRpb25zW2ldLnNoYXJlcyA9IHBhcnNlRmxvYXQoZGVsZWdhdGlvbnNbaV0uc2hhcmVzKTtcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gZGVsZWdhdGlvbnM7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlKXtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKHVybCk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhlKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgJ2FjY291bnRzLmdldEFsbFVuYm9uZGluZ3MnKGFkZHJlc3Mpe1xuICAgICAgICB0aGlzLnVuYmxvY2soKTtcbiAgICAgICAgbGV0IHVybCA9IEFQSSArICcvY29zbW9zL3N0YWtpbmcvdjFiZXRhMS9kZWxlZ2F0b3JzLycrYWRkcmVzcysnL3VuYm9uZGluZ19kZWxlZ2F0aW9ucyc7XG5cbiAgICAgICAgdHJ5e1xuICAgICAgICAgICAgbGV0IHVuYm9uZGluZ3MgPSBIVFRQLmdldCh1cmwpO1xuICAgICAgICAgICAgaWYgKHVuYm9uZGluZ3Muc3RhdHVzQ29kZSA9PSAyMDApe1xuICAgICAgICAgICAgICAgIHVuYm9uZGluZ3MgPSBKU09OLnBhcnNlKHVuYm9uZGluZ3MuY29udGVudCkucmVzdWx0O1xuICAgICAgICAgICAgICAgIHJldHVybiB1bmJvbmRpbmdzO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZSl7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyh1cmwpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coZSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgICdhY2NvdW50cy5nZXRBbGxSZWRlbGVnYXRpb25zJyhhZGRyZXNzLCB2YWxpZGF0b3Ipe1xuICAgICAgICB0aGlzLnVuYmxvY2soKTsgICAgICAgIFxuICAgICAgICBsZXQgdXJsID0gYC9jb3Ntb3Mvc3Rha2luZy92MWJldGExL3YxYmV0YTEvZGVsZWdhdG9ycy8ke2FkZHJlc3N9L3JlZGVsZWdhdGlvbnMmc3JjX3ZhbGlkYXRvcl9hZGRyPSR7dmFsaWRhdG9yfWA7XG4gICAgICAgIHRyeXtcbiAgICAgICAgICAgIGxldCByZXN1bHQgPSBmZXRjaEZyb21VcmwodXJsKTtcbiAgICAgICAgICAgIGlmIChyZXN1bHQgJiYgcmVzdWx0LmRhdGEpIHtcbiAgICAgICAgICAgICAgICBsZXQgcmVkZWxlZ2F0aW9ucyA9IHt9XG4gICAgICAgICAgICAgICAgcmVzdWx0LmRhdGEuZm9yRWFjaCgocmVkZWxlZ2F0aW9uKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBlbnRyaWVzID0gcmVkZWxlZ2F0aW9uLmVudHJpZXM7XG4gICAgICAgICAgICAgICAgICAgIHJlZGVsZWdhdGlvbnNbcmVkZWxlZ2F0aW9uLnZhbGlkYXRvcl9kc3RfYWRkcmVzc10gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb3VudDogZW50cmllcy5sZW5ndGgsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb21wbGV0aW9uVGltZTogZW50cmllc1swXS5jb21wbGV0aW9uX3RpbWVcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlZGVsZWdhdGlvbnNcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjYXRjaChlKXtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKHVybCk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhlKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgJ2FjY291bnRzLmdldFJlZGVsZWdhdGlvbnMnKGFkZHJlc3MpIHtcbiAgICAgICAgdGhpcy51bmJsb2NrKCk7XG4gICAgICAgIGxldCB1cmwgPSBBUEkgKyAnL2Nvc21vcy9zdGFraW5nL3YxYmV0YTEvdjFiZXRhMS9kZWxlZ2F0b3JzLycgKyBhZGRyZXNzICsnL3JlZGVsZWdhdGlvbnMnO1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBsZXQgdXNlclJlZGVsZWdhdGlvbnMgPSBIVFRQLmdldCh1cmwpO1xuICAgICAgICAgICAgaWYgKHVzZXJSZWRlbGVnYXRpb25zLnN0YXR1c0NvZGUgPT0gMjAwKSB7XG4gICAgICAgICAgICAgICAgdXNlclJlZGVsZWdhdGlvbnMgPSBKU09OLnBhcnNlKHVzZXJSZWRlbGVnYXRpb25zLmNvbnRlbnQpLnJlc3VsdDtcblxuICAgICAgICAgICAgICAgIHJldHVybiB1c2VyUmVkZWxlZ2F0aW9ucztcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKHVybCk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhlLnJlc3BvbnNlLmNvbnRlbnQpO1xuICAgICAgICB9XG4gICAgfSxcbn0pIFxuIiwiaW1wb3J0IHsgTWV0ZW9yIH0gZnJvbSAnbWV0ZW9yL21ldGVvcic7XG5pbXBvcnQgeyBIVFRQIH0gZnJvbSAnbWV0ZW9yL2h0dHAnO1xuaW1wb3J0IHsgQmxvY2tzY29uIH0gZnJvbSAnL2ltcG9ydHMvYXBpL2Jsb2Nrcy9ibG9ja3MuanMnO1xuaW1wb3J0IHsgQ2hhaW4gfSBmcm9tICcvaW1wb3J0cy9hcGkvY2hhaW4vY2hhaW4uanMnO1xuaW1wb3J0IHsgVmFsaWRhdG9yU2V0cyB9IGZyb20gJy9pbXBvcnRzL2FwaS92YWxpZGF0b3Itc2V0cy92YWxpZGF0b3Itc2V0cy5qcyc7XG5pbXBvcnQgeyBWYWxpZGF0b3JzIH0gZnJvbSAnL2ltcG9ydHMvYXBpL3ZhbGlkYXRvcnMvdmFsaWRhdG9ycy5qcyc7XG5pbXBvcnQgeyBWYWxpZGF0b3JSZWNvcmRzLCBBbmFseXRpY3MsIFZQRGlzdHJpYnV0aW9uc30gZnJvbSAnL2ltcG9ydHMvYXBpL3JlY29yZHMvcmVjb3Jkcy5qcyc7XG5pbXBvcnQgeyBWb3RpbmdQb3dlckhpc3RvcnkgfSBmcm9tICcvaW1wb3J0cy9hcGkvdm90aW5nLXBvd2VyL2hpc3RvcnkuanMnO1xuaW1wb3J0IHsgVHJhbnNhY3Rpb25zIH0gZnJvbSAnLi4vLi4vdHJhbnNhY3Rpb25zL3RyYW5zYWN0aW9ucy5qcyc7XG5pbXBvcnQgeyBFdmlkZW5jZXMgfSBmcm9tICcuLi8uLi9ldmlkZW5jZXMvZXZpZGVuY2VzLmpzJztcbmltcG9ydCB7IHNoYTI1NiB9IGZyb20gJ2pzLXNoYTI1Nic7XG4vLyBpbXBvcnQgeyBnZXRBZGRyZXNzIH0gZnJvbSAndGVuZGVybWludC9saWIvcHVia2V5JztcbmltcG9ydCAqIGFzIGNoZWVyaW8gZnJvbSAnY2hlZXJpbyc7XG5cblxuZ2V0UmVtb3ZlZFZhbGlkYXRvcnMgPSAocHJldlZhbGlkYXRvcnMsIHZhbGlkYXRvcnMpID0+IHtcbiAgICAvLyBsZXQgcmVtb3ZlVmFsaWRhdG9ycyA9IFtdO1xuICAgIGZvciAocCBpbiBwcmV2VmFsaWRhdG9ycyl7XG4gICAgICAgIGZvciAodiBpbiB2YWxpZGF0b3JzKXtcbiAgICAgICAgICAgIGlmIChwcmV2VmFsaWRhdG9yc1twXS5hZGRyZXNzID09IHZhbGlkYXRvcnNbdl0uYWRkcmVzcyl7XG4gICAgICAgICAgICAgICAgcHJldlZhbGlkYXRvcnMuc3BsaWNlKHAsMSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gcHJldlZhbGlkYXRvcnM7XG59XG5cblxuZ2V0VmFsaWRhdG9yRnJvbUNvbnNlbnN1c0tleSA9ICh2YWxpZGF0b3JzLCBjb25zZW5zdXNLZXkpID0+IHtcbiAgICBmb3IgKHYgaW4gdmFsaWRhdG9ycyl7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBsZXQgcHVia2V5VHlwZSA9IE1ldGVvci5zZXR0aW5ncy5wdWJsaWMuc2VjcDI1NmsxPyd0ZW5kZXJtaW50L1B1YktleVNlY3AyNTZrMSc6J3RlbmRlcm1pbnQvUHViS2V5RWQyNTUxOSc7XG4gICAgICAgICAgICBsZXQgcHVia2V5ID0gTWV0ZW9yLmNhbGwoJ2JlY2gzMlRvUHVia2V5JywgY29uc2Vuc3VzS2V5LCBwdWJrZXlUeXBlKTtcbiAgICAgICAgICAgIGlmICh2YWxpZGF0b3JzW3ZdLnB1Yl9rZXkudmFsdWUgPT0gcHVia2V5KXtcbiAgICAgICAgICAgICAgICByZXR1cm4gdmFsaWRhdG9yc1t2XVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlKXtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiRXJyb3IgY29udmVydGluZyBwdWJrZXk6ICVvXFxuJW9cIiwgY29uc2Vuc3VzS2V5LCBlKVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xufVxuXG5cbmV4cG9ydCBjb25zdCBnZXRWYWxpZGF0b3JQcm9maWxlVXJsID0gKGlkZW50aXR5KSA9PiB7XG4gICAgY29uc29sZS5sb2coXCJHZXQgdmFsaWRhdG9yIGF2YXRhci5cIilcbiAgICBpZiAoaWRlbnRpdHkubGVuZ3RoID09IDE2KXtcbiAgICAgICAgbGV0IHJlc3BvbnNlID0gSFRUUC5nZXQoYGh0dHBzOi8va2V5YmFzZS5pby9fL2FwaS8xLjAvdXNlci9sb29rdXAuanNvbj9rZXlfc3VmZml4PSR7aWRlbnRpdHl9JmZpZWxkcz1waWN0dXJlc2ApXG4gICAgICAgIGlmIChyZXNwb25zZS5zdGF0dXNDb2RlID09IDIwMCkge1xuICAgICAgICAgICAgbGV0IHRoZW0gPSByZXNwb25zZT8uZGF0YT8udGhlbVxuICAgICAgICAgICAgcmV0dXJuIHRoZW0gJiYgdGhlbS5sZW5ndGggJiYgdGhlbVswXT8ucGljdHVyZXMgJiYgdGhlbVswXT8ucGljdHVyZXM/LnByaW1hcnkgJiYgdGhlbVswXT8ucGljdHVyZXM/LnByaW1hcnk/LnVybDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KHJlc3BvbnNlKSlcbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAoaWRlbnRpdHkuaW5kZXhPZihcImtleWJhc2UuaW8vdGVhbS9cIik+MCl7XG4gICAgICAgIGxldCB0ZWFtUGFnZSA9IEhUVFAuZ2V0KGlkZW50aXR5KTtcbiAgICAgICAgaWYgKHRlYW1QYWdlLnN0YXR1c0NvZGUgPT0gMjAwKXtcbiAgICAgICAgICAgIGxldCBwYWdlID0gY2hlZXJpby5sb2FkKHRlYW1QYWdlLmNvbnRlbnQpO1xuICAgICAgICAgICAgcmV0dXJuIHBhZ2UoXCIua2ItbWFpbi1jYXJkIGltZ1wiKS5hdHRyKCdzcmMnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KHRlYW1QYWdlKSlcbiAgICAgICAgfVxuICAgIH1cbn1cblxuXG5nZXRWYWxpZGF0b3JVcHRpbWUgPSBhc3luYyAodmFsaWRhdG9yU2V0KSA9PiB7XG5cbiAgICAvLyBnZXQgdmFsaWRhdG9yIHVwdGltZVxuICBcbiAgICBsZXQgdXJsID0gYCR7QVBJfS9jb3Ntb3Mvc2xhc2hpbmcvdjFiZXRhMS9wYXJhbXNgO1xuICAgIGxldCByZXNwb25zZSA9IEhUVFAuZ2V0KHVybCk7XG4gICAgbGV0IHNsYXNoaW5nUGFyYW1zID0gSlNPTi5wYXJzZShyZXNwb25zZS5jb250ZW50KVxuXG4gICAgQ2hhaW4udXBzZXJ0KHtjaGFpbklkOk1ldGVvci5zZXR0aW5ncy5wdWJsaWMuY2hhaW5JZH0sIHskc2V0OntcInNsYXNoaW5nXCI6c2xhc2hpbmdQYXJhbXN9fSk7XG5cbiAgICBmb3IobGV0IGtleSBpbiB2YWxpZGF0b3JTZXQpe1xuICAgICAgICAvLyBjb25zb2xlLmxvZyhcIkdldHRpbmcgdXB0aW1lIHZhbGlkYXRvcjogJW9cIiwgdmFsaWRhdG9yU2V0W2tleV0pO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coXCI9PT0gU2lnbmluZyBJbmZvID09PTogJW9cIiwgc2lnbmluZ0luZm8pXG5cbiAgICAgICAgICAgIHVybCA9IGAke0FQSX0vY29zbW9zL3NsYXNoaW5nL3YxYmV0YTEvc2lnbmluZ19pbmZvcy8ke3ZhbGlkYXRvclNldFtrZXldLmJlY2gzMlZhbENvbnNBZGRyZXNzfWBcbiAgICAgICAgICAgIGxldCByZXNwb25zZSA9IEhUVFAuZ2V0KHVybCk7XG4gICAgICAgICAgICBsZXQgc2lnbmluZ0luZm8gPSBKU09OLnBhcnNlKHJlc3BvbnNlLmNvbnRlbnQpLnZhbF9zaWduaW5nX2luZm87XG4gICAgICAgICAgICBpZiAoc2lnbmluZ0luZm8pe1xuICAgICAgICAgICAgICAgIGxldCB2YWxEYXRhID0gdmFsaWRhdG9yU2V0W2tleV1cbiAgICAgICAgICAgICAgICB2YWxEYXRhLnRvbWJzdG9uZWQgPSBzaWduaW5nSW5mby50b21ic3RvbmVkO1xuICAgICAgICAgICAgICAgIHZhbERhdGEuamFpbGVkX3VudGlsID0gc2lnbmluZ0luZm8uamFpbGVkX3VudGlsO1xuICAgICAgICAgICAgICAgIHZhbERhdGEuaW5kZXhfb2Zmc2V0ID0gcGFyc2VJbnQoc2lnbmluZ0luZm8uaW5kZXhfb2Zmc2V0KTtcbiAgICAgICAgICAgICAgICB2YWxEYXRhLnN0YXJ0X2hlaWdodCA9IHBhcnNlSW50KHNpZ25pbmdJbmZvLnN0YXJ0X2hlaWdodCk7XG4gICAgICAgICAgICAgICAgdmFsRGF0YS51cHRpbWUgPSAoc2xhc2hpbmdQYXJhbXMucGFyYW1zLnNpZ25lZF9ibG9ja3Nfd2luZG93IC0gcGFyc2VJbnQoc2lnbmluZ0luZm8ubWlzc2VkX2Jsb2Nrc19jb3VudGVyKSkvc2xhc2hpbmdQYXJhbXMucGFyYW1zLnNpZ25lZF9ibG9ja3Nfd2luZG93ICogMTAwO1xuICAgICAgICAgICAgICAgIFZhbGlkYXRvcnMudXBzZXJ0KHtiZWNoMzJWYWxDb25zQWRkcmVzczp2YWxpZGF0b3JTZXRba2V5XS5iZWNoMzJWYWxDb25zQWRkcmVzc30sIHskc2V0OnZhbERhdGF9KVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNhdGNoKGUpe1xuICAgICAgICAgICAgY29uc29sZS5sb2codXJsKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiR2V0dGluZyBzaWduaW5nIGluZm8gb2YgJW86ICVvXCIsIHZhbGlkYXRvclNldFtrZXldLmJlY2gzMlZhbENvbnNBZGRyZXNzLCBlKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuY2FsY3VsYXRlVlBEaXN0ID0gYXN5bmMgKGFuYWx5dGljc0RhdGEsIGJsb2NrRGF0YSkgPT4ge1xuICAgIGNvbnNvbGUubG9nKFwiPT09PT0gY2FsY3VsYXRlIHZvdGluZyBwb3dlciBkaXN0cmlidXRpb24gPT09PT1cIik7XG4gICAgbGV0IGFjdGl2ZVZhbGlkYXRvcnMgPSBWYWxpZGF0b3JzLmZpbmQoe3N0YXR1czonQk9ORF9TVEFUVVNfQk9OREVEJyxqYWlsZWQ6ZmFsc2V9LHtzb3J0Ont2b3RpbmdfcG93ZXI6LTF9fSkuZmV0Y2goKTtcbiAgICBsZXQgbnVtVG9wVHdlbnR5ID0gTWF0aC5jZWlsKGFjdGl2ZVZhbGlkYXRvcnMubGVuZ3RoKjAuMik7XG4gICAgbGV0IG51bUJvdHRvbUVpZ2h0eSA9IGFjdGl2ZVZhbGlkYXRvcnMubGVuZ3RoIC0gbnVtVG9wVHdlbnR5O1xuXG4gICAgbGV0IHRvcFR3ZW50eVBvd2VyID0gMDtcbiAgICBsZXQgYm90dG9tRWlnaHR5UG93ZXIgPSAwO1xuXG4gICAgbGV0IG51bVRvcFRoaXJ0eUZvdXIgPSAwO1xuICAgIGxldCBudW1Cb3R0b21TaXh0eVNpeCA9IDA7XG4gICAgbGV0IHRvcFRoaXJ0eUZvdXJQZXJjZW50ID0gMDtcbiAgICBsZXQgYm90dG9tU2l4dHlTaXhQZXJjZW50ID0gMDtcblxuXG5cbiAgICBmb3IgKHYgaW4gYWN0aXZlVmFsaWRhdG9ycyl7XG4gICAgICAgIGlmICh2IDwgbnVtVG9wVHdlbnR5KXtcbiAgICAgICAgICAgIHRvcFR3ZW50eVBvd2VyICs9IGFjdGl2ZVZhbGlkYXRvcnNbdl0udm90aW5nX3Bvd2VyO1xuICAgICAgICB9XG4gICAgICAgIGVsc2V7XG4gICAgICAgICAgICBib3R0b21FaWdodHlQb3dlciArPSBhY3RpdmVWYWxpZGF0b3JzW3ZdLnZvdGluZ19wb3dlcjtcbiAgICAgICAgfVxuXG5cbiAgICAgICAgaWYgKHRvcFRoaXJ0eUZvdXJQZXJjZW50IDwgMC4zNCl7XG4gICAgICAgICAgICB0b3BUaGlydHlGb3VyUGVyY2VudCArPSBhY3RpdmVWYWxpZGF0b3JzW3ZdLnZvdGluZ19wb3dlciAvIGFuYWx5dGljc0RhdGEudm90aW5nX3Bvd2VyO1xuICAgICAgICAgICAgbnVtVG9wVGhpcnR5Rm91cisrO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgYm90dG9tU2l4dHlTaXhQZXJjZW50ID0gMSAtIHRvcFRoaXJ0eUZvdXJQZXJjZW50O1xuICAgIG51bUJvdHRvbVNpeHR5U2l4ID0gYWN0aXZlVmFsaWRhdG9ycy5sZW5ndGggLSBudW1Ub3BUaGlydHlGb3VyO1xuXG4gICAgbGV0IHZwRGlzdCA9IHtcbiAgICAgICAgaGVpZ2h0OiBibG9ja0RhdGEuaGVpZ2h0LFxuICAgICAgICBudW1Ub3BUd2VudHk6IG51bVRvcFR3ZW50eSxcbiAgICAgICAgdG9wVHdlbnR5UG93ZXI6IHRvcFR3ZW50eVBvd2VyLFxuICAgICAgICBudW1Cb3R0b21FaWdodHk6IG51bUJvdHRvbUVpZ2h0eSxcbiAgICAgICAgYm90dG9tRWlnaHR5UG93ZXI6IGJvdHRvbUVpZ2h0eVBvd2VyLFxuICAgICAgICBudW1Ub3BUaGlydHlGb3VyOiBudW1Ub3BUaGlydHlGb3VyLFxuICAgICAgICB0b3BUaGlydHlGb3VyUGVyY2VudDogdG9wVGhpcnR5Rm91clBlcmNlbnQsXG4gICAgICAgIG51bUJvdHRvbVNpeHR5U2l4OiBudW1Cb3R0b21TaXh0eVNpeCxcbiAgICAgICAgYm90dG9tU2l4dHlTaXhQZXJjZW50OiBib3R0b21TaXh0eVNpeFBlcmNlbnQsXG4gICAgICAgIG51bVZhbGlkYXRvcnM6IGFjdGl2ZVZhbGlkYXRvcnMubGVuZ3RoLFxuICAgICAgICB0b3RhbFZvdGluZ1Bvd2VyOiBhbmFseXRpY3NEYXRhLnZvdGluZ19wb3dlcixcbiAgICAgICAgYmxvY2tUaW1lOiBibG9ja0RhdGEudGltZSxcbiAgICAgICAgY3JlYXRlQXQ6IG5ldyBEYXRlKClcbiAgICB9XG5cbiAgICBjb25zb2xlLmxvZyh2cERpc3QpO1xuXG4gICAgVlBEaXN0cmlidXRpb25zLmluc2VydCh2cERpc3QpO1xufVxuXG4vLyB2YXIgZmlsdGVyZWQgPSBbMSwgMiwgMywgNCwgNV0uZmlsdGVyKG5vdENvbnRhaW5lZEluKFsxLCAyLCAzLCA1XSkpO1xuLy8gY29uc29sZS5sb2coZmlsdGVyZWQpOyAvLyBbNF1cblxuTWV0ZW9yLm1ldGhvZHMoe1xuICAgICdibG9ja3MuYXZlcmFnZUJsb2NrVGltZScoYWRkcmVzcyl7XG4gICAgICAgIHRoaXMudW5ibG9jaygpO1xuICAgICAgICBsZXQgYmxvY2tzID0gQmxvY2tzY29uLmZpbmQoe3Byb3Bvc2VyQWRkcmVzczphZGRyZXNzfSkuZmV0Y2goKTtcbiAgICAgICAgbGV0IGhlaWdodHMgPSBibG9ja3MubWFwKChibG9jaykgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIGJsb2NrLmhlaWdodDtcbiAgICAgICAgfSk7XG4gICAgICAgIGxldCBibG9ja3NTdGF0cyA9IEFuYWx5dGljcy5maW5kKHtoZWlnaHQ6eyRpbjpoZWlnaHRzfX0pLmZldGNoKCk7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKGJsb2Nrc1N0YXRzKTtcblxuICAgICAgICBsZXQgdG90YWxCbG9ja0RpZmYgPSAwO1xuICAgICAgICBmb3IgKGIgaW4gYmxvY2tzU3RhdHMpe1xuICAgICAgICAgICAgdG90YWxCbG9ja0RpZmYgKz0gYmxvY2tzU3RhdHNbYl0udGltZURpZmY7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRvdGFsQmxvY2tEaWZmL2hlaWdodHMubGVuZ3RoO1xuICAgIH0sXG4gICAgJ2Jsb2Nrcy5nZXRMYXRlc3RIZWlnaHQnOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy51bmJsb2NrKCk7XG4gICAgICAgIGxldCB1cmwgPSBSUEMrJy9zdGF0dXMnO1xuICAgICAgICB0cnl7XG4gICAgICAgICAgICBsZXQgcmVzcG9uc2UgPSBIVFRQLmdldCh1cmwpO1xuICAgICAgICAgICAgbGV0IHN0YXR1cyA9IEpTT04ucGFyc2UocmVzcG9uc2UuY29udGVudCk7XG4gICAgICAgICAgICByZXR1cm4gKHN0YXR1cy5yZXN1bHQuc3luY19pbmZvLmxhdGVzdF9ibG9ja19oZWlnaHQpO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlKXtcbiAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAnYmxvY2tzLmdldEN1cnJlbnRIZWlnaHQnOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy51bmJsb2NrKCk7XG4gICAgICAgIGxldCBjdXJySGVpZ2h0ID0gQmxvY2tzY29uLmZpbmQoe30se3NvcnQ6e2hlaWdodDotMX0sbGltaXQ6MX0pLmZldGNoKCk7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKFwiY3VycmVudEhlaWdodDpcIitjdXJySGVpZ2h0KTtcbiAgICAgICAgbGV0IHN0YXJ0SGVpZ2h0ID0gTWV0ZW9yLnNldHRpbmdzLnBhcmFtcy5zdGFydEhlaWdodDtcbiAgICAgICAgaWYgKGN1cnJIZWlnaHQgJiYgY3VyckhlaWdodC5sZW5ndGggPT0gMSkge1xuICAgICAgICAgICAgbGV0IGhlaWdodCA9IGN1cnJIZWlnaHRbMF0uaGVpZ2h0O1xuICAgICAgICAgICAgaWYgKGhlaWdodCA+IHN0YXJ0SGVpZ2h0KVxuICAgICAgICAgICAgICAgIHJldHVybiBoZWlnaHRcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3RhcnRIZWlnaHRcbiAgICB9LFxuICAgICdibG9ja3MuYmxvY2tzVXBkYXRlJzogYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMudW5ibG9jaygpO1xuICAgICAgICBpZiAoU1lOQ0lORylcbiAgICAgICAgICAgIHJldHVybiBcIlN5bmNpbmcuLi5cIjtcbiAgICAgICAgZWxzZSBjb25zb2xlLmxvZyhcInN0YXJ0IHRvIHN5bmNcIik7XG4gICAgICAgIC8vIE1ldGVvci5jbGVhckludGVydmFsKE1ldGVvci50aW1lckhhbmRsZSk7XG4gICAgICAgIC8vIGdldCB0aGUgbGF0ZXN0IGhlaWdodFxuICAgICAgICBsZXQgdW50aWwgPSBNZXRlb3IuY2FsbCgnYmxvY2tzLmdldExhdGVzdEhlaWdodCcpO1xuICAgICAgICAvLyBjb25zb2xlLmxvZyh1bnRpbCk7XG4gICAgICAgIC8vIGdldCB0aGUgY3VycmVudCBoZWlnaHQgaW4gZGJcbiAgICAgICAgbGV0IGN1cnIgPSBNZXRlb3IuY2FsbCgnYmxvY2tzLmdldEN1cnJlbnRIZWlnaHQnKTtcbiAgICAgICAgY29uc29sZS5sb2coY3Vycik7XG4gICAgICAgIC8vIGxvb3AgaWYgdGhlcmUncyB1cGRhdGUgaW4gZGJcbiAgICAgICAgaWYgKHVudGlsID4gY3Vycikge1xuICAgICAgICAgICAgU1lOQ0lORyA9IHRydWU7XG5cbiAgICAgICAgICAgIGxldCB2YWxpZGF0b3JTZXQgPSBbXTtcbiAgICAgICAgICAgIC8vIGdldCBsYXRlc3QgdmFsaWRhdG9yIGNhbmRpZGF0ZSBpbmZvcm1hdGlvblxuXG4gICAgICAgICAgICBsZXQgdXJsID0gQVBJICsgJy9jb3Ntb3Mvc3Rha2luZy92MWJldGExL3ZhbGlkYXRvcnM/c3RhdHVzPUJPTkRfU1RBVFVTX0JPTkRFRCZwYWdpbmF0aW9uLmxpbWl0PTIwMCZwYWdpbmF0aW9uLmNvdW50X3RvdGFsPXRydWUnO1xuXG4gICAgICAgICAgICB0cnl7XG4gICAgICAgICAgICAgICAgbGV0IHJlc3BvbnNlID0gSFRUUC5nZXQodXJsKTtcbiAgICAgICAgICAgICAgICBsZXQgcmVzdWx0ID0gSlNPTi5wYXJzZShyZXNwb25zZS5jb250ZW50KS52YWxpZGF0b3JzO1xuICAgICAgICAgICAgICAgIHJlc3VsdC5mb3JFYWNoKCh2YWxpZGF0b3IpID0+IHZhbGlkYXRvclNldFt2YWxpZGF0b3IuY29uc2Vuc3VzX3B1YmtleS5rZXldID0gdmFsaWRhdG9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGNoKGUpe1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHVybCk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRyeXtcbiAgICAgICAgICAgICAgICB1cmwgPSBBUEkgKyAnL2Nvc21vcy9zdGFraW5nL3YxYmV0YTEvdmFsaWRhdG9ycz9zdGF0dXM9Qk9ORF9TVEFUVVNfVU5CT05ESU5HJnBhZ2luYXRpb24ubGltaXQ9MjAwJnBhZ2luYXRpb24uY291bnRfdG90YWw9dHJ1ZSc7XG4gICAgICAgICAgICAgICAgbGV0IHJlc3BvbnNlID0gSFRUUC5nZXQodXJsKTtcbiAgICAgICAgICAgICAgICBsZXQgcmVzdWx0ID0gSlNPTi5wYXJzZShyZXNwb25zZS5jb250ZW50KS52YWxpZGF0b3JzO1xuICAgICAgICAgICAgICAgIHJlc3VsdC5mb3JFYWNoKCh2YWxpZGF0b3IpID0+IHZhbGlkYXRvclNldFt2YWxpZGF0b3IuY29uc2Vuc3VzX3B1YmtleS5rZXldID0gdmFsaWRhdG9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGNoKGUpe1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHVybCk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRyeXtcbiAgICAgICAgICAgICAgICB1cmwgPSBBUEkgKyAnL2Nvc21vcy9zdGFraW5nL3YxYmV0YTEvdmFsaWRhdG9ycz9zdGF0dXM9Qk9ORF9TVEFUVVNfVU5CT05ERUQmcGFnaW5hdGlvbi5saW1pdD0yMDAmcGFnaW5hdGlvbi5jb3VudF90b3RhbD10cnVlJztcbiAgICAgICAgICAgICAgICBsZXQgcmVzcG9uc2UgPSBIVFRQLmdldCh1cmwpO1xuICAgICAgICAgICAgICAgIGxldCByZXN1bHQgPSBKU09OLnBhcnNlKHJlc3BvbnNlLmNvbnRlbnQpLnZhbGlkYXRvcnM7XG4gICAgICAgICAgICAgICAgcmVzdWx0LmZvckVhY2goKHZhbGlkYXRvcikgPT4gdmFsaWRhdG9yU2V0W3ZhbGlkYXRvci5jb25zZW5zdXNfcHVia2V5LmtleV0gPSB2YWxpZGF0b3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2F0Y2goZSl7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2codXJsKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coXCJ2YWxpZGFvdG9yIHNldDogJW9cIiwgdmFsaWRhdG9yU2V0KTtcbiAgICAgICAgICAgIGxldCB0b3RhbFZhbGlkYXRvcnMgPSBPYmplY3Qua2V5cyh2YWxpZGF0b3JTZXQpLmxlbmd0aDtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiYWxsIHZhbGlkYXRvcnM6IFwiKyB0b3RhbFZhbGlkYXRvcnMpO1xuICAgICAgICAgICAgQ2hhaW4udXBkYXRlKHtjaGFpbklkOk1ldGVvci5zZXR0aW5ncy5wdWJsaWMuY2hhaW5JZH0sIHskc2V0Ont0b3RhbFZhbGlkYXRvcnM6dG90YWxWYWxpZGF0b3JzfX0pO1xuXG4gICAgICAgICAgICBmb3IgKGxldCBoZWlnaHQgPSBjdXJyKzEgOyBoZWlnaHQgPD0gdW50aWwgOyBoZWlnaHQrKykge1xuICAgICAgICAgICAgLy8gZm9yIChsZXQgaGVpZ2h0ID0gY3VycisxIDsgaGVpZ2h0IDw9IGN1cnIrMSA7IGhlaWdodCsrKSB7XG4gICAgICAgICAgICAgICAgbGV0IHN0YXJ0QmxvY2tUaW1lID0gbmV3IERhdGUoKTtcbiAgICAgICAgICAgICAgICAvLyBhZGQgdGltZW91dCBoZXJlPyBhbmQgb3V0c2lkZSB0aGlzIGxvb3AgKGZvciBjYXRjaGVkIHVwIGFuZCBrZWVwIGZldGNoaW5nKT9cbiAgICAgICAgICAgICAgICB0aGlzLnVuYmxvY2soKTtcbiAgICAgICAgICAgICAgICAvLyBsZXQgdXJsID0gUlBDKycvYmxvY2s/aGVpZ2h0PScgKyBoZWlnaHQ7XG5cbiAgICAgICAgICAgICAgICB1cmwgPSBgJHtBUEl9L2Jsb2Nrcy8ke2hlaWdodH1gO1xuICAgICAgICAgICAgICAgIGxldCBhbmFseXRpY3NEYXRhID0ge307XG5cbiAgICAgICAgICAgICAgICBjb25zdCBidWxrVmFsaWRhdG9ycyA9IFZhbGlkYXRvcnMucmF3Q29sbGVjdGlvbigpLmluaXRpYWxpemVVbm9yZGVyZWRCdWxrT3AoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBidWxrVXBkYXRlTGFzdFNlZW4gPSBWYWxpZGF0b3JzLnJhd0NvbGxlY3Rpb24oKS5pbml0aWFsaXplVW5vcmRlcmVkQnVsa09wKCk7XG4gICAgICAgICAgICAgICAgY29uc3QgYnVsa1ZhbGlkYXRvclJlY29yZHMgPSBWYWxpZGF0b3JSZWNvcmRzLnJhd0NvbGxlY3Rpb24oKS5pbml0aWFsaXplVW5vcmRlcmVkQnVsa09wKCk7XG4gICAgICAgICAgICAgICAgY29uc3QgYnVsa1ZQSGlzdG9yeSA9IFZvdGluZ1Bvd2VySGlzdG9yeS5yYXdDb2xsZWN0aW9uKCkuaW5pdGlhbGl6ZVVub3JkZXJlZEJ1bGtPcCgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGJ1bGtUcmFuc2FjdGlvbnMgPSBUcmFuc2FjdGlvbnMucmF3Q29sbGVjdGlvbigpLmluaXRpYWxpemVVbm9yZGVyZWRCdWxrT3AoKTtcblxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiR2V0dGluZyBibG9jayBhdCBoZWlnaHQ6ICVvXCIsIGhlaWdodCk7XG4gICAgICAgICAgICAgICAgdHJ5e1xuICAgICAgICAgICAgICAgICAgICBsZXQgc3RhcnRHZXRIZWlnaHRUaW1lID0gbmV3IERhdGUoKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGxldCByZXNwb25zZSA9IEhUVFAuZ2V0KHVybCk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gc3RvcmUgaGVpZ2h0LCBoYXNoLCBudW10cmFuc2FjdGlvbiBhbmQgdGltZSBpbiBkYlxuICAgICAgICAgICAgICAgICAgICBsZXQgYmxvY2tEYXRhID0ge307XG4gICAgICAgICAgICAgICAgICAgIGxldCBibG9jayA9IEpTT04ucGFyc2UocmVzcG9uc2UuY29udGVudCk7XG4gICAgICAgICAgICAgICAgICAgIGJsb2NrRGF0YS5oZWlnaHQgPSBoZWlnaHQ7XG4gICAgICAgICAgICAgICAgICAgIGJsb2NrRGF0YS5oYXNoID0gYmxvY2suYmxvY2tfaWQuaGFzaDtcbiAgICAgICAgICAgICAgICAgICAgYmxvY2tEYXRhLnRyYW5zTnVtID0gYmxvY2suYmxvY2suZGF0YS50eHM/YmxvY2suYmxvY2suZGF0YS50eHMubGVuZ3RoOjA7XG4gICAgICAgICAgICAgICAgICAgIGJsb2NrRGF0YS50aW1lID0gYmxvY2suYmxvY2suaGVhZGVyLnRpbWU7XG4gICAgICAgICAgICAgICAgICAgIGJsb2NrRGF0YS5sYXN0QmxvY2tIYXNoID0gYmxvY2suYmxvY2suaGVhZGVyLmxhc3RfYmxvY2tfaWQuaGFzaDtcbiAgICAgICAgICAgICAgICAgICAgYmxvY2tEYXRhLnByb3Bvc2VyQWRkcmVzcyA9IGJsb2NrLmJsb2NrLmhlYWRlci5wcm9wb3Nlcl9hZGRyZXNzO1xuICAgICAgICAgICAgICAgICAgICBibG9ja0RhdGEudmFsaWRhdG9ycyA9IFtdO1xuXG5cbiAgICAgICAgICAgICAgICAgICAgLy8gc2F2ZSB0eHMgaW4gZGF0YWJhc2VcbiAgICAgICAgICAgICAgICAgICAgaWYgKGJsb2NrLmJsb2NrLmRhdGEudHhzICYmIGJsb2NrLmJsb2NrLmRhdGEudHhzLmxlbmd0aCA+IDApe1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yICh0IGluIGJsb2NrLmJsb2NrLmRhdGEudHhzKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBidWxrVHJhbnNhY3Rpb25zLmluc2VydCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGhhc2ggaGFzIHRvIGJlIGluIHVwcGVyY2FzZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eGhhc2g6IHNoYTI1NihCdWZmZXIuZnJvbShibG9jay5ibG9jay5kYXRhLnR4c1t0XSwgJ2Jhc2U2NCcpKS50b1VwcGVyQ2FzZSgpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IHBhcnNlSW50KGhlaWdodCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2Nlc3NlZDogZmFsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYnVsa1RyYW5zYWN0aW9ucy5sZW5ndGggPiAwKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBidWxrVHJhbnNhY3Rpb25zLmV4ZWN1dGUoKGVyciwgcmVzdWx0KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlcnIpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVzdWx0KXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIHNhdmUgZG91YmxlIHNpZ24gZXZpZGVuY2VzXG4gICAgICAgICAgICAgICAgICAgIGlmIChibG9jay5ibG9jay5ldmlkZW5jZS5ldmlkZW5jZUxpc3Qpe1xuICAgICAgICAgICAgICAgICAgICAgICAgRXZpZGVuY2VzLmluc2VydCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiBoZWlnaHQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXZpZGVuY2U6IGJsb2NrLmJsb2NrLmV2aWRlbmNlLmV2aWRlbmNlTGlzdFxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcInNpZ25hdHVyZXM6ICVvXCIsIGJsb2NrLmJsb2NrLmxhc3RDb21taXQuc2lnbmF0dXJlc0xpc3QpXG5cbiAgICAgICAgICAgICAgICAgICAgYmxvY2tEYXRhLnByZWNvbW1pdHNDb3VudCA9IGJsb2NrLmJsb2NrLmxhc3RfY29tbWl0LnNpZ25hdHVyZXMubGVuZ3RoO1xuXG4gICAgICAgICAgICAgICAgICAgIGFuYWx5dGljc0RhdGEuaGVpZ2h0ID0gaGVpZ2h0O1xuXG4gICAgICAgICAgICAgICAgICAgIGxldCBlbmRHZXRIZWlnaHRUaW1lID0gbmV3IERhdGUoKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJHZXQgaGVpZ2h0IHRpbWU6IFwiKygoZW5kR2V0SGVpZ2h0VGltZS1zdGFydEdldEhlaWdodFRpbWUpLzEwMDApK1wic2Vjb25kcy5cIik7XG5cblxuICAgICAgICAgICAgICAgICAgICBsZXQgc3RhcnRHZXRWYWxpZGF0b3JzVGltZSA9IG5ldyBEYXRlKCk7XG4gICAgICAgICAgICAgICAgICAgIC8vIHVwZGF0ZSBjaGFpbiBzdGF0dXNcblxuICAgICAgICAgICAgICAgICAgICBsZXQgdmFsaWRhdG9ycyA9IFtdXG4gICAgICAgICAgICAgICAgICAgIGxldCBwYWdlID0gMDtcbiAgICAgICAgICAgICAgICAgICAgLy8gbGV0IG5leHRLZXkgPSAwO1xuICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHJlc3VsdDtcblxuICAgICAgICAgICAgICAgICAgICAgICAgZG8ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCB1cmwgPSBSUEMrYC92YWxpZGF0b3JzP2hlaWdodD0ke2hlaWdodH0mcGFnZT0keysrcGFnZX0mcGVyX3BhZ2U9MTAwYDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgcmVzcG9uc2UgPSBIVFRQLmdldCh1cmwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IEpTT04ucGFyc2UocmVzcG9uc2UuY29udGVudCkucmVzdWx0O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwiPT09PT09PT09IHZhbGlkYXRvciByZXN1bHQgPT09PT09PT09PTogJW9cIiwgcmVzdWx0KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbGlkYXRvcnMgPSBbLi4udmFsaWRhdG9ycywgLi4ucmVzdWx0LnZhbGlkYXRvcnNdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyh2YWxpZGF0b3JzLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2cocGFyc2VJbnQocmVzdWx0LnRvdGFsKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB3aGlsZSAodmFsaWRhdG9ycy5sZW5ndGggPCBwYXJzZUludChyZXN1bHQudG90YWwpKVxuXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY2F0Y2goZSl7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkdldHRpbmcgdmFsaWRhdG9yIHNldCBhdCBoZWlnaHQgJW86ICVvXCIsIGhlaWdodCwgZSlcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKHZhbGlkYXRvcnMpXG5cbiAgICAgICAgICAgICAgICAgICAgVmFsaWRhdG9yU2V0cy5pbnNlcnQoe1xuICAgICAgICAgICAgICAgICAgICAgICAgYmxvY2tfaGVpZ2h0OiBoZWlnaHQsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWxpZGF0b3JzOiB2YWxpZGF0b3JzXG4gICAgICAgICAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICAgICAgICAgICAgYmxvY2tEYXRhLnZhbGlkYXRvcnNDb3VudCA9IHZhbGlkYXRvcnMubGVuZ3RoO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIHRlbXBvcmFyaWx5IGFkZCBiZWNoMzIgY29uY2Vuc3VzIGtleXMgdG8gdGhlIHZhbGlkYXRvciBzZXQgbGlzdFxuICAgICAgICAgICAgICAgICAgICBsZXQgdGVtcFZhbGlkYXRvcnMgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgdiBpbiB2YWxpZGF0b3JzKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHZhbGlkYXRvcnNbdl0uY29uc2Vuc3VzX3B1YmtleSA9IE1ldGVvci5jYWxsKCdwdWJrZXlUb0JlY2gzMk9sZCcsIHZhbGlkYXRvcnNbdl0ucHViX2tleSwgTWV0ZW9yLnNldHRpbmdzLnB1YmxpYy5iZWNoMzJQcmVmaXhDb25zUHViKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHZhbGlkYXRvcnNbdl0udmFsY29uc0FkZHJlc3MgPSB2YWxpZGF0b3JzW3ZdLmFkZHJlc3M7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWxpZGF0b3JzW3ZdLnZhbGNvbnNBZGRyZXNzID0gTWV0ZW9yLmNhbGwoJ2hleFRvQmVjaDMyJywgdmFsaWRhdG9yc1t2XS5hZGRyZXNzLCBNZXRlb3Iuc2V0dGluZ3MucHVibGljLmJlY2gzMlByZWZpeENvbnNBZGRyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHZhbGlkYXRvcnNbdl0uYWRkcmVzcyA9IE1ldGVvci5jYWxsKCdnZXRBZGRyZXNzRnJvbVB1YmtleScsIHZhbGlkYXRvcnNbdl0ucHViS2V5KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHRlbXBWYWxpZGF0b3JzW3ZhbGlkYXRvcnNbdl0ucHViS2V5LnZhbHVlXSA9IHZhbGlkYXRvcnNbdl07XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZW1wVmFsaWRhdG9yc1t2YWxpZGF0b3JzW3ZdLmFkZHJlc3NdID0gdmFsaWRhdG9yc1t2XTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB2YWxpZGF0b3JzID0gdGVtcFZhbGlkYXRvcnM7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coXCJiZWZvcmUgY29tcGFyaW5nIHByZWNvbW1pdHM6ICVvXCIsIHZhbGlkYXRvcnMpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIFRlbmRlcm1pbnQgdjAuMzMgc3RhcnQgdXNpbmcgXCJzaWduYXR1cmVzXCIgaW4gbGFzdCBibG9jayBpbnN0ZWFkIG9mIFwicHJlY29tbWl0c1wiXG4gICAgICAgICAgICAgICAgICAgIGxldCBwcmVjb21taXRzID0gYmxvY2suYmxvY2subGFzdF9jb21taXQuc2lnbmF0dXJlczsgXG4gICAgICAgICAgICAgICAgICAgIGlmIChwcmVjb21taXRzICE9IG51bGwpe1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2cocHJlY29tbWl0cyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpPTA7IGk8cHJlY29tbWl0cy5sZW5ndGg7IGkrKyl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHByZWNvbW1pdHNbaV0gIT0gbnVsbCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJsb2NrRGF0YS52YWxpZGF0b3JzLnB1c2gocHJlY29tbWl0c1tpXS52YWxpZGF0b3JfYWRkcmVzcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICBhbmFseXRpY3NEYXRhLnByZWNvbW1pdHMgPSBwcmVjb21taXRzLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHJlY29yZCBmb3IgYW5hbHl0aWNzXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBQcmVjb21taXRSZWNvcmRzLmluc2VydCh7aGVpZ2h0OmhlaWdodCwgcHJlY29tbWl0czpwcmVjb21taXRzLmxlbmd0aH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGhlaWdodCA+IDEpe1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gcmVjb3JkIHByZWNvbW1pdHMgYW5kIGNhbGN1bGF0ZSB1cHRpbWVcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIG9ubHkgcmVjb3JkIGZyb20gYmxvY2sgMlxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJJbnNlcnRpbmcgcHJlY29tbWl0c1wiKVxuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChpIGluIHZhbGlkYXRvcnMpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBhZGRyZXNzID0gdmFsaWRhdG9yc1tpXS5hZGRyZXNzO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCByZWNvcmQgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhlaWdodDogaGVpZ2h0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhZGRyZXNzOiBhZGRyZXNzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleGlzdHM6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2b3RpbmdfcG93ZXI6IHBhcnNlSW50KHZhbGlkYXRvcnNbaV0udm90aW5nX3Bvd2VyKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAoaiBpbiBwcmVjb21taXRzKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHByZWNvbW1pdHNbal0gIT0gbnVsbCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgcHJlY29tbWl0QWRkcmVzcyA9IHByZWNvbW1pdHNbal0udmFsaWRhdG9yX2FkZHJlc3M7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWRkcmVzcyA9PSBwcmVjb21taXRBZGRyZXNzKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWNvcmQuZXhpc3RzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBidWxrVXBkYXRlTGFzdFNlZW4uZmluZCh7YWRkcmVzczpwcmVjb21taXRBZGRyZXNzfSkudXBzZXJ0KCkudXBkYXRlT25lKHskc2V0OntsYXN0U2VlbjpibG9ja0RhdGEudGltZX19KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcmVjb21taXRzLnNwbGljZShqLDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnVsa1ZhbGlkYXRvclJlY29yZHMuaW5zZXJ0KHJlY29yZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVmFsaWRhdG9yUmVjb3Jkcy51cGRhdGUoe2hlaWdodDpoZWlnaHQsYWRkcmVzczpyZWNvcmQuYWRkcmVzc30scmVjb3JkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGxldCBzdGFydEJsb2NrSW5zZXJ0VGltZSA9IG5ldyBEYXRlKCk7XG4gICAgICAgICAgICAgICAgICAgIEJsb2Nrc2Nvbi5pbnNlcnQoYmxvY2tEYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGVuZEJsb2NrSW5zZXJ0VGltZSA9IG5ldyBEYXRlKCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQmxvY2sgaW5zZXJ0IHRpbWU6IFwiKygoZW5kQmxvY2tJbnNlcnRUaW1lLXN0YXJ0QmxvY2tJbnNlcnRUaW1lKS8xMDAwKStcInNlY29uZHMuXCIpO1xuXG4gICAgICAgICAgICAgICAgICAgIGxldCBjaGFpblN0YXR1cyA9IENoYWluLmZpbmRPbmUoe2NoYWluSWQ6YmxvY2suYmxvY2suaGVhZGVyLmNoYWluX2lkfSk7XG4gICAgICAgICAgICAgICAgICAgIGxldCBsYXN0U3luY2VkVGltZSA9IGNoYWluU3RhdHVzP2NoYWluU3RhdHVzLmxhc3RTeW5jZWRUaW1lOjA7XG4gICAgICAgICAgICAgICAgICAgIGxldCB0aW1lRGlmZjtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGJsb2NrVGltZSA9IE1ldGVvci5zZXR0aW5ncy5wYXJhbXMuZGVmYXVsdEJsb2NrVGltZTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGxhc3RTeW5jZWRUaW1lKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBkYXRlTGF0ZXN0ID0gbmV3IERhdGUoYmxvY2tEYXRhLnRpbWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGRhdGVMYXN0ID0gbmV3IERhdGUobGFzdFN5bmNlZFRpbWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGdlbmVzaXNUaW1lID0gbmV3IERhdGUoTWV0ZW9yLnNldHRpbmdzLnB1YmxpYy5nZW5lc2lzVGltZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aW1lRGlmZiA9IE1hdGguYWJzKGRhdGVMYXRlc3QuZ2V0VGltZSgpIC0gZGF0ZUxhc3QuZ2V0VGltZSgpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGJsb2NrVGltZSA9IChjaGFpblN0YXR1cy5ibG9ja1RpbWUgKiAoYmxvY2tEYXRhLmhlaWdodCAtIDEpICsgdGltZURpZmYpIC8gYmxvY2tEYXRhLmhlaWdodDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJsb2NrVGltZSA9IChkYXRlTGF0ZXN0LmdldFRpbWUoKSAtIGdlbmVzaXNUaW1lLmdldFRpbWUoKSkgLyBibG9ja0RhdGEuaGVpZ2h0O1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgbGV0IGVuZEdldFZhbGlkYXRvcnNUaW1lID0gbmV3IERhdGUoKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJHZXQgaGVpZ2h0IHZhbGlkYXRvcnMgdGltZTogXCIrKChlbmRHZXRWYWxpZGF0b3JzVGltZS1zdGFydEdldFZhbGlkYXRvcnNUaW1lKS8xMDAwKStcInNlY29uZHMuXCIpO1xuXG4gICAgICAgICAgICAgICAgICAgIENoYWluLnVwZGF0ZSh7Y2hhaW5JZDpibG9jay5ibG9jay5oZWFkZXIuY2hhaW5JZH0sIHskc2V0OntsYXN0U3luY2VkVGltZTpibG9ja0RhdGEudGltZSwgYmxvY2tUaW1lOmJsb2NrVGltZX19KTtcblxuICAgICAgICAgICAgICAgICAgICBhbmFseXRpY3NEYXRhLmF2ZXJhZ2VCbG9ja1RpbWUgPSBibG9ja1RpbWU7XG4gICAgICAgICAgICAgICAgICAgIGFuYWx5dGljc0RhdGEudGltZURpZmYgPSB0aW1lRGlmZjtcblxuICAgICAgICAgICAgICAgICAgICBhbmFseXRpY3NEYXRhLnRpbWUgPSBibG9ja0RhdGEudGltZTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBpbml0aWFsaXplIHZhbGlkYXRvciBkYXRhIGF0IGZpcnN0IGJsb2NrXG4gICAgICAgICAgICAgICAgICAgIC8vIGlmIChoZWlnaHQgPT0gMSl7XG4gICAgICAgICAgICAgICAgICAgIC8vICAgICBWYWxpZGF0b3JzLnJlbW92ZSh7fSk7XG4gICAgICAgICAgICAgICAgICAgIC8vIH1cblxuICAgICAgICAgICAgICAgICAgICBhbmFseXRpY3NEYXRhLnZvdGluZ19wb3dlciA9IDA7XG5cbiAgICAgICAgICAgICAgICAgICAgbGV0IHN0YXJ0RmluZFZhbGlkYXRvcnNOYW1lVGltZSA9IG5ldyBEYXRlKCk7XG4gICAgICAgICAgICAgICAgICAgIGZvciAodiBpbiB2YWxpZGF0b3JTZXQpe1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHZhbERhdGEgPSB2YWxpZGF0b3JTZXRbdl07XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbERhdGEudG9rZW5zID0gcGFyc2VJbnQodmFsRGF0YS50b2tlbnMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFsRGF0YS51bmJvbmRpbmdfaGVpZ2h0ID0gcGFyc2VJbnQodmFsRGF0YS51bmJvbmRpbmdfaGVpZ2h0KVxuXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgdmFsRXhpc3QgPSBWYWxpZGF0b3JzLmZpbmRPbmUoe1wiY29uc2Vuc3VzX3B1YmtleS5rZXlcIjp2fSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyh2YWxEYXRhKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coXCI9PT09PSB2b3RpbmcgcG93ZXIgPT09PT09OiAlb1wiLCB2YWxEYXRhKVxuICAgICAgICAgICAgICAgICAgICAgICAgYW5hbHl0aWNzRGF0YS52b3RpbmdfcG93ZXIgKz0gdmFsRGF0YS52b3RpbmdfcG93ZXJcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coYW5hbHl0aWNzRGF0YS52b3RpbmdfcG93ZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF2YWxFeGlzdCAmJiB2YWxEYXRhLmNvbnNlbnN1c19wdWJrZXkpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBsZXQgdmFsID0gZ2V0VmFsaWRhdG9yRnJvbUNvbnNlbnN1c0tleSh2YWxpZGF0b3JzLCB2KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBnZXQgdGhlIHZhbGlkYXRvciBoZXggYWRkcmVzcyBhbmQgb3RoZXIgYmVjaDMyIGFkZHJlc3Nlcy5cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbERhdGEuZGVsZWdhdG9yX2FkZHJlc3MgPSBNZXRlb3IuY2FsbCgnZ2V0RGVsZWdhdG9yJywgdmFsRGF0YS5vcGVyYXRvcl9hZGRyZXNzKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwiZ2V0IGhleCBhZGRyZXNzXCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gdmFsRGF0YS5hZGRyZXNzID0gZ2V0QWRkcmVzcyh2YWxEYXRhLmNvbnNlbnN1c1B1YmtleSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJnZXQgYmVjaDMyIGNvbnNlbnN1cyBwdWJrZXlcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsRGF0YS5iZWNoMzJDb25zZW5zdXNQdWJLZXkgPSBNZXRlb3IuY2FsbCgncHVia2V5VG9CZWNoMzInLCB2YWxEYXRhLmNvbnNlbnN1c19wdWJrZXksIE1ldGVvci5zZXR0aW5ncy5wdWJsaWMuYmVjaDMyUHJlZml4Q29uc1B1Yik7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWxEYXRhLmFkZHJlc3MgPSBNZXRlb3IuY2FsbCgnZ2V0QWRkcmVzc0Zyb21QdWJrZXknLCB2YWxEYXRhLmNvbnNlbnN1c19wdWJrZXkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbERhdGEuYmVjaDMyVmFsQ29uc0FkZHJlc3MgPSBNZXRlb3IuY2FsbCgnaGV4VG9CZWNoMzInLCB2YWxEYXRhLmFkZHJlc3MsIE1ldGVvci5zZXR0aW5ncy5wdWJsaWMuYmVjaDMyUHJlZml4Q29uc0FkZHIpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gYXNzaWduIGJhY2sgdG8gdGhlIHZhbGlkYXRvciBzZXQgc28gdGhhdCB3ZSBjYW4gdXNlIGl0IHRvIGZpbmQgdGhlIHVwdGltZVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHZhbGlkYXRvclNldFt2XSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsaWRhdG9yU2V0W3ZdLmJlY2gzMlZhbENvbnNBZGRyZXNzID0gdmFsRGF0YS5iZWNoMzJWYWxDb25zQWRkcmVzcztcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBGaXJzdCB0aW1lIGFkZGluZyB2YWxpZGF0b3IgdG8gdGhlIGRhdGFiYXNlLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEZldGNoIHByb2ZpbGUgcGljdHVyZSBmcm9tIEtleWJhc2VcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2YWxEYXRhLmRlc2NyaXB0aW9uICYmIHZhbERhdGEuZGVzY3JpcHRpb24uaWRlbnRpdHkpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cnl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWxEYXRhLnByb2ZpbGVfdXJsID0gZ2V0VmFsaWRhdG9yUHJvZmlsZVVybCh2YWxEYXRhLmRlc2NyaXB0aW9uLmlkZW50aXR5KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhdGNoIChlKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiRXJyb3IgZmV0Y2hpbmcga2V5YmFzZTogJW9cIiwgZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsRGF0YS5hY2NwdWIgPSBNZXRlb3IuY2FsbCgncHVia2V5VG9CZWNoMzInLCB2YWxEYXRhLmNvbnNlbnN1c19wdWJrZXksIE1ldGVvci5zZXR0aW5ncy5wdWJsaWMuYmVjaDMyUHJlZml4QWNjUHViKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWxEYXRhLm9wZXJhdG9yX3B1YmtleSA9IE1ldGVvci5jYWxsKCdwdWJrZXlUb0JlY2gzMicsIHZhbERhdGEuY29uc2Vuc3VzX3B1YmtleSwgTWV0ZW9yLnNldHRpbmdzLnB1YmxpYy5iZWNoMzJQcmVmaXhWYWxQdWIpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gaW5zZXJ0IGZpcnN0IHBvd2VyIGNoYW5nZSBoaXN0b3J5IFxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gdmFsRGF0YS52b3RpbmdfcG93ZXIgPSB2YWxpZGF0b3JzW3ZhbERhdGEuY29uc2Vuc3VzUHVia2V5LnZhbHVlXT9wYXJzZUludCh2YWxpZGF0b3JzW3ZhbERhdGEuY29uc2Vuc3VzUHVia2V5LnZhbHVlXS52b3RpbmdQb3dlcik6MDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWxEYXRhLnZvdGluZ19wb3dlciA9IHZhbGlkYXRvcnNbdmFsRGF0YS5hZGRyZXNzXT9wYXJzZUludCh2YWxpZGF0b3JzW3ZhbERhdGEuYWRkcmVzc10udm90aW5nX3Bvd2VyKTowO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbERhdGEucHJvcG9zZXJfcHJpb3JpdHkgPSB2YWxpZGF0b3JzW3ZhbERhdGEuYWRkcmVzc10/cGFyc2VJbnQodmFsaWRhdG9yc1t2YWxEYXRhLmFkZHJlc3NdLnByb3Bvc2VyX3ByaW9yaXR5KTowO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJWYWxpZGF0b3Igbm90IGZvdW5kLiBJbnNlcnQgZmlyc3QgVlAgY2hhbmdlIHJlY29yZC5cIilcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwiZmlyc3Qgdm90aW5nIHBvd2VyOiAlb1wiLCB2YWxEYXRhLnZvdGluZ19wb3dlcik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnVsa1ZQSGlzdG9yeS5pbnNlcnQoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhZGRyZXNzOiB2YWxEYXRhLmFkZHJlc3MsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByZXZfdm90aW5nX3Bvd2VyOiAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2b3RpbmdfcG93ZXI6IHZhbERhdGEudm90aW5nX3Bvd2VyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnYWRkJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiBibG9ja0RhdGEuaGVpZ2h0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBibG9ja190aW1lOiBibG9ja0RhdGEudGltZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2V7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2codmFsRGF0YSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsRGF0YS5hZGRyZXNzID0gdmFsRXhpc3QuYWRkcmVzcztcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGFzc2lnbiB0byB2YWxEYXRhIGZvciBnZXR0aW5nIHNlbGYgZGVsZWdhdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbERhdGEuZGVsZWdhdG9yX2FkZHJlc3MgPSB2YWxFeGlzdC5kZWxlZ2F0b3JfYWRkcmVzcztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWxEYXRhLmJlY2gzMlZhbENvbnNBZGRyZXNzID0gdmFsRXhpc3QuYmVjaDMyVmFsQ29uc0FkZHJlc3M7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodmFsaWRhdG9yU2V0W3ZdKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsaWRhdG9yU2V0W3ZdLmJlY2gzMlZhbENvbnNBZGRyZXNzID0gdmFsRXhpc3QuYmVjaDMyVmFsQ29uc0FkZHJlc3M7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKHZhbEV4aXN0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyh2YWxpZGF0b3JzW3ZhbEV4aXN0LmFkZHJlc3NdKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGlmICh2YWxpZGF0b3JzW3ZhbERhdGEuY29uc2Vuc3VzUHVia2V5LnZhbHVlXSl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHZhbGlkYXRvcnNbdmFsRXhpc3QuYWRkcmVzc10pe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBWYWxpZGF0b3IgZXhpc3RzIGFuZCBpcyBpbiB2YWxpZGF0b3Igc2V0LCB1cGRhdGUgdm9pdG5nIHBvd2VyLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBJZiB2b3RpbmcgcG93ZXIgaXMgZGlmZmVyZW50IGZyb20gYmVmb3JlLCBhZGQgdm90aW5nIHBvd2VyIGhpc3RvcnlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsRGF0YS52b3RpbmdfcG93ZXIgPSBwYXJzZUludCh2YWxpZGF0b3JzW3ZhbEV4aXN0LmFkZHJlc3NdLnZvdGluZ19wb3dlcik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbERhdGEucHJvcG9zZXJfcHJpb3JpdHkgPSBwYXJzZUludCh2YWxpZGF0b3JzW3ZhbEV4aXN0LmFkZHJlc3NdLnByb3Bvc2VyX3ByaW9yaXR5KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHByZXZWb3RpbmdQb3dlciA9IFZvdGluZ1Bvd2VySGlzdG9yeS5maW5kT25lKHthZGRyZXNzOnZhbEV4aXN0LmFkZHJlc3N9LCB7aGVpZ2h0Oi0xLCBsaW1pdDoxfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJWYWxpZGF0b3IgYWxyZWFkeSBpbiBEQi4gQ2hlY2sgaWYgVlAgY2hhbmdlZC5cIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwcmV2Vm90aW5nUG93ZXIpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHByZXZWb3RpbmdQb3dlci52b3RpbmdfcG93ZXIgIT0gdmFsRGF0YS52b3RpbmdfcG93ZXIpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBjaGFuZ2VUeXBlID0gKHByZXZWb3RpbmdQb3dlci52b3RpbmdfcG93ZXIgPiB2YWxEYXRhLnZvdGluZ19wb3dlcik/J2Rvd24nOid1cCc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGNoYW5nZURhdGEgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFkZHJlc3M6IHZhbEV4aXN0LmFkZHJlc3MsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByZXZfdm90aW5nX3Bvd2VyOiBwcmV2Vm90aW5nUG93ZXIudm90aW5nX3Bvd2VyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2b3RpbmdfcG93ZXI6IHZhbERhdGEudm90aW5nX3Bvd2VyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBjaGFuZ2VUeXBlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IGJsb2NrRGF0YS5oZWlnaHQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJsb2NrX3RpbWU6IGJsb2NrRGF0YS50aW1lXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBidWxrVlBIaXN0b3J5Lmluc2VydChjaGFuZ2VEYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBWYWxpZGF0b3IgaXMgbm90IGluIHRoZSBzZXQgYW5kIGl0IGhhcyBiZWVuIHJlbW92ZWQuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNldCB2b3RpbmcgcG93ZXIgdG8gemVybyBhbmQgYWRkIHZvdGluZyBwb3dlciBoaXN0b3J5LlxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbERhdGEuYWRkcmVzcyA9IHZhbEV4aXN0LmFkZHJlc3M7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbERhdGEudm90aW5nX3Bvd2VyID0gMDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsRGF0YS5wcm9wb3Nlcl9wcmlvcml0eSA9IDA7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHByZXZWb3RpbmdQb3dlciA9IFZvdGluZ1Bvd2VySGlzdG9yeS5maW5kT25lKHthZGRyZXNzOnZhbEV4aXN0LmFkZHJlc3N9LCB7aGVpZ2h0Oi0xLCBsaW1pdDoxfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHByZXZWb3RpbmdQb3dlciAmJiAocHJldlZvdGluZ1Bvd2VyLnZvdGluZ19wb3dlciA+IDApKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiVmFsaWRhdG9yIGlzIGluIERCIGJ1dCBub3QgaW4gdmFsaWRhdG9yIHNldCBub3cuIEFkZCByZW1vdmUgVlAgY2hhbmdlLlwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ1bGtWUEhpc3RvcnkuaW5zZXJ0KHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhZGRyZXNzOiB2YWxFeGlzdC5hZGRyZXNzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByZXZfdm90aW5nX3Bvd2VyOiBwcmV2Vm90aW5nUG93ZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdm90aW5nX3Bvd2VyOiAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZW1vdmUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhlaWdodDogYmxvY2tEYXRhLmhlaWdodCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBibG9ja190aW1lOiBibG9ja0RhdGEudGltZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIG9ubHkgdXBkYXRlIHZhbGlkYXRvciBpbmZvciBkdXJpbmcgc3RhcnQgb2YgY3Jhd2xpbmcsIGVuZCBvZiBjcmF3bGluZyBvciBldmVyeSB2YWxpZGF0b3IgdXBkYXRlIHdpbmRvd1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKChoZWlnaHQgPT0gY3VycisxKSB8fCAoaGVpZ2h0ID09IE1ldGVvci5zZXR0aW5ncy5wYXJhbXMuc3RhcnRIZWlnaHQrMSkgfHwgKGhlaWdodCA9PSB1bnRpbCkgfHwgKGhlaWdodCAlIE1ldGVvci5zZXR0aW5ncy5wYXJhbXMudmFsaWRhdG9yVXBkYXRlV2luZG93ID09IDApKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoKGhlaWdodCA9PSBNZXRlb3Iuc2V0dGluZ3MucGFyYW1zLnN0YXJ0SGVpZ2h0KzEpIHx8IChoZWlnaHQgJSBNZXRlb3Iuc2V0dGluZ3MucGFyYW1zLnZhbGlkYXRvclVwZGF0ZVdpbmRvdyA9PSAwKSl7ICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodmFsRGF0YS5zdGF0dXMgPT0gJ0JPTkRfU1RBVFVTX0JPTkRFRCcpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdXJsID0gYCR7QVBJfS9jb3Ntb3Mvc3Rha2luZy92MWJldGExL3ZhbGlkYXRvcnMvJHt2YWxEYXRhLm9wZXJhdG9yX2FkZHJlc3N9L2RlbGVnYXRpb25zLyR7dmFsRGF0YS5kZWxlZ2F0b3JfYWRkcmVzc31gXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cnl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJHZXR0aW5nIHNlbGYgZGVsZWdhdGlvblwiKTtcbiAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHJlc3BvbnNlID0gSFRUUC5nZXQodXJsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgc2VsZkRlbGVnYXRpb24gPSBKU09OLnBhcnNlKHJlc3BvbnNlLmNvbnRlbnQpLmRlbGVnYXRpb25fcmVzcG9uc2U7XG4gICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbERhdGEuc2VsZl9kZWxlZ2F0aW9uID0gKHNlbGZEZWxlZ2F0aW9uLmRlbGVnYXRpb24gJiYgc2VsZkRlbGVnYXRpb24uZGVsZWdhdGlvbi5zaGFyZXMpP3BhcnNlRmxvYXQoc2VsZkRlbGVnYXRpb24uZGVsZWdhdGlvbi5zaGFyZXMpL3BhcnNlRmxvYXQodmFsRGF0YS5kZWxlZ2F0b3Jfc2hhcmVzKTowO1xuICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhdGNoKGUpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHVybCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJHZXR0aW5nIHNlbGYgZGVsZWdhdGlvbjogJW9cIiwgZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsRGF0YS5zZWxmX2RlbGVnYXRpb24gPSAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQWRkIHZhbGlkYXRvciB1cHNlcnQgdG8gYnVsayBvcGVyYXRpb25zLlwiKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ1bGtWYWxpZGF0b3JzLmZpbmQoe1wiYWRkcmVzc1wiOiB2YWxEYXRhLmFkZHJlc3N9KS51cHNlcnQoKS51cGRhdGVPbmUoeyRzZXQ6dmFsRGF0YX0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gc3RvcmUgdmFsZGlhdG9ycyBleGlzdCByZWNvcmRzXG4gICAgICAgICAgICAgICAgICAgIC8vIGxldCBleGlzdGluZ1ZhbGlkYXRvcnMgPSBWYWxpZGF0b3JzLmZpbmQoe2FkZHJlc3M6eyRleGlzdHM6dHJ1ZX19KS5mZXRjaCgpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIHVwZGF0ZSB1cHRpbWUgYnkgdGhlIGVuZCBvZiB0aGUgY3Jhd2wgb3IgdXBkYXRlIHdpbmRvd1xuICAgICAgICAgICAgICAgICAgICBpZiAoKGhlaWdodCAlIE1ldGVvci5zZXR0aW5ncy5wYXJhbXMudmFsaWRhdG9yVXBkYXRlV2luZG93ID09IDApIHx8IChoZWlnaHQgPT0gdW50aWwpKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiVXBkYXRlIHZhbGlkYXRvciB1cHRpbWUuXCIpXG4gICAgICAgICAgICAgICAgICAgICAgICBnZXRWYWxpZGF0b3JVcHRpbWUodmFsaWRhdG9yU2V0KVxuICAgICAgICAgICAgICAgICAgICB9XG5cblxuXG4gICAgICAgICAgICAgICAgICAgIGxldCBlbmRGaW5kVmFsaWRhdG9yc05hbWVUaW1lID0gbmV3IERhdGUoKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJHZXQgdmFsaWRhdG9ycyBuYW1lIHRpbWU6IFwiKygoZW5kRmluZFZhbGlkYXRvcnNOYW1lVGltZS1zdGFydEZpbmRWYWxpZGF0b3JzTmFtZVRpbWUpLzEwMDApK1wic2Vjb25kcy5cIik7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gcmVjb3JkIGZvciBhbmFseXRpY3NcbiAgICAgICAgICAgICAgICAgICAgbGV0IHN0YXJ0QW5heXRpY3NJbnNlcnRUaW1lID0gbmV3IERhdGUoKTtcbiAgICAgICAgICAgICAgICAgICAgQW5hbHl0aWNzLmluc2VydChhbmFseXRpY3NEYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGVuZEFuYWx5dGljc0luc2VydFRpbWUgPSBuZXcgRGF0ZSgpO1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkFuYWx5dGljcyBpbnNlcnQgdGltZTogXCIrKChlbmRBbmFseXRpY3NJbnNlcnRUaW1lLXN0YXJ0QW5heXRpY3NJbnNlcnRUaW1lKS8xMDAwKStcInNlY29uZHMuXCIpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIGNhbGN1bGF0ZSB2b3RpbmcgcG93ZXIgZGlzdHJpYnV0aW9uIGV2ZXJ5IDYwIGJsb2NrcyB+IDVtaW5zXG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGhlaWdodCAlIDYwID09IDEpe1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FsY3VsYXRlVlBEaXN0KGFuYWx5dGljc0RhdGEsIGJsb2NrRGF0YSlcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGxldCBzdGFydFZVcFRpbWUgPSBuZXcgRGF0ZSgpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoYnVsa1ZhbGlkYXRvcnMubGVuZ3RoID4gMCl7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIiMjIyMjIyMjIyMjIyBVcGRhdGUgdmFsaWRhdG9ycyAjIyMjIyMjIyMjIyNcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICBidWxrVmFsaWRhdG9ycy5leGVjdXRlKChlcnIsIHJlc3VsdCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlcnIpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkVycm9yIHdoaWxlIGJ1bGsgaW5zZXJ0IHZhbGlkYXRvcnM6ICVvXCIsZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3VsdCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ1bGtVcGRhdGVMYXN0U2Vlbi5leGVjdXRlKChlcnIsIHJlc3VsdCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVycil7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJFcnJvciB3aGlsZSBidWxrIHVwZGF0ZSB2YWxpZGF0b3IgbGFzdCBzZWVuOiAlb1wiLGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVzdWx0KXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGxldCBlbmRWVXBUaW1lID0gbmV3IERhdGUoKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJWYWxpZGF0b3IgdXBkYXRlIHRpbWU6IFwiKygoZW5kVlVwVGltZS1zdGFydFZVcFRpbWUpLzEwMDApK1wic2Vjb25kcy5cIik7XG5cbiAgICAgICAgICAgICAgICAgICAgbGV0IHN0YXJ0VlJUaW1lID0gbmV3IERhdGUoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGJ1bGtWYWxpZGF0b3JSZWNvcmRzLmxlbmd0aCA+IDApe1xuICAgICAgICAgICAgICAgICAgICAgICAgYnVsa1ZhbGlkYXRvclJlY29yZHMuZXhlY3V0ZSgoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVycil7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBsZXQgZW5kVlJUaW1lID0gbmV3IERhdGUoKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJWYWxpZGF0b3IgcmVjb3JkcyB1cGRhdGUgdGltZTogXCIrKChlbmRWUlRpbWUtc3RhcnRWUlRpbWUpLzEwMDApK1wic2Vjb25kcy5cIik7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGJ1bGtWUEhpc3RvcnkubGVuZ3RoID4gMCl7XG4gICAgICAgICAgICAgICAgICAgICAgICBidWxrVlBIaXN0b3J5LmV4ZWN1dGUoKGVycikgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlcnIpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG5cblxuICAgICAgICAgICAgICAgICAgICAvLyB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhdGNoIChlKXtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJCbG9jayBzeW5jaW5nIHN0b3BwZWQ6ICVvXCIsIGUpO1xuICAgICAgICAgICAgICAgICAgICBTWU5DSU5HID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBcIlN0b3BwZWRcIjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbGV0IGVuZEJsb2NrVGltZSA9IG5ldyBEYXRlKCk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJUaGlzIGJsb2NrIHVzZWQ6IFwiKygoZW5kQmxvY2tUaW1lLXN0YXJ0QmxvY2tUaW1lKS8xMDAwKStcInNlY29uZHMuXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgU1lOQ0lORyA9IGZhbHNlO1xuICAgICAgICAgICAgQ2hhaW4udXBkYXRlKHtjaGFpbklkOk1ldGVvci5zZXR0aW5ncy5wdWJsaWMuY2hhaW5JZH0sIHskc2V0OntsYXN0QmxvY2tzU3luY2VkVGltZTpuZXcgRGF0ZSgpfX0pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHVudGlsO1xuICAgIH0sXG4gICAgJ2FkZExpbWl0JzogZnVuY3Rpb24obGltaXQpIHtcbiAgICAgICAgLy8gY29uc29sZS5sb2cobGltaXQrMTApXG4gICAgICAgIHJldHVybiAobGltaXQrMTApO1xuICAgIH0sXG4gICAgJ2hhc01vcmUnOiBmdW5jdGlvbihsaW1pdCkge1xuICAgICAgICBpZiAobGltaXQgPiBNZXRlb3IuY2FsbCgnZ2V0Q3VycmVudEhlaWdodCcpKSB7XG4gICAgICAgICAgICByZXR1cm4gKGZhbHNlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiAodHJ1ZSk7XG4gICAgICAgIH1cbiAgICB9XG59KTtcbiIsImltcG9ydCB7IE1ldGVvciB9IGZyb20gJ21ldGVvci9tZXRlb3InO1xuaW1wb3J0IHsgQmxvY2tzY29uIH0gZnJvbSAnLi4vYmxvY2tzLmpzJztcbmltcG9ydCB7IFZhbGlkYXRvcnMgfSBmcm9tICcuLi8uLi92YWxpZGF0b3JzL3ZhbGlkYXRvcnMuanMnO1xuaW1wb3J0IHsgVHJhbnNhY3Rpb25zIH0gZnJvbSAnLi4vLi4vdHJhbnNhY3Rpb25zL3RyYW5zYWN0aW9ucy5qcyc7XG5cbnB1Ymxpc2hDb21wb3NpdGUoJ2Jsb2Nrcy5oZWlnaHQnLCBmdW5jdGlvbihsaW1pdCl7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgZmluZCgpe1xuICAgICAgICAgICAgcmV0dXJuIEJsb2Nrc2Nvbi5maW5kKHt9LCB7bGltaXQ6IGxpbWl0LCBzb3J0OiB7aGVpZ2h0OiAtMX19KVxuICAgICAgICB9LFxuICAgICAgICBjaGlsZHJlbjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGZpbmQoYmxvY2spe1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gVmFsaWRhdG9ycy5maW5kKFxuICAgICAgICAgICAgICAgICAgICAgICAge2FkZHJlc3M6YmxvY2sucHJvcG9zZXJBZGRyZXNzfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHtsaW1pdDoxfVxuICAgICAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICBdXG4gICAgfVxufSk7XG5cbnB1Ymxpc2hDb21wb3NpdGUoJ2Jsb2Nrcy5maW5kT25lJywgZnVuY3Rpb24oaGVpZ2h0KXtcbiAgICByZXR1cm4ge1xuICAgICAgICBmaW5kKCl7XG4gICAgICAgICAgICByZXR1cm4gQmxvY2tzY29uLmZpbmQoe2hlaWdodDpoZWlnaHR9KVxuICAgICAgICB9LFxuICAgICAgICBjaGlsZHJlbjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGZpbmQoYmxvY2spe1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gVHJhbnNhY3Rpb25zLmZpbmQoXG4gICAgICAgICAgICAgICAgICAgICAgICB7aGVpZ2h0OmJsb2NrLmhlaWdodH1cbiAgICAgICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgZmluZChibG9jayl7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBWYWxpZGF0b3JzLmZpbmQoXG4gICAgICAgICAgICAgICAgICAgICAgICB7YWRkcmVzczpibG9jay5wcm9wb3NlckFkZHJlc3N9LFxuICAgICAgICAgICAgICAgICAgICAgICAge2xpbWl0OjF9XG4gICAgICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIF1cbiAgICB9XG59KTtcbiIsImltcG9ydCB7IE1vbmdvIH0gZnJvbSAnbWV0ZW9yL21vbmdvJztcbmltcG9ydCB7IFZhbGlkYXRvcnMgfSBmcm9tICcuLi92YWxpZGF0b3JzL3ZhbGlkYXRvcnMuanMnO1xuXG5leHBvcnQgY29uc3QgQmxvY2tzY29uID0gbmV3IE1vbmdvLkNvbGxlY3Rpb24oJ2Jsb2NrcycpO1xuXG5CbG9ja3Njb24uaGVscGVycyh7XG4gICAgcHJvcG9zZXIoKXtcbiAgICAgICAgcmV0dXJuIFZhbGlkYXRvcnMuZmluZE9uZSh7YWRkcmVzczp0aGlzLnByb3Bvc2VyQWRkcmVzc30pO1xuICAgIH1cbn0pO1xuXG4vLyBCbG9ja3Njb24uaGVscGVycyh7XG4vLyAgICAgc29ydGVkKGxpbWl0KSB7XG4vLyAgICAgICAgIHJldHVybiBCbG9ja3Njb24uZmluZCh7fSwge3NvcnQ6IHtoZWlnaHQ6LTF9LCBsaW1pdDogbGltaXR9KTtcbi8vICAgICB9XG4vLyB9KTtcblxuXG4vLyBNZXRlb3Iuc2V0SW50ZXJ2YWwoZnVuY3Rpb24oKSB7XG4vLyAgICAgTWV0ZW9yLmNhbGwoJ2Jsb2Nrc1VwZGF0ZScsIChlcnJvciwgcmVzdWx0KSA9PiB7XG4vLyAgICAgICAgIGNvbnNvbGUubG9nKHJlc3VsdCk7XG4vLyAgICAgfSlcbi8vIH0sIDMwMDAwMDAwKTsiLCJpbXBvcnQgeyBNZXRlb3IgfSBmcm9tICdtZXRlb3IvbWV0ZW9yJztcbmltcG9ydCB7IEhUVFAgfSBmcm9tICdtZXRlb3IvaHR0cCc7XG5pbXBvcnQgeyBDaGFpbiwgQ2hhaW5TdGF0ZXMgfSBmcm9tICcuLi9jaGFpbi5qcyc7XG5pbXBvcnQgQ29pbiBmcm9tICcuLi8uLi8uLi8uLi9ib3RoL3V0aWxzL2NvaW5zLmpzJztcblxuZmluZFZvdGluZ1Bvd2VyID0gKHZhbGlkYXRvciwgZ2VuVmFsaWRhdG9ycykgPT4ge1xuICAgIGZvciAobGV0IHYgaW4gZ2VuVmFsaWRhdG9ycyl7XG4gICAgICAgIGlmICh2YWxpZGF0b3IucHViX2tleS52YWx1ZSA9PSBnZW5WYWxpZGF0b3JzW3ZdLnB1Yl9rZXkudmFsdWUpe1xuICAgICAgICAgICAgcmV0dXJuIHBhcnNlSW50KGdlblZhbGlkYXRvcnNbdl0ucG93ZXIpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5NZXRlb3IubWV0aG9kcyh7XG4gICAgJ2NoYWluLmdldENvbnNlbnN1c1N0YXRlJzogZnVuY3Rpb24oKXtcbiAgICAgICAgdGhpcy51bmJsb2NrKCk7XG4gICAgICAgIGxldCB1cmwgPSBSUEMrJy9kdW1wX2NvbnNlbnN1c19zdGF0ZSc7XG4gICAgICAgIHRyeXtcbiAgICAgICAgICAgIGxldCByZXNwb25zZSA9IEhUVFAuZ2V0KHVybCk7XG4gICAgICAgICAgICBsZXQgY29uc2Vuc3VzID0gSlNPTi5wYXJzZShyZXNwb25zZS5jb250ZW50KTtcbiAgICAgICAgICAgIGNvbnNlbnN1cyA9IGNvbnNlbnN1cy5yZXN1bHQ7XG4gICAgICAgICAgICBsZXQgaGVpZ2h0ID0gY29uc2Vuc3VzLnJvdW5kX3N0YXRlLmhlaWdodDtcbiAgICAgICAgICAgIGxldCByb3VuZCA9IGNvbnNlbnN1cy5yb3VuZF9zdGF0ZS5yb3VuZDtcbiAgICAgICAgICAgIGxldCBzdGVwID0gY29uc2Vuc3VzLnJvdW5kX3N0YXRlLnN0ZXA7XG4gICAgICAgICAgICBsZXQgdm90ZWRQb3dlciA9IE1hdGgucm91bmQocGFyc2VGbG9hdChjb25zZW5zdXMucm91bmRfc3RhdGUudm90ZXNbcm91bmRdLnByZXZvdGVzX2JpdF9hcnJheS5zcGxpdChcIiBcIilbM10pKjEwMCk7XG5cbiAgICAgICAgICAgIENoYWluLnVwZGF0ZSh7Y2hhaW5JZDpNZXRlb3Iuc2V0dGluZ3MucHVibGljLmNoYWluSWR9LCB7JHNldDp7XG4gICAgICAgICAgICAgICAgdm90aW5nSGVpZ2h0OiBoZWlnaHQsXG4gICAgICAgICAgICAgICAgdm90aW5nUm91bmQ6IHJvdW5kLFxuICAgICAgICAgICAgICAgIHZvdGluZ1N0ZXA6IHN0ZXAsXG4gICAgICAgICAgICAgICAgdm90ZWRQb3dlcjogdm90ZWRQb3dlcixcbiAgICAgICAgICAgICAgICBwcm9wb3NlckFkZHJlc3M6IGNvbnNlbnN1cy5yb3VuZF9zdGF0ZS52YWxpZGF0b3JzLnByb3Bvc2VyLmFkZHJlc3MsXG4gICAgICAgICAgICAgICAgcHJldm90ZXM6IGNvbnNlbnN1cy5yb3VuZF9zdGF0ZS52b3Rlc1tyb3VuZF0ucHJldm90ZXMsXG4gICAgICAgICAgICAgICAgcHJlY29tbWl0czogY29uc2Vuc3VzLnJvdW5kX3N0YXRlLnZvdGVzW3JvdW5kXS5wcmVjb21taXRzXG4gICAgICAgICAgICB9fSk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2goZSl7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyh1cmwpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coZSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgICdjaGFpbi51cGRhdGVTdGF0dXMnOiBhc3luYyBmdW5jdGlvbigpe1xuICAgICAgICB0aGlzLnVuYmxvY2soKTtcbiAgICAgICAgbGV0IHVybCA9IFwiXCI7XG4gICAgICAgIHRyeXtcbiAgICAgICAgICAgIHVybCA9IEFQSSArICcvYmxvY2tzL2xhdGVzdCc7XG4gICAgICAgICAgICBsZXQgcmVzcG9uc2UgPSBIVFRQLmdldCh1cmwpO1xuICAgICAgICAgICAgbGV0IGxhdGVzdEJsb2NrID0gSlNPTi5wYXJzZShyZXNwb25zZS5jb250ZW50KTtcblxuICAgICAgICAgICAgbGV0IGNoYWluID0ge307XG4gICAgICAgICAgICBjaGFpbi5jaGFpbklkID0gbGF0ZXN0QmxvY2suYmxvY2suaGVhZGVyLmNoYWluX2lkO1xuICAgICAgICAgICAgY2hhaW4ubGF0ZXN0QmxvY2tIZWlnaHQgPSBwYXJzZUludChsYXRlc3RCbG9jay5ibG9jay5oZWFkZXIuaGVpZ2h0KTtcbiAgICAgICAgICAgIGNoYWluLmxhdGVzdEJsb2NrVGltZSA9IGxhdGVzdEJsb2NrLmJsb2NrLmhlYWRlci50aW1lO1xuICAgICAgICAgICAgbGV0IGxhdGVzdFN0YXRlID0gQ2hhaW5TdGF0ZXMuZmluZE9uZSh7fSwge3NvcnQ6IHtoZWlnaHQ6IC0xfX0pXG4gICAgICAgICAgICBpZiAobGF0ZXN0U3RhdGUgJiYgbGF0ZXN0U3RhdGUuaGVpZ2h0ID49IGNoYWluLmxhdGVzdEJsb2NrSGVpZ2h0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGBubyB1cGRhdGVzIChnZXR0aW5nIGJsb2NrICR7Y2hhaW4ubGF0ZXN0QmxvY2tIZWlnaHR9IGF0IGJsb2NrICR7bGF0ZXN0U3RhdGUuaGVpZ2h0fSlgXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFNpbmNlIFRlbmRlcm1pbnQgdjAuMzMsIHZhbGlkYXRvciBwYWdlIGRlZmF1bHQgc2V0IHRvIHJldHVybiAzMCB2YWxpZGF0b3JzLlxuICAgICAgICAgICAgLy8gUXVlcnkgbGF0ZXN0IGhlaWdodCB3aXRoIHBhZ2UgMSBhbmQgMTAwIHZhbGlkYXRvcnMgcGVyIHBhZ2UuXG5cbiAgICAgICAgICAgIC8vIHZhbGlkYXRvcnMgPSB2YWxpZGF0b3JzLnZhbGlkYXRvcnNMaXN0O1xuICAgICAgICAgICAgLy8gY2hhaW4udmFsaWRhdG9ycyA9IHZhbGlkYXRvcnMubGVuZ3RoO1xuXG4gICAgICAgICAgICBsZXQgdmFsaWRhdG9ycyA9IFtdXG4gICAgICAgICAgICBsZXQgcGFnZSA9IDA7XG5cbiAgICAgICAgICAgIGRvIHtcbiAgICAgICAgICAgICAgICB1cmwgPSBSUEMrYC92YWxpZGF0b3JzP3BhZ2U9JHsrK3BhZ2V9JnBlcl9wYWdlPTEwMGA7XG4gICAgICAgICAgICAgICAgbGV0IHJlc3BvbnNlID0gSFRUUC5nZXQodXJsKTtcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBKU09OLnBhcnNlKHJlc3BvbnNlLmNvbnRlbnQpLnJlc3VsdDtcbiAgICAgICAgICAgICAgICB2YWxpZGF0b3JzID0gWy4uLnZhbGlkYXRvcnMsIC4uLnJlc3VsdC52YWxpZGF0b3JzXTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHdoaWxlICh2YWxpZGF0b3JzLmxlbmd0aCA8IHBhcnNlSW50KHJlc3VsdC50b3RhbCkpXG5cbiAgICAgICAgICAgIGNoYWluLnZhbGlkYXRvcnMgPSB2YWxpZGF0b3JzLmxlbmd0aDtcbiAgICAgICAgICAgIGxldCBhY3RpdmVWUCA9IDA7XG4gICAgICAgICAgICBmb3IgKHYgaW4gdmFsaWRhdG9ycyl7XG4gICAgICAgICAgICAgICAgYWN0aXZlVlAgKz0gcGFyc2VJbnQodmFsaWRhdG9yc1t2XS52b3RpbmdfcG93ZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2hhaW4uYWN0aXZlVm90aW5nUG93ZXIgPSBhY3RpdmVWUDtcblxuICAgICAgICAgICAgLy8gdXBkYXRlIHN0YWtpbmcgcGFyYW1zXG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHVybCA9IEFQSSArICcvY29zbW9zL3N0YWtpbmcvdjFiZXRhMS9wYXJhbXMnO1xuICAgICAgICAgICAgICAgIHJlc3BvbnNlID0gSFRUUC5nZXQodXJsKTtcbiAgICAgICAgICAgICAgICBjaGFpbi5zdGFraW5nID0gSlNPTi5wYXJzZShyZXNwb25zZS5jb250ZW50KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGNoKGUpe1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBHZXQgY2hhaW4gc3RhdGVzXG4gICAgICAgICAgICBpZiAocGFyc2VJbnQoY2hhaW4ubGF0ZXN0QmxvY2tIZWlnaHQpID4gMCl7XG4gICAgICAgICAgICAgICAgbGV0IGNoYWluU3RhdGVzID0ge307XG4gICAgICAgICAgICAgICAgY2hhaW5TdGF0ZXMuaGVpZ2h0ID0gcGFyc2VJbnQoY2hhaW4ubGF0ZXN0QmxvY2tIZWlnaHQpO1xuICAgICAgICAgICAgICAgIGNoYWluU3RhdGVzLnRpbWUgPSBuZXcgRGF0ZShjaGFpbi5sYXRlc3RCbG9ja1RpbWUpO1xuXG4gICAgICAgICAgICAgICAgdHJ5e1xuICAgICAgICAgICAgICAgICAgICB1cmwgPSBBUEkgKyAnL2Nvc21vcy9zdGFraW5nL3YxYmV0YTEvcG9vbCc7XG4gICAgICAgICAgICAgICAgICAgIGxldCByZXNwb25zZSA9IEhUVFAuZ2V0KHVybCk7XG4gICAgICAgICAgICAgICAgICAgIGxldCBib25kaW5nID0gSlNPTi5wYXJzZShyZXNwb25zZS5jb250ZW50KS5wb29sO1xuICAgICAgICAgICAgICAgICAgICBjaGFpblN0YXRlcy5ib25kZWRUb2tlbnMgPSBwYXJzZUludChib25kaW5nLmJvbmRlZF90b2tlbnMpO1xuICAgICAgICAgICAgICAgICAgICBjaGFpblN0YXRlcy5ub3RCb25kZWRUb2tlbnMgPSBwYXJzZUludChib25kaW5nLm5vdF9ib25kZWRfdG9rZW5zKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2F0Y2goZSl7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGUpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmICggQ29pbi5TdGFraW5nQ29pbi5kZW5vbSApIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKE1ldGVvci5zZXR0aW5ncy5wdWJsaWMubW9kdWxlcy5iYW5rKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1cmwgPSBBUEkgKyAnL2Nvc21vcy9iYW5rL3YxYmV0YTEvc3VwcGx5LycgKyBDb2luLlN0YWtpbmdDb2luLmRlbm9tO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCByZXNwb25zZSA9IEhUVFAuZ2V0KHVybCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHN1cHBseSA9IEpTT04ucGFyc2UocmVzcG9uc2UuY29udGVudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hhaW5TdGF0ZXMudG90YWxTdXBwbHkgPSBwYXJzZUludChzdXBwbHkuYW1vdW50LmFtb3VudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXRjaChlKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gdXBkYXRlIGJhbmsgcGFyYW1zXG4gICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVybCA9IEFQSSArICcvY29zbW9zL2JhbmsvdjFiZXRhMS9wYXJhbXMnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlID0gSFRUUC5nZXQodXJsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGFpbi5iYW5rID0gSlNPTi5wYXJzZShyZXNwb25zZS5jb250ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGNhdGNoKGUpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAoTWV0ZW9yLnNldHRpbmdzLnB1YmxpYy5tb2R1bGVzLmRpc3RyaWJ1dGlvbil7XG4gICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVybCA9IEFQSSArICcvY29zbW9zL2Rpc3RyaWJ1dGlvbi92MWJldGExL2NvbW11bml0eV9wb29sJztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgcmVzcG9uc2UgPSBIVFRQLmdldCh1cmwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBwb29sID0gSlNPTi5wYXJzZShyZXNwb25zZS5jb250ZW50KS5wb29sO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwb29sICYmIHBvb2wubGVuZ3RoID4gMCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNoYWluU3RhdGVzLmNvbW11bml0eVBvb2wgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcG9vbC5mb3JFYWNoKChhbW91bnQpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNoYWluU3RhdGVzLmNvbW11bml0eVBvb2wucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVub206IGFtb3VudC5kZW5vbSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhbW91bnQ6IHBhcnNlRmxvYXQoYW1vdW50LmFtb3VudClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgY2F0Y2ggKGUpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGUpXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHVwZGF0ZSBkaXN0cmlidXRpb24gcGFyYW1zXG4gICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVybCA9IEFQSSArICcvY29zbW9zL2Rpc3RyaWJ1dGlvbi92MWJldGExL3BhcmFtcyc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UgPSBIVFRQLmdldCh1cmwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNoYWluLmRpc3RyaWJ1dGlvbiA9IEpTT04ucGFyc2UocmVzcG9uc2UuY29udGVudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXRjaChlKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmIChNZXRlb3Iuc2V0dGluZ3MucHVibGljLm1vZHVsZXMubWludGluZyl7XG4gICAgICAgICAgICAgICAgICAgICAgICB0cnl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdXJsID0gQVBJICsgJy9jb3Ntb3MvbWludC92MWJldGExL2luZmxhdGlvbic7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHJlc3BvbnNlID0gSFRUUC5nZXQodXJsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgaW5mbGF0aW9uID0gSlNPTi5wYXJzZShyZXNwb25zZS5jb250ZW50KS5pbmZsYXRpb247XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gcmVzcG9uc2UgPSBIVFRQLmdldCh1cmwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGxldCBpbmZsYXRpb24gPSBKU09OLnBhcnNlKHJlc3BvbnNlLmNvbnRlbnQpLnJlc3VsdDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaW5mbGF0aW9uKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hhaW5TdGF0ZXMuaW5mbGF0aW9uID0gcGFyc2VGbG9hdChpbmZsYXRpb24pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgY2F0Y2goZSl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1cmwgPSBBUEkgKyAnL2Nvc21vcy9taW50L3YxYmV0YTEvYW5udWFsX3Byb3Zpc2lvbnMnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCByZXNwb25zZSA9IEhUVFAuZ2V0KHVybCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHByb3Zpc2lvbnMgPSBKU09OLnBhcnNlKHJlc3BvbnNlLmNvbnRlbnQpLmFubnVhbF9wcm92aXNpb25zO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHByb3Zpc2lvbnMpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHByb3Zpc2lvbnMpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGFpblN0YXRlcy5hbm51YWxQcm92aXNpb25zID0gcGFyc2VGbG9hdChwcm92aXNpb25zKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGNhdGNoKGUpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyB1cGRhdGUgbWludCBwYXJhbXNcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdXJsID0gQVBJICsgJy9jb3Ntb3MvbWludC92MWJldGExL3BhcmFtcyc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UgPSBIVFRQLmdldCh1cmwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNoYWluLm1pbnQgPSBKU09OLnBhcnNlKHJlc3BvbnNlLmNvbnRlbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgY2F0Y2goZSl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAoTWV0ZW9yLnNldHRpbmdzLnB1YmxpYy5tb2R1bGVzLmdvdil7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyB1cGRhdGUgZ292IHBhcmFtc1xuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1cmwgPSBBUEkgKyAnL2Nvc21vcy9nb3YvdjFiZXRhMS9wYXJhbXMvdGFsbHlpbmcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlID0gSFRUUC5nZXQodXJsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGFpbi5nb3YgPSBKU09OLnBhcnNlKHJlc3BvbnNlLmNvbnRlbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgY2F0Y2goZSl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBDaGFpblN0YXRlcy5pbnNlcnQoY2hhaW5TdGF0ZXMpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBDaGFpbi51cGRhdGUoe2NoYWluSWQ6Y2hhaW4uY2hhaW5JZH0sIHskc2V0OmNoYWlufSwge3Vwc2VydDogdHJ1ZX0pO1xuXG4gICAgICAgICAgICAvLyBjaGFpbi50b3RhbFZvdGluZ1Bvd2VyID0gdG90YWxWUDtcblxuICAgICAgICAgICAgLy8gdmFsaWRhdG9ycyA9IFZhbGlkYXRvcnMuZmluZCh7fSkuZmV0Y2goKTtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKHZhbGlkYXRvcnMpO1xuICAgICAgICAgICAgcmV0dXJuIGNoYWluLmxhdGVzdEJsb2NrSGVpZ2h0O1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlKXtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKHVybCk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhlKTtcbiAgICAgICAgICAgIHJldHVybiBcIkVycm9yIGdldHRpbmcgY2hhaW4gc3RhdHVzLlwiO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAnY2hhaW4uZ2V0TGF0ZXN0U3RhdHVzJzogZnVuY3Rpb24oKXtcbiAgICAgICAgdGhpcy51bmJsb2NrKCk7XG4gICAgICAgIENoYWluLmZpbmQoKS5zb3J0KHtjcmVhdGVkOi0xfSkubGltaXQoMSk7XG4gICAgfSxcbn0pXG4iLCJpbXBvcnQgeyBNZXRlb3IgfSBmcm9tICdtZXRlb3IvbWV0ZW9yJztcbmltcG9ydCB7IENoYWluLCBDaGFpblN0YXRlcyB9IGZyb20gJy4uL2NoYWluLmpzJztcbmltcG9ydCB7IENvaW5TdGF0cyB9IGZyb20gJy4uLy4uL2NvaW4tc3RhdHMvY29pbi1zdGF0cy5qcyc7XG5pbXBvcnQgeyBWYWxpZGF0b3JzIH0gZnJvbSAnLi4vLi4vdmFsaWRhdG9ycy92YWxpZGF0b3JzLmpzJztcblxuTWV0ZW9yLnB1Ymxpc2goJ2NoYWluU3RhdGVzLmxhdGVzdCcsIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gW1xuICAgICAgICBDaGFpblN0YXRlcy5maW5kKHt9LHtzb3J0OntoZWlnaHQ6LTF9LGxpbWl0OjF9KSxcbiAgICAgICAgQ29pblN0YXRzLmZpbmQoe30se3NvcnQ6e2xhc3RfdXBkYXRlZF9hdDotMX0sbGltaXQ6MX0pXG4gICAgXTtcbn0pO1xuXG5wdWJsaXNoQ29tcG9zaXRlKCdjaGFpbi5zdGF0dXMnLCBmdW5jdGlvbigpe1xuICAgIHJldHVybiB7XG4gICAgICAgIGZpbmQoKXtcbiAgICAgICAgICAgIHJldHVybiBDaGFpbi5maW5kKHtjaGFpbklkOk1ldGVvci5zZXR0aW5ncy5wdWJsaWMuY2hhaW5JZH0pO1xuICAgICAgICB9LFxuICAgICAgICBjaGlsZHJlbjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGZpbmQoY2hhaW4pe1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gVmFsaWRhdG9ycy5maW5kKFxuICAgICAgICAgICAgICAgICAgICAgICAge30sXG4gICAgICAgICAgICAgICAgICAgICAgICB7ZmllbGRzOntcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhZGRyZXNzOjEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246MSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVyYXRvckFkZHJlc3M6MSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGF0dXM6LTEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgamFpbGVkOjEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvZmlsZV91cmw6MVxuICAgICAgICAgICAgICAgICAgICAgICAgfX1cbiAgICAgICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgIH1cbn0pOyIsImltcG9ydCB7IE1vbmdvIH0gZnJvbSAnbWV0ZW9yL21vbmdvJztcbmltcG9ydCB7IFZhbGlkYXRvcnMgfSBmcm9tICcuLi92YWxpZGF0b3JzL3ZhbGlkYXRvcnMuanMnO1xuXG5leHBvcnQgY29uc3QgQ2hhaW4gPSBuZXcgTW9uZ28uQ29sbGVjdGlvbignY2hhaW4nKTtcbmV4cG9ydCBjb25zdCBDaGFpblN0YXRlcyA9IG5ldyBNb25nby5Db2xsZWN0aW9uKCdjaGFpbl9zdGF0ZXMnKVxuXG5DaGFpbi5oZWxwZXJzKHtcbiAgICBwcm9wb3Nlcigpe1xuICAgICAgICByZXR1cm4gVmFsaWRhdG9ycy5maW5kT25lKHthZGRyZXNzOnRoaXMucHJvcG9zZXJBZGRyZXNzfSk7XG4gICAgfVxufSkiLCJpbXBvcnQgeyBNZXRlb3IgfSBmcm9tICdtZXRlb3IvbWV0ZW9yJztcbmltcG9ydCB7IENvaW5TdGF0cyB9IGZyb20gJy4uL2NvaW4tc3RhdHMuanMnO1xuaW1wb3J0IHsgSFRUUCB9IGZyb20gJ21ldGVvci9odHRwJztcblxuTWV0ZW9yLm1ldGhvZHMoe1xuICAgICdjb2luU3RhdHMuZ2V0Q29pblN0YXRzJzogZnVuY3Rpb24oKXtcbiAgICAgICAgdGhpcy51bmJsb2NrKCk7XG4gICAgICAgIGxldCBjb2luSWQgPSBNZXRlb3Iuc2V0dGluZ3MucHVibGljLmNvaW5nZWNrb0lkO1xuICAgICAgICBpZiAoY29pbklkKXtcbiAgICAgICAgICAgIHRyeXtcbiAgICAgICAgICAgICAgICBsZXQgbm93ID0gbmV3IERhdGUoKTtcbiAgICAgICAgICAgICAgICBub3cuc2V0TWludXRlcygwKTtcbiAgICAgICAgICAgICAgICBsZXQgdXJsID0gXCJodHRwczovL2FwaS5jb2luZ2Vja28uY29tL2FwaS92My9zaW1wbGUvcHJpY2U/aWRzPVwiK2NvaW5JZCtcIiZ2c19jdXJyZW5jaWVzPXVzZCZpbmNsdWRlX21hcmtldF9jYXA9dHJ1ZSZpbmNsdWRlXzI0aHJfdm9sPXRydWUmaW5jbHVkZV8yNGhyX2NoYW5nZT10cnVlJmluY2x1ZGVfbGFzdF91cGRhdGVkX2F0PXRydWVcIjtcbiAgICAgICAgICAgICAgICBsZXQgcmVzcG9uc2UgPSBIVFRQLmdldCh1cmwpO1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5zdGF0dXNDb2RlID09IDIwMCl7XG4gICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKEpTT04ucGFyc2UocmVzcG9uc2UuY29udGVudCkpO1xuICAgICAgICAgICAgICAgICAgICBsZXQgZGF0YSA9IEpTT04ucGFyc2UocmVzcG9uc2UuY29udGVudCk7XG4gICAgICAgICAgICAgICAgICAgIGRhdGEgPSBkYXRhW2NvaW5JZF07XG4gICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKGNvaW5TdGF0cyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBDb2luU3RhdHMudXBzZXJ0KHtsYXN0X3VwZGF0ZWRfYXQ6ZGF0YS5sYXN0X3VwZGF0ZWRfYXR9LCB7JHNldDpkYXRhfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2F0Y2goZSl7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2codXJsKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNle1xuICAgICAgICAgICAgcmV0dXJuIFwiTm8gY29pbmdlY2tvIElkIHByb3ZpZGVkLlwiXG4gICAgICAgIH1cbiAgICB9LFxuICAgICdjb2luU3RhdHMuZ2V0U3RhdHMnOiBmdW5jdGlvbigpe1xuICAgICAgICB0aGlzLnVuYmxvY2soKTtcbiAgICAgICAgbGV0IGNvaW5JZCA9IE1ldGVvci5zZXR0aW5ncy5wdWJsaWMuY29pbmdlY2tvSWQ7XG4gICAgICAgIGlmIChjb2luSWQpe1xuICAgICAgICAgICAgcmV0dXJuIChDb2luU3RhdHMuZmluZE9uZSh7fSx7c29ydDp7bGFzdF91cGRhdGVkX2F0Oi0xfX0pKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNle1xuICAgICAgICAgICAgcmV0dXJuIFwiTm8gY29pbmdlY2tvIElkIHByb3ZpZGVkLlwiO1xuICAgICAgICB9XG5cbiAgICB9XG59KSIsImltcG9ydCB7IE1vbmdvIH0gZnJvbSAnbWV0ZW9yL21vbmdvJztcblxuZXhwb3J0IGNvbnN0IENvaW5TdGF0cyA9IG5ldyBNb25nby5Db2xsZWN0aW9uKCdjb2luX3N0YXRzJyk7XG4iLCJpbXBvcnQgeyBNZXRlb3IgfSBmcm9tICdtZXRlb3IvbWV0ZW9yJztcbmltcG9ydCB7IERlbGVnYXRpb25zIH0gZnJvbSAnLi4vZGVsZWdhdGlvbnMuanMnO1xuaW1wb3J0IHsgVmFsaWRhdG9ycyB9IGZyb20gJy4uLy4uL3ZhbGlkYXRvcnMvdmFsaWRhdG9ycy5qcyc7XG5cbk1ldGVvci5tZXRob2RzKHtcbiAgICAnZGVsZWdhdGlvbnMuZ2V0RGVsZWdhdGlvbnMnOiBhc3luYyBmdW5jdGlvbigpe1xuICAgICAgICB0aGlzLnVuYmxvY2soKTtcbiAgICAgICAgbGV0IHZhbGlkYXRvcnMgPSBWYWxpZGF0b3JzLmZpbmQoe30pLmZldGNoKCk7XG4gICAgICAgIGxldCBkZWxlZ2F0aW9ucyA9IFtdO1xuICAgICAgICBjb25zb2xlLmxvZyhcIj09PSBHZXR0aW5nIGRlbGVnYXRpb25zID09PVwiKTtcbiAgICAgICAgZm9yICh2IGluIHZhbGlkYXRvcnMpe1xuICAgICAgICAgICAgaWYgKHZhbGlkYXRvcnNbdl0ub3BlcmF0b3JfYWRkcmVzcyl7XG4gICAgICAgICAgICAgICAgbGV0IHVybCA9IEFQSSArICcvY29zbW9zL3N0YWtpbmcvdjFiZXRhMS92YWxpZGF0b3JzLycrdmFsaWRhdG9yc1t2XS5vcGVyYXRvckFkZHJlc3MrXCIvZGVsZWdhdGlvbnNcIjtcbiAgICAgICAgICAgICAgICB0cnl7XG4gICAgICAgICAgICAgICAgICAgIGxldCByZXNwb25zZSA9IEhUVFAuZ2V0KHVybCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5zdGF0dXNDb2RlID09IDIwMCl7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgZGVsZWdhdGlvbiA9IEpTT04ucGFyc2UocmVzcG9uc2UuY29udGVudCkucmVzdWx0O1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coZGVsZWdhdGlvbik7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxlZ2F0aW9ucyA9IGRlbGVnYXRpb25zLmNvbmNhdChkZWxlZ2F0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2cocmVzcG9uc2Uuc3RhdHVzQ29kZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2F0Y2ggKGUpe1xuICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyh1cmwpO1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlKTtcbiAgICAgICAgICAgICAgICB9ICAgIFxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgbGV0IGRhdGEgPSB7XG4gICAgICAgICAgICBkZWxlZ2F0aW9uczogZGVsZWdhdGlvbnMsXG4gICAgICAgICAgICBjcmVhdGVkQXQ6IG5ldyBEYXRlKCksXG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gRGVsZWdhdGlvbnMuaW5zZXJ0KGRhdGEpO1xuICAgIH1cbn0pIiwiaW1wb3J0IHsgTW9uZ28gfSBmcm9tICdtZXRlb3IvbW9uZ28nO1xuXG5leHBvcnQgY29uc3QgRGVsZWdhdGlvbnMgPSBuZXcgTW9uZ28uQ29sbGVjdGlvbignZGVsZWdhdGlvbnMnKTtcbiIsImltcG9ydCB7IEhUVFAgfSBmcm9tICdtZXRlb3IvaHR0cCc7XG5pbXBvcnQgeyBWYWxpZGF0b3JzIH0gZnJvbSAnLi4vLi4vdmFsaWRhdG9ycy92YWxpZGF0b3JzJztcblxuTWV0ZW9yLm1ldGhvZHMoe1xuICAgICd0cmFuc2FjdGlvbi5zdWJtaXQnOiBmdW5jdGlvbih0eEluZm8pIHtcbiAgICAgICAgdGhpcy51bmJsb2NrKCk7XG4gICAgICAgIGNvbnN0IHVybCA9IGAke0FQSX0vdHhzYDtcbiAgICAgICAgZGF0YSA9IHtcbiAgICAgICAgICAgIFwidHhcIjogdHhJbmZvLnZhbHVlLFxuICAgICAgICAgICAgXCJtb2RlXCI6IFwic3luY1wiXG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgdGltZXN0YW1wID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgICAgIGNvbnNvbGUubG9nKGBzdWJtaXR0aW5nIHRyYW5zYWN0aW9uJHt0aW1lc3RhbXB9ICR7dXJsfSB3aXRoIGRhdGEgJHtKU09OLnN0cmluZ2lmeShkYXRhKX1gKVxuXG4gICAgICAgIGxldCByZXNwb25zZSA9IEhUVFAucG9zdCh1cmwsIHtkYXRhfSk7XG4gICAgICAgIGNvbnNvbGUubG9nKGByZXNwb25zZSBmb3IgdHJhbnNhY3Rpb24ke3RpbWVzdGFtcH0gJHt1cmx9OiAke0pTT04uc3RyaW5naWZ5KHJlc3BvbnNlKX1gKVxuICAgICAgICBpZiAocmVzcG9uc2Uuc3RhdHVzQ29kZSA9PSAyMDApIHtcbiAgICAgICAgICAgIGxldCBkYXRhID0gcmVzcG9uc2UuZGF0YVxuICAgICAgICAgICAgaWYgKGRhdGEuY29kZSlcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKGRhdGEuY29kZSwgSlNPTi5wYXJzZShkYXRhLnJhd19sb2cpLm1lc3NhZ2UpXG4gICAgICAgICAgICByZXR1cm4gcmVzcG9uc2UuZGF0YS50eGhhc2g7XG4gICAgICAgIH1cbiAgICB9LFxuICAgICd0cmFuc2FjdGlvbi5leGVjdXRlJzogZnVuY3Rpb24oYm9keSwgcGF0aCkge1xuICAgICAgICB0aGlzLnVuYmxvY2soKTtcbiAgICAgICAgY29uc3QgdXJsID0gYCR7QVBJfS8ke3BhdGh9YDtcbiAgICAgICAgZGF0YSA9IHtcbiAgICAgICAgICAgIFwiYmFzZV9yZXFcIjoge1xuICAgICAgICAgICAgICAgIC4uLmJvZHksXG4gICAgICAgICAgICAgICAgXCJjaGFpbl9pZFwiOiBNZXRlb3Iuc2V0dGluZ3MucHVibGljLmNoYWluSWQsXG4gICAgICAgICAgICAgICAgXCJzaW11bGF0ZVwiOiBmYWxzZVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBsZXQgcmVzcG9uc2UgPSBIVFRQLnBvc3QodXJsLCB7ZGF0YX0pO1xuICAgICAgICBpZiAocmVzcG9uc2Uuc3RhdHVzQ29kZSA9PSAyMDApIHtcbiAgICAgICAgICAgIHJldHVybiBKU09OLnBhcnNlKHJlc3BvbnNlLmNvbnRlbnQpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAndHJhbnNhY3Rpb24uc2ltdWxhdGUnOiBmdW5jdGlvbih0eE1zZywgZnJvbSwgYWNjb3VudE51bWJlciwgc2VxdWVuY2UsIHBhdGgsIGFkanVzdG1lbnQ9JzEuMicpIHtcbiAgICAgICAgdGhpcy51bmJsb2NrKCk7XG4gICAgICAgIGNvbnN0IHVybCA9IGAke0FQSX0vJHtwYXRofWA7XG4gICAgICAgIGNvbnNvbGUubG9nKHR4TXNnKTtcbiAgICAgICAgZGF0YSA9IHsuLi50eE1zZyxcbiAgICAgICAgICAgIFwiYmFzZV9yZXFcIjoge1xuICAgICAgICAgICAgICAgIFwiZnJvbVwiOiBmcm9tLFxuICAgICAgICAgICAgICAgIFwiY2hhaW5faWRcIjogTWV0ZW9yLnNldHRpbmdzLnB1YmxpYy5jaGFpbklkLFxuICAgICAgICAgICAgICAgIFwiZ2FzX2FkanVzdG1lbnRcIjogYWRqdXN0bWVudCxcbiAgICAgICAgICAgICAgICBcImFjY291bnRfbnVtYmVyXCI6IGFjY291bnROdW1iZXIsXG4gICAgICAgICAgICAgICAgXCJzZXF1ZW5jZVwiOiBzZXF1ZW5jZS50b1N0cmluZygpLFxuICAgICAgICAgICAgICAgIFwic2ltdWxhdGVcIjogdHJ1ZVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBjb25zb2xlLmxvZyh1cmwpO1xuICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcbiAgICAgICAgbGV0IHJlc3BvbnNlID0gSFRUUC5wb3N0KHVybCwge2RhdGF9KTtcbiAgICAgICAgaWYgKHJlc3BvbnNlLnN0YXR1c0NvZGUgPT0gMjAwKSB7XG4gICAgICAgICAgICByZXR1cm4gSlNPTi5wYXJzZShyZXNwb25zZS5jb250ZW50KS5nYXNfZXN0aW1hdGU7XG4gICAgICAgIH1cbiAgICB9LFxuICAgICdpc1ZhbGlkYXRvcic6IGZ1bmN0aW9uKGFkZHJlc3Mpe1xuICAgICAgICB0aGlzLnVuYmxvY2soKTtcbiAgICAgICAgbGV0IHZhbGlkYXRvciA9IFZhbGlkYXRvcnMuZmluZE9uZSh7ZGVsZWdhdG9yX2FkZHJlc3M6YWRkcmVzc30pXG4gICAgICAgIHJldHVybiB2YWxpZGF0b3I7XG4gICAgfVxufSkiLCJpbXBvcnQgeyBNZXRlb3IgfSBmcm9tICdtZXRlb3IvbWV0ZW9yJztcbmltcG9ydCB7IEhUVFAgfSBmcm9tICdtZXRlb3IvaHR0cCc7XG5pbXBvcnQgeyBQcm9wb3NhbHMgfSBmcm9tICcuLi9wcm9wb3NhbHMuanMnO1xuaW1wb3J0IHsgQ2hhaW4gfSBmcm9tICcuLi8uLi9jaGFpbi9jaGFpbi5qcyc7XG5pbXBvcnQgeyBWYWxpZGF0b3JzIH0gZnJvbSAnLi4vLi4vdmFsaWRhdG9ycy92YWxpZGF0b3JzLmpzJztcblxuTWV0ZW9yLm1ldGhvZHMoe1xuICAgICdwcm9wb3NhbHMuZ2V0UHJvcG9zYWxzJzogZnVuY3Rpb24oKXtcbiAgICAgICAgdGhpcy51bmJsb2NrKCk7XG5cbiAgICAgICAgLy8gZ2V0IGdvdiB0YWxseSBwcmFyYW1zXG4gICAgICAgIGxldCB1cmwgPSBBUEkgKyAnL2Nvc21vcy9nb3YvdjFiZXRhMS9wYXJhbXMvdGFsbHlpbmcnO1xuICAgICAgICB0cnl7XG4gICAgICAgICAgICBsZXQgcmVzcG9uc2UgPSBIVFRQLmdldCh1cmwpO1xuICAgICAgICAgICAgbGV0IHBhcmFtcyA9IEpTT04ucGFyc2UocmVzcG9uc2UuY29udGVudCk7XG5cbiAgICAgICAgICAgIENoYWluLnVwZGF0ZSh7Y2hhaW5JZDogTWV0ZW9yLnNldHRpbmdzLnB1YmxpYy5jaGFpbklkfSwgeyRzZXQ6e1wiZ292LnRhbGx5X3BhcmFtc1wiOnBhcmFtcy50YWxseV9wYXJhbXN9fSk7XG5cbiAgICAgICAgICAgIHVybCA9IEFQSSArICcvY29zbW9zL2dvdi92MWJldGExL3Byb3Bvc2Fscyc7XG4gICAgICAgICAgICByZXNwb25zZSA9IEhUVFAuZ2V0KHVybCk7XG4gICAgICAgICAgICBsZXQgcHJvcG9zYWxzID0gSlNPTi5wYXJzZShyZXNwb25zZS5jb250ZW50KS5wcm9wb3NhbHM7XG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhwcm9wb3NhbHMpO1xuXG4gICAgICAgICAgICBsZXQgZmluaXNoZWRQcm9wb3NhbElkcyA9IG5ldyBTZXQoUHJvcG9zYWxzLmZpbmQoXG4gICAgICAgICAgICAgICAge1wic3RhdHVzXCI6eyRpbjpbXCJQUk9QT1NBTF9TVEFUVVNfUEFTU0VEXCIsIFwiUFJPUE9TQUxfU1RBVFVTX1JFSkVDVEVEXCIsIFwiUFJPUE9TQUxfU1RBVFVTX1JFTU9WRURcIl19fVxuICAgICAgICAgICAgKS5mZXRjaCgpLm1hcCgocCk9PiBwLnByb3Bvc2FsSWQpKTtcblxuICAgICAgICAgICAgbGV0IGFjdGl2ZVByb3Bvc2FscyA9IG5ldyBTZXQoUHJvcG9zYWxzLmZpbmQoXG4gICAgICAgICAgICAgICAgeyBcInN0YXR1c1wiOiB7ICRpbjogW1wiUFJPUE9TQUxfU1RBVFVTX1ZPVElOR19QRVJJT0RcIl0gfSB9XG4gICAgICAgICAgICApLmZldGNoKCkubWFwKChwKSA9PiBwLnByb3Bvc2FsSWQpKTtcbiAgICAgICAgICAgIGxldCBwcm9wb3NhbElkcyA9IFtdO1xuICAgICAgICAgICAgaWYgKHByb3Bvc2Fscy5sZW5ndGggPiAwKXtcbiAgICAgICAgICAgICAgICAvLyBQcm9wb3NhbHMudXBzZXJ0KClcbiAgICAgICAgICAgICAgICBjb25zdCBidWxrUHJvcG9zYWxzID0gUHJvcG9zYWxzLnJhd0NvbGxlY3Rpb24oKS5pbml0aWFsaXplVW5vcmRlcmVkQnVsa09wKCk7XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSBpbiBwcm9wb3NhbHMpe1xuICAgICAgICAgICAgICAgICAgICBsZXQgcHJvcG9zYWwgPSBwcm9wb3NhbHNbaV07XG4gICAgICAgICAgICAgICAgICAgIHByb3Bvc2FsLnByb3Bvc2FsSWQgPSBwYXJzZUludChwcm9wb3NhbC5wcm9wb3NhbF9pZCk7XG4gICAgICAgICAgICAgICAgICAgIHByb3Bvc2FsSWRzLnB1c2gocHJvcG9zYWwucHJvcG9zYWxJZCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChwcm9wb3NhbC5wcm9wb3NhbElkID4gMCAmJiAhZmluaXNoZWRQcm9wb3NhbElkcy5oYXMocHJvcG9zYWwucHJvcG9zYWxJZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1cmwgPSBBUEkgKyAnL2dvdi9wcm9wb3NhbHMvJytwcm9wb3NhbC5wcm9wb3NhbElkKycvcHJvcG9zZXInO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCByZXNwb25zZSA9IEhUVFAuZ2V0KHVybCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnN0YXR1c0NvZGUgPT0gMjAwKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHByb3Bvc2VyID0gSlNPTi5wYXJzZShyZXNwb25zZT8uY29udGVudCk/LnJlc3VsdDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHByb3Bvc2VyLnByb3Bvc2FsX2lkICYmIChwYXJzZUludChwcm9wb3Nlci5wcm9wb3NhbF9pZCkgPT0gcHJvcG9zYWwucHJvcG9zYWxJZCkpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcG9zYWwucHJvcG9zZXIgPSBwcm9wb3Nlcj8ucHJvcG9zZXI7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFjdGl2ZVByb3Bvc2Fscy5oYXMocHJvcG9zYWwucHJvcG9zYWxJZCkpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgdmFsaWRhdG9ycyA9IFtdXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBwYWdlID0gMDtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkbyB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1cmwgPSBSUEMgKyBgL3ZhbGlkYXRvcnM/cGFnZT0keysrcGFnZX0mcGVyX3BhZ2U9MTAwYDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCByZXNwb25zZSA9IEhUVFAuZ2V0KHVybCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSBKU09OLnBhcnNlKHJlc3BvbnNlLmNvbnRlbnQpLnJlc3VsdDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbGlkYXRvcnMgPSBbLi4udmFsaWRhdG9ycywgLi4ucmVzdWx0LnZhbGlkYXRvcnNdO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2hpbGUgKHZhbGlkYXRvcnMubGVuZ3RoIDwgcGFyc2VJbnQocmVzdWx0LnRvdGFsKSlcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgYWN0aXZlVm90aW5nUG93ZXIgPSAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKHYgaW4gdmFsaWRhdG9ycykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0aXZlVm90aW5nUG93ZXIgKz0gcGFyc2VJbnQodmFsaWRhdG9yc1t2XS52b3RpbmdfcG93ZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3Bvc2FsLmFjdGl2ZVZvdGluZ1Bvd2VyID0gYWN0aXZlVm90aW5nUG93ZXI7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ1bGtQcm9wb3NhbHMuZmluZCh7cHJvcG9zYWxJZDogcHJvcG9zYWwucHJvcG9zYWxJZH0pLnVwc2VydCgpLnVwZGF0ZU9uZSh7JHNldDpwcm9wb3NhbH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBidWxrUHJvcG9zYWxzLmZpbmQoe3Byb3Bvc2FsSWQ6cHJvcG9zYWwucHJvcG9zYWxJZH0pLnVwc2VydCgpLnVwZGF0ZU9uZSh7ICRzZXQ6IHByb3Bvc2FsfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2codXJsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlLnJlc3BvbnNlLmNvbnRlbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJ1bGtQcm9wb3NhbHMuZmluZCh7cHJvcG9zYWxJZDp7JG5pbjpwcm9wb3NhbElkc30sIHN0YXR1czp7JG5pbjpbXCJQUk9QT1NBTF9TVEFUVVNfVk9USU5HX1BFUklPRFwiLCBcIlBST1BPU0FMX1NUQVRVU19QQVNTRURcIiwgXCJQUk9QT1NBTF9TVEFUVVNfUkVKRUNURURcIiwgXCJQUk9QT1NBTF9TVEFUVVNfUkVNT1ZFRFwiXX19KVxuICAgICAgICAgICAgICAgICAgICAudXBkYXRlKHskc2V0OiB7XCJzdGF0dXNcIjogXCJQUk9QT1NBTF9TVEFUVVNfUkVNT1ZFRFwifX0pO1xuICAgICAgICAgICAgICAgIGJ1bGtQcm9wb3NhbHMuZXhlY3V0ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZSl7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyh1cmwpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coZSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgICdwcm9wb3NhbHMuZ2V0UHJvcG9zYWxSZXN1bHRzJzogZnVuY3Rpb24oKXtcbiAgICAgICAgdGhpcy51bmJsb2NrKCk7XG4gICAgICAgIGxldCBwcm9wb3NhbHMgPSBQcm9wb3NhbHMuZmluZCh7XCJzdGF0dXNcIjp7JG5pbjpbXCJQUk9QT1NBTF9TVEFUVVNfUEFTU0VEXCIsIFwiUFJPUE9TQUxfU1RBVFVTX1JFSkVDVEVEXCIsIFwiUFJPUE9TQUxfU1RBVFVTX1JFTU9WRURcIl19fSkuZmV0Y2goKTtcblxuICAgICAgICBpZiAocHJvcG9zYWxzICYmIChwcm9wb3NhbHMubGVuZ3RoID4gMCkpe1xuICAgICAgICAgICAgZm9yIChsZXQgaSBpbiBwcm9wb3NhbHMpe1xuICAgICAgICAgICAgICAgIGlmIChwYXJzZUludChwcm9wb3NhbHNbaV0ucHJvcG9zYWxJZCkgPiAwKXtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHVybCA9IFwiXCI7XG4gICAgICAgICAgICAgICAgICAgIHRyeXtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGdldCBwcm9wb3NhbCBkZXBvc2l0c1xuICAgICAgICAgICAgICAgICAgICAgICAgdXJsID0gQVBJICsgJy9jb3Ntb3MvZ292L3YxYmV0YTEvcHJvcG9zYWxzLycrcHJvcG9zYWxzW2ldLnByb3Bvc2FsSWQrJy9kZXBvc2l0cz9wYWdpbmF0aW9uLmxpbWl0PTIwMDAmcGFnaW5hdGlvbi5jb3VudF90b3RhbD10cnVlJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCByZXNwb25zZSA9IEhUVFAuZ2V0KHVybCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgcHJvcG9zYWwgPSB7cHJvcG9zYWxJZDogcHJvcG9zYWxzW2ldLnByb3Bvc2FsSWR9O1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnN0YXR1c0NvZGUgPT0gMjAwKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgZGVwb3NpdHMgPSBKU09OLnBhcnNlKHJlc3BvbnNlLmNvbnRlbnQpLmRlcG9zaXRzO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3Bvc2FsLmRlcG9zaXRzID0gZGVwb3NpdHM7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHVybCA9IEFQSSArICcvY29zbW9zL2dvdi92MWJldGExL3Byb3Bvc2Fscy8nK3Byb3Bvc2Fsc1tpXS5wcm9wb3NhbElkKycvdm90ZXM/cGFnaW5hdGlvbi5saW1pdD0yMDAwJnBhZ2luYXRpb24uY291bnRfdG90YWw9dHJ1ZSc7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNwb25zZSA9IEhUVFAuZ2V0KHVybCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2Uuc3RhdHVzQ29kZSA9PSAyMDApe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCB2b3RlcyA9IEpTT04ucGFyc2UocmVzcG9uc2UuY29udGVudCkudm90ZXM7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcG9zYWwudm90ZXMgPSBnZXRWb3RlRGV0YWlsKHZvdGVzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgdXJsID0gQVBJICsgJy9jb3Ntb3MvZ292L3YxYmV0YTEvcHJvcG9zYWxzLycrcHJvcG9zYWxzW2ldLnByb3Bvc2FsSWQrJy90YWxseSc7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNwb25zZSA9IEhUVFAuZ2V0KHVybCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2Uuc3RhdHVzQ29kZSA9PSAyMDApe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCB0YWxseSA9IEpTT04ucGFyc2UocmVzcG9uc2UuY29udGVudCkudGFsbHk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcG9zYWwudGFsbHkgPSB0YWxseTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvcG9zYWwudXBkYXRlZEF0ID0gbmV3IERhdGUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFByb3Bvc2Fscy51cGRhdGUoe3Byb3Bvc2FsSWQ6IHByb3Bvc2Fsc1tpXS5wcm9wb3NhbElkfSwgeyRzZXQ6cHJvcG9zYWx9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjYXRjaChlKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHVybCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZVxuICAgIH1cbn0pXG5cbmNvbnN0IGdldFZvdGVEZXRhaWwgPSAodm90ZXMpID0+IHtcbiAgICBpZiAoIXZvdGVzKSB7XG4gICAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICBsZXQgdm90ZXJzID0gdm90ZXMubWFwKCh2b3RlKSA9PiB2b3RlLnZvdGVyKTtcbiAgICBsZXQgdm90aW5nUG93ZXJNYXAgPSB7fTtcbiAgICBsZXQgdmFsaWRhdG9yQWRkcmVzc01hcCA9IHt9O1xuICAgIFZhbGlkYXRvcnMuZmluZCh7ZGVsZWdhdG9yX2FkZHJlc3M6IHskaW46IHZvdGVyc319KS5mb3JFYWNoKCh2YWxpZGF0b3IpID0+IHtcbiAgICAgICAgdm90aW5nUG93ZXJNYXBbdmFsaWRhdG9yLmRlbGVnYXRvcl9hZGRyZXNzXSA9IHtcbiAgICAgICAgICAgIG1vbmlrZXI6IHZhbGlkYXRvci5kZXNjcmlwdGlvbi5tb25pa2VyLFxuICAgICAgICAgICAgYWRkcmVzczogdmFsaWRhdG9yLmFkZHJlc3MsXG4gICAgICAgICAgICB0b2tlbnM6IHBhcnNlRmxvYXQodmFsaWRhdG9yLnRva2VucyksXG4gICAgICAgICAgICBkZWxlZ2F0b3JTaGFyZXM6IHBhcnNlRmxvYXQodmFsaWRhdG9yLmRlbGVnYXRvcl9zaGFyZXMpLFxuICAgICAgICAgICAgZGVkdWN0ZWRTaGFyZXM6IHBhcnNlRmxvYXQodmFsaWRhdG9yLmRlbGVnYXRvcl9zaGFyZXMpXG4gICAgICAgIH1cbiAgICAgICAgdmFsaWRhdG9yQWRkcmVzc01hcFt2YWxpZGF0b3Iub3BlcmF0b3JfYWRkcmVzc10gPSB2YWxpZGF0b3IuZGVsZWdhdG9yX2FkZHJlc3M7XG4gICAgfSk7XG4gICAgdm90ZXJzLmZvckVhY2goKHZvdGVyKSA9PiB7XG4gICAgICAgIGlmICghdm90aW5nUG93ZXJNYXBbdm90ZXJdKSB7XG4gICAgICAgICAgICAvLyB2b3RlciBpcyBub3QgYSB2YWxpZGF0b3JcbiAgICAgICAgICAgIGxldCB1cmwgPSBgJHtBUEl9L2Nvc21vcy9zdGFraW5nL3YxYmV0YTEvZGVsZWdhdGlvbnMvJHt2b3Rlcn1gO1xuICAgICAgICAgICAgbGV0IGRlbGVnYXRpb25zO1xuICAgICAgICAgICAgbGV0IHZvdGluZ1Bvd2VyID0gMDtcbiAgICAgICAgICAgIHRyeXtcbiAgICAgICAgICAgICAgICBsZXQgcmVzcG9uc2UgPSBIVFRQLmdldCh1cmwpO1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5zdGF0dXNDb2RlID09IDIwMCl7XG4gICAgICAgICAgICAgICAgICAgIGRlbGVnYXRpb25zID0gSlNPTi5wYXJzZShyZXNwb25zZS5jb250ZW50KS5kZWxlZ2F0aW9uX3Jlc3BvbnNlcztcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRlbGVnYXRpb25zICYmIGRlbGVnYXRpb25zLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGVnYXRpb25zLmZvckVhY2goKGRlbGVnYXRpb24pID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgc2hhcmVzID0gcGFyc2VGbG9hdChkZWxlZ2F0aW9uLmRlbGVnYXRpb24uc2hhcmVzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodmFsaWRhdG9yQWRkcmVzc01hcFtkZWxlZ2F0aW9uLmRlbGVnYXRpb24udmFsaWRhdG9yX2FkZHJlc3NdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGRlZHVjdCBkZWxlZ2F0ZWQgc2hhcmVkcyBmcm9tIHZhbGlkYXRvciBpZiBhIGRlbGVnYXRvciB2b3Rlc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgdmFsaWRhdG9yID0gdm90aW5nUG93ZXJNYXBbdmFsaWRhdG9yQWRkcmVzc01hcFtkZWxlZ2F0aW9uLmRlbGVnYXRpb24udmFsaWRhdG9yX2FkZHJlc3NdXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsaWRhdG9yLmRlZHVjdGVkU2hhcmVzIC09IHNoYXJlcztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHBhcnNlRmxvYXQodmFsaWRhdG9yLmRlbGVnYXRvclNoYXJlcykgIT0gMCl7IC8vIGF2b2lkaW5nIGRpdmlzaW9uIGJ5IHplcm9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZvdGluZ1Bvd2VyICs9IChzaGFyZXMgLyBwYXJzZUZsb2F0KHZhbGlkYXRvci5kZWxlZ2F0b3JTaGFyZXMpKSAqIHBhcnNlRmxvYXQodmFsaWRhdG9yLnRva2Vucyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZvdGluZ1Bvd2VyICs9IHNoYXJlc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2F0Y2ggKGUpe1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHVybCk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2b3RpbmdQb3dlck1hcFt2b3Rlcl0gPSB7dm90aW5nUG93ZXI6IHZvdGluZ1Bvd2VyfTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiB2b3Rlcy5tYXAoKHZvdGUpID0+IHtcbiAgICAgICAgbGV0IHZvdGVyID0gdm90aW5nUG93ZXJNYXBbdm90ZS52b3Rlcl07XG4gICAgICAgIGxldCB2b3RpbmdQb3dlciA9IHZvdGVyLnZvdGluZ1Bvd2VyO1xuICAgICAgICBpZiAodm90aW5nUG93ZXIgPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAvLyB2b3RlciBpcyBhIHZhbGlkYXRvclxuICAgICAgICAgICAgdm90aW5nUG93ZXIgPSB2b3Rlci5kZWxlZ2F0b3JTaGFyZXM/KChwYXJzZUZsb2F0KHZvdGVyLmRlZHVjdGVkU2hhcmVzKSAvIHBhcnNlRmxvYXQodm90ZXIuZGVsZWdhdG9yU2hhcmVzKSkgKiBwYXJzZUZsb2F0KHZvdGVyLnRva2VucykpOjA7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHsuLi52b3RlLCB2b3RpbmdQb3dlcn07XG4gICAgfSk7XG59XG4iLCJpbXBvcnQgeyBNZXRlb3IgfSBmcm9tICdtZXRlb3IvbWV0ZW9yJztcbmltcG9ydCB7IFByb3Bvc2FscyB9IGZyb20gJy4uL3Byb3Bvc2Fscy5qcyc7XG5pbXBvcnQgeyBjaGVjayB9IGZyb20gJ21ldGVvci9jaGVjaydcblxuTWV0ZW9yLnB1Ymxpc2goJ3Byb3Bvc2Fscy5saXN0JywgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBQcm9wb3NhbHMuZmluZCh7fSwge3NvcnQ6e3Byb3Bvc2FsSWQ6LTF9fSk7XG59KTtcblxuTWV0ZW9yLnB1Ymxpc2goJ3Byb3Bvc2Fscy5vbmUnLCBmdW5jdGlvbiAoaWQpe1xuICAgIGNoZWNrKGlkLCBOdW1iZXIpO1xuICAgIHJldHVybiBQcm9wb3NhbHMuZmluZCh7cHJvcG9zYWxJZDppZH0pO1xufSkiLCJpbXBvcnQgeyBNb25nbyB9IGZyb20gJ21ldGVvci9tb25nbyc7XG5cbmV4cG9ydCBjb25zdCBQcm9wb3NhbHMgPSBuZXcgTW9uZ28uQ29sbGVjdGlvbigncHJvcG9zYWxzJyk7XG4iLCJpbXBvcnQgeyBNZXRlb3IgfSBmcm9tICdtZXRlb3IvbWV0ZW9yJztcbmltcG9ydCB7IE1vbmdvIH0gZnJvbSAnbWV0ZW9yL21vbmdvJztcbmltcG9ydCB7IFZhbGlkYXRvclJlY29yZHMsIEFuYWx5dGljcywgQXZlcmFnZURhdGEsIEF2ZXJhZ2VWYWxpZGF0b3JEYXRhIH0gZnJvbSAnLi4vcmVjb3Jkcy5qcyc7XG5pbXBvcnQgeyBWYWxpZGF0b3JzIH0gZnJvbSAnLi4vLi4vdmFsaWRhdG9ycy92YWxpZGF0b3JzLmpzJztcbmltcG9ydCB7IFZhbGlkYXRvclNldHMgfSBmcm9tICcvaW1wb3J0cy9hcGkvdmFsaWRhdG9yLXNldHMvdmFsaWRhdG9yLXNldHMuanMnO1xuaW1wb3J0IHsgU3RhdHVzIH0gZnJvbSAnLi4vLi4vc3RhdHVzL3N0YXR1cy5qcyc7XG5pbXBvcnQgeyBNaXNzZWRCbG9ja3NTdGF0cyB9IGZyb20gJy4uL3JlY29yZHMuanMnO1xuaW1wb3J0IHsgTWlzc2VkQmxvY2tzIH0gZnJvbSAnLi4vcmVjb3Jkcy5qcyc7XG5pbXBvcnQgeyBCbG9ja3Njb24gfSBmcm9tICcuLi8uLi9ibG9ja3MvYmxvY2tzLmpzJztcbmltcG9ydCB7IENoYWluIH0gZnJvbSAnLi4vLi4vY2hhaW4vY2hhaW4uanMnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmNvbnN0IEJVTEtVUERBVEVNQVhTSVpFID0gMTAwMDtcblxuY29uc3QgZ2V0QmxvY2tTdGF0cyA9IChzdGFydEhlaWdodCwgbGF0ZXN0SGVpZ2h0KSA9PiB7XG4gICAgbGV0IGJsb2NrU3RhdHMgPSB7fTtcbiAgICBjb25zdCBjb25kID0geyRhbmQ6IFtcbiAgICAgICAgeyBoZWlnaHQ6IHsgJGd0OiBzdGFydEhlaWdodCB9IH0sXG4gICAgICAgIHsgaGVpZ2h0OiB7ICRsdGU6IGxhdGVzdEhlaWdodCB9IH0gXX07XG4gICAgY29uc3Qgb3B0aW9ucyA9IHtzb3J0OntoZWlnaHQ6IDF9fTtcbiAgICBCbG9ja3Njb24uZmluZChjb25kLCBvcHRpb25zKS5mb3JFYWNoKChibG9jaykgPT4ge1xuICAgICAgICBibG9ja1N0YXRzW2Jsb2NrLmhlaWdodF0gPSB7XG4gICAgICAgICAgICBoZWlnaHQ6IGJsb2NrLmhlaWdodCxcbiAgICAgICAgICAgIHByb3Bvc2VyQWRkcmVzczogYmxvY2sucHJvcG9zZXJBZGRyZXNzLFxuICAgICAgICAgICAgcHJlY29tbWl0c0NvdW50OiBibG9jay5wcmVjb21taXRzQ291bnQsXG4gICAgICAgICAgICB2YWxpZGF0b3JzQ291bnQ6IGJsb2NrLnZhbGlkYXRvcnNDb3VudCxcbiAgICAgICAgICAgIHZhbGlkYXRvcnM6IGJsb2NrLnZhbGlkYXRvcnMsXG4gICAgICAgICAgICB0aW1lOiBibG9jay50aW1lXG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIEFuYWx5dGljcy5maW5kKGNvbmQsIG9wdGlvbnMpLmZvckVhY2goKGJsb2NrKSA9PiB7XG4gICAgICAgIGlmICghYmxvY2tTdGF0c1tibG9jay5oZWlnaHRdKSB7XG4gICAgICAgICAgICBibG9ja1N0YXRzW2Jsb2NrLmhlaWdodF0gPSB7IGhlaWdodDogYmxvY2suaGVpZ2h0IH07XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgYmxvY2sgJHtibG9jay5oZWlnaHR9IGRvZXMgbm90IGhhdmUgYW4gZW50cnlgKTtcbiAgICAgICAgfVxuICAgICAgICBfLmFzc2lnbihibG9ja1N0YXRzW2Jsb2NrLmhlaWdodF0sIHtcbiAgICAgICAgICAgIHByZWNvbW1pdHM6IGJsb2NrLnByZWNvbW1pdHMsXG4gICAgICAgICAgICBhdmVyYWdlQmxvY2tUaW1lOiBibG9jay5hdmVyYWdlQmxvY2tUaW1lLFxuICAgICAgICAgICAgdGltZURpZmY6IGJsb2NrLnRpbWVEaWZmLFxuICAgICAgICAgICAgdm90aW5nX3Bvd2VyOiBibG9jay52b3RpbmdfcG93ZXJcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIGJsb2NrU3RhdHM7XG59XG5cbmNvbnN0IGdldFByZXZpb3VzUmVjb3JkID0gKHZvdGVyQWRkcmVzcywgcHJvcG9zZXJBZGRyZXNzKSA9PiB7XG4gICAgbGV0IHByZXZpb3VzUmVjb3JkID0gTWlzc2VkQmxvY2tzLmZpbmRPbmUoXG4gICAgICAgIHt2b3Rlcjp2b3RlckFkZHJlc3MsIHByb3Bvc2VyOnByb3Bvc2VyQWRkcmVzcywgYmxvY2tIZWlnaHQ6IC0xfSk7XG4gICAgbGV0IGxhc3RVcGRhdGVkSGVpZ2h0ID0gTWV0ZW9yLnNldHRpbmdzLnBhcmFtcy5zdGFydEhlaWdodDtcbiAgICBsZXQgcHJldlN0YXRzID0ge307XG4gICAgaWYgKHByZXZpb3VzUmVjb3JkKSB7XG4gICAgICAgIHByZXZTdGF0cyA9IF8ucGljayhwcmV2aW91c1JlY29yZCwgWydtaXNzQ291bnQnLCAndG90YWxDb3VudCddKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBwcmV2U3RhdHMgPSB7XG4gICAgICAgICAgICBtaXNzQ291bnQ6IDAsXG4gICAgICAgICAgICB0b3RhbENvdW50OiAwXG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHByZXZTdGF0cztcbn1cblxuTWV0ZW9yLm1ldGhvZHMoe1xuICAgICdWYWxpZGF0b3JSZWNvcmRzLmNhbGN1bGF0ZU1pc3NlZEJsb2Nrcyc6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHRoaXMudW5ibG9jaygpO1xuICAgICAgICBpZiAoIUNPVU5UTUlTU0VEQkxPQ0tTKXtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgbGV0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XG4gICAgICAgICAgICAgICAgQ09VTlRNSVNTRURCTE9DS1MgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdjYWx1bGF0ZSBtaXNzZWQgYmxvY2tzIGNvdW50Jyk7XG4gICAgICAgICAgICAgICAgdGhpcy51bmJsb2NrKCk7XG4gICAgICAgICAgICAgICAgbGV0IHZhbGlkYXRvcnMgPSBWYWxpZGF0b3JzLmZpbmQoe30pLmZldGNoKCk7XG4gICAgICAgICAgICAgICAgbGV0IGxhdGVzdEhlaWdodCA9IE1ldGVvci5jYWxsKCdibG9ja3MuZ2V0Q3VycmVudEhlaWdodCcpO1xuICAgICAgICAgICAgICAgIGxldCBleHBsb3JlclN0YXR1cyA9IFN0YXR1cy5maW5kT25lKHtjaGFpbklkOiBNZXRlb3Iuc2V0dGluZ3MucHVibGljLmNoYWluSWR9KTtcbiAgICAgICAgICAgICAgICBsZXQgc3RhcnRIZWlnaHQgPSAoZXhwbG9yZXJTdGF0dXMmJmV4cGxvcmVyU3RhdHVzLmxhc3RQcm9jZXNzZWRNaXNzZWRCbG9ja0hlaWdodCk/ZXhwbG9yZXJTdGF0dXMubGFzdFByb2Nlc3NlZE1pc3NlZEJsb2NrSGVpZ2h0Ok1ldGVvci5zZXR0aW5ncy5wYXJhbXMuc3RhcnRIZWlnaHQ7XG4gICAgICAgICAgICAgICAgbGF0ZXN0SGVpZ2h0ID0gTWF0aC5taW4oc3RhcnRIZWlnaHQgKyBCVUxLVVBEQVRFTUFYU0laRSwgbGF0ZXN0SGVpZ2h0KTtcbiAgICAgICAgICAgICAgICBjb25zdCBidWxrTWlzc2VkU3RhdHMgPSBNaXNzZWRCbG9ja3MucmF3Q29sbGVjdGlvbigpLmluaXRpYWxpemVPcmRlcmVkQnVsa09wKCk7XG5cbiAgICAgICAgICAgICAgICBsZXQgdmFsaWRhdG9yc01hcCA9IHt9O1xuICAgICAgICAgICAgICAgIHZhbGlkYXRvcnMuZm9yRWFjaCgodmFsaWRhdG9yKSA9PiB2YWxpZGF0b3JzTWFwW3ZhbGlkYXRvci5hZGRyZXNzXSA9IHZhbGlkYXRvcik7XG5cbiAgICAgICAgICAgICAgICAvLyBhIG1hcCBvZiBibG9jayBoZWlnaHQgdG8gYmxvY2sgc3RhdHNcbiAgICAgICAgICAgICAgICBsZXQgYmxvY2tTdGF0cyA9IGdldEJsb2NrU3RhdHMoc3RhcnRIZWlnaHQsIGxhdGVzdEhlaWdodCk7XG5cbiAgICAgICAgICAgICAgICAvLyBwcm9wb3NlclZvdGVyU3RhdHMgaXMgYSBwcm9wb3Nlci12b3RlciBtYXAgY291bnRpbmcgbnVtYmVycyBvZiBwcm9wb3NlZCBibG9ja3Mgb2Ygd2hpY2ggdm90ZXIgaXMgYW4gYWN0aXZlIHZhbGlkYXRvclxuICAgICAgICAgICAgICAgIGxldCBwcm9wb3NlclZvdGVyU3RhdHMgPSB7fVxuXG4gICAgICAgICAgICAgICAgXy5mb3JFYWNoKGJsb2NrU3RhdHMsIChibG9jaywgYmxvY2tIZWlnaHQpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHByb3Bvc2VyQWRkcmVzcyA9IGJsb2NrLnByb3Bvc2VyQWRkcmVzcztcbiAgICAgICAgICAgICAgICAgICAgbGV0IHZvdGVkVmFsaWRhdG9ycyA9IG5ldyBTZXQoYmxvY2sudmFsaWRhdG9ycyk7XG4gICAgICAgICAgICAgICAgICAgIGxldCB2YWxpZGF0b3JTZXRzID0gVmFsaWRhdG9yU2V0cy5maW5kT25lKHtibG9ja19oZWlnaHQ6YmxvY2suaGVpZ2h0fSk7XG4gICAgICAgICAgICAgICAgICAgIGxldCB2b3RlZFZvdGluZ1Bvd2VyID0gMDtcblxuICAgICAgICAgICAgICAgICAgICB2YWxpZGF0b3JTZXRzLnZhbGlkYXRvcnMuZm9yRWFjaCgoYWN0aXZlVmFsaWRhdG9yKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodm90ZWRWYWxpZGF0b3JzLmhhcyhhY3RpdmVWYWxpZGF0b3IuYWRkcmVzcykpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdm90ZWRWb3RpbmdQb3dlciArPSBwYXJzZUZsb2F0KGFjdGl2ZVZhbGlkYXRvci52b3RpbmdfcG93ZXIpXG4gICAgICAgICAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICAgICAgICAgICAgdmFsaWRhdG9yU2V0cy52YWxpZGF0b3JzLmZvckVhY2goKGFjdGl2ZVZhbGlkYXRvcikgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGN1cnJlbnRWYWxpZGF0b3IgPSBhY3RpdmVWYWxpZGF0b3IuYWRkcmVzc1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFfLmhhcyhwcm9wb3NlclZvdGVyU3RhdHMsIFtwcm9wb3NlckFkZHJlc3MsIGN1cnJlbnRWYWxpZGF0b3JdKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBwcmV2U3RhdHMgPSBnZXRQcmV2aW91c1JlY29yZChjdXJyZW50VmFsaWRhdG9yLCBwcm9wb3NlckFkZHJlc3MpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF8uc2V0KHByb3Bvc2VyVm90ZXJTdGF0cywgW3Byb3Bvc2VyQWRkcmVzcywgY3VycmVudFZhbGlkYXRvcl0sIHByZXZTdGF0cyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIF8udXBkYXRlKHByb3Bvc2VyVm90ZXJTdGF0cywgW3Byb3Bvc2VyQWRkcmVzcywgY3VycmVudFZhbGlkYXRvciwgJ3RvdGFsQ291bnQnXSwgKG4pID0+IG4rMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXZvdGVkVmFsaWRhdG9ycy5oYXMoY3VycmVudFZhbGlkYXRvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfLnVwZGF0ZShwcm9wb3NlclZvdGVyU3RhdHMsIFtwcm9wb3NlckFkZHJlc3MsIGN1cnJlbnRWYWxpZGF0b3IsICdtaXNzQ291bnQnXSwgKG4pID0+IG4rMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnVsa01pc3NlZFN0YXRzLmluc2VydCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZvdGVyOiBjdXJyZW50VmFsaWRhdG9yLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBibG9ja0hlaWdodDogYmxvY2suaGVpZ2h0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wb3NlcjogcHJvcG9zZXJBZGRyZXNzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcmVjb21taXRzQ291bnQ6IGJsb2NrLnByZWNvbW1pdHNDb3VudCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsaWRhdG9yc0NvdW50OiBibG9jay52YWxpZGF0b3JzQ291bnQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpbWU6IGJsb2NrLnRpbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByZWNvbW1pdHM6IGJsb2NrLnByZWNvbW1pdHMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF2ZXJhZ2VCbG9ja1RpbWU6IGJsb2NrLmF2ZXJhZ2VCbG9ja1RpbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpbWVEaWZmOiBibG9jay50aW1lRGlmZixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdm90aW5nUG93ZXI6IGJsb2NrLnZvdGluZ19wb3dlcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdm90ZWRWb3RpbmdQb3dlcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdXBkYXRlZEF0OiBsYXRlc3RIZWlnaHQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1pc3NDb3VudDogXy5nZXQocHJvcG9zZXJWb3RlclN0YXRzLCBbcHJvcG9zZXJBZGRyZXNzLCBjdXJyZW50VmFsaWRhdG9yLCAnbWlzc0NvdW50J10pLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b3RhbENvdW50OiBfLmdldChwcm9wb3NlclZvdGVyU3RhdHMsIFtwcm9wb3NlckFkZHJlc3MsIGN1cnJlbnRWYWxpZGF0b3IsICd0b3RhbENvdW50J10pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICBfLmZvckVhY2gocHJvcG9zZXJWb3RlclN0YXRzLCAodm90ZXJzLCBwcm9wb3NlckFkZHJlc3MpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgXy5mb3JFYWNoKHZvdGVycywgKHN0YXRzLCB2b3RlckFkZHJlc3MpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJ1bGtNaXNzZWRTdGF0cy5maW5kKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2b3Rlcjogdm90ZXJBZGRyZXNzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3Bvc2VyOiBwcm9wb3NlckFkZHJlc3MsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYmxvY2tIZWlnaHQ6IC0xXG4gICAgICAgICAgICAgICAgICAgICAgICB9KS51cHNlcnQoKS51cGRhdGVPbmUoeyRzZXQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2b3Rlcjogdm90ZXJBZGRyZXNzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3Bvc2VyOiBwcm9wb3NlckFkZHJlc3MsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYmxvY2tIZWlnaHQ6IC0xLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVwZGF0ZWRBdDogbGF0ZXN0SGVpZ2h0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1pc3NDb3VudDogXy5nZXQoc3RhdHMsICdtaXNzQ291bnQnKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b3RhbENvdW50OiBfLmdldChzdGF0cywgJ3RvdGFsQ291bnQnKVxuICAgICAgICAgICAgICAgICAgICAgICAgfX0pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIGxldCBtZXNzYWdlID0gJyc7XG4gICAgICAgICAgICAgICAgaWYgKGJ1bGtNaXNzZWRTdGF0cy5sZW5ndGggPiAwKXtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY2xpZW50ID0gTWlzc2VkQmxvY2tzLl9kcml2ZXIubW9uZ28uY2xpZW50O1xuICAgICAgICAgICAgICAgICAgICAvLyBUT0RPOiBhZGQgdHJhbnNhY3Rpb24gYmFjayBhZnRlciByZXBsaWNhIHNldCgjMTQ2KSBpcyBzZXQgdXBcbiAgICAgICAgICAgICAgICAgICAgLy8gbGV0IHNlc3Npb24gPSBjbGllbnQuc3RhcnRTZXNzaW9uKCk7XG4gICAgICAgICAgICAgICAgICAgIC8vIHNlc3Npb24uc3RhcnRUcmFuc2FjdGlvbigpO1xuICAgICAgICAgICAgICAgICAgICBsZXQgYnVsa1Byb21pc2UgPSBidWxrTWlzc2VkU3RhdHMuZXhlY3V0ZShudWxsLyosIHtzZXNzaW9ufSovKS50aGVuKFxuICAgICAgICAgICAgICAgICAgICAgICAgTWV0ZW9yLmJpbmRFbnZpcm9ubWVudCgocmVzdWx0LCBlcnIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgQ09VTlRNSVNTRURCTE9DS1MgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gUHJvbWlzZS5hd2FpdChzZXNzaW9uLmFib3J0VHJhbnNhY3Rpb24oKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IGVycjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3VsdCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFByb21pc2UuYXdhaXQoc2Vzc2lvbi5jb21taXRUcmFuc2FjdGlvbigpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSA9IGAoJHtyZXN1bHQucmVzdWx0Lm5JbnNlcnRlZH0gaW5zZXJ0ZWQsIGAgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGAke3Jlc3VsdC5yZXN1bHQublVwc2VydGVkfSB1cHNlcnRlZCwgYCArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYCR7cmVzdWx0LnJlc3VsdC5uTW9kaWZpZWR9IG1vZGlmaWVkKWA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSkpO1xuXG4gICAgICAgICAgICAgICAgICAgIFByb21pc2UuYXdhaXQoYnVsa1Byb21pc2UpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIENPVU5UTUlTU0VEQkxPQ0tTID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgU3RhdHVzLnVwc2VydCh7Y2hhaW5JZDogTWV0ZW9yLnNldHRpbmdzLnB1YmxpYy5jaGFpbklkfSwgeyRzZXQ6e2xhc3RQcm9jZXNzZWRNaXNzZWRCbG9ja0hlaWdodDpsYXRlc3RIZWlnaHQsIGxhc3RQcm9jZXNzZWRNaXNzZWRCbG9ja1RpbWU6IG5ldyBEYXRlKCl9fSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGBkb25lIGluICR7RGF0ZS5ub3coKSAtIHN0YXJ0VGltZX1tcyAke21lc3NhZ2V9YDtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICBDT1VOVE1JU1NFREJMT0NLUyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZXtcbiAgICAgICAgICAgIHJldHVybiBcInVwZGF0aW5nLi4uXCI7XG4gICAgICAgIH1cbiAgICB9LFxuICAgICdWYWxpZGF0b3JSZWNvcmRzLmNhbGN1bGF0ZU1pc3NlZEJsb2Nrc1N0YXRzJzogZnVuY3Rpb24oKXtcbiAgICAgICAgdGhpcy51bmJsb2NrKCk7XG4gICAgICAgIC8vIFRPRE86IGRlcHJlY2F0ZSB0aGlzIG1ldGhvZCBhbmQgTWlzc2VkQmxvY2tzU3RhdHMgY29sbGVjdGlvblxuICAgICAgICAvLyBjb25zb2xlLmxvZyhcIlZhbGlkYXRvclJlY29yZHMuY2FsY3VsYXRlTWlzc2VkQmxvY2tzOiBcIitDT1VOVE1JU1NFREJMT0NLUyk7XG4gICAgICAgIGlmICghQ09VTlRNSVNTRURCTE9DS1NTVEFUUyl7XG4gICAgICAgICAgICBDT1VOVE1JU1NFREJMT0NLU1NUQVRTID0gdHJ1ZTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdjYWx1bGF0ZSBtaXNzZWQgYmxvY2tzIHN0YXRzJyk7XG4gICAgICAgICAgICB0aGlzLnVuYmxvY2soKTtcbiAgICAgICAgICAgIGxldCB2YWxpZGF0b3JzID0gVmFsaWRhdG9ycy5maW5kKHt9KS5mZXRjaCgpO1xuICAgICAgICAgICAgbGV0IGxhdGVzdEhlaWdodCA9IE1ldGVvci5jYWxsKCdibG9ja3MuZ2V0Q3VycmVudEhlaWdodCcpO1xuICAgICAgICAgICAgbGV0IGV4cGxvcmVyU3RhdHVzID0gU3RhdHVzLmZpbmRPbmUoe2NoYWluSWQ6IE1ldGVvci5zZXR0aW5ncy5wdWJsaWMuY2hhaW5JZH0pO1xuICAgICAgICAgICAgbGV0IHN0YXJ0SGVpZ2h0ID0gKGV4cGxvcmVyU3RhdHVzJiZleHBsb3JlclN0YXR1cy5sYXN0TWlzc2VkQmxvY2tIZWlnaHQpP2V4cGxvcmVyU3RhdHVzLmxhc3RNaXNzZWRCbG9ja0hlaWdodDpNZXRlb3Iuc2V0dGluZ3MucGFyYW1zLnN0YXJ0SGVpZ2h0O1xuICAgICAgICAgICAgLy8gY29uc29sZS5sb2cobGF0ZXN0SGVpZ2h0KTtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKHN0YXJ0SGVpZ2h0KTtcbiAgICAgICAgICAgIGNvbnN0IGJ1bGtNaXNzZWRTdGF0cyA9IE1pc3NlZEJsb2Nrc1N0YXRzLnJhd0NvbGxlY3Rpb24oKS5pbml0aWFsaXplVW5vcmRlcmVkQnVsa09wKCk7XG4gICAgICAgICAgICBmb3IgKGkgaW4gdmFsaWRhdG9ycyl7XG4gICAgICAgICAgICAgICAgLy8gaWYgKCh2YWxpZGF0b3JzW2ldLmFkZHJlc3MgPT0gXCJCODU1MkVBQzBEMTIzQTZCRjYwOTEyMzA0N0E1MTgxRDQ1RUU5MEI1XCIpIHx8ICh2YWxpZGF0b3JzW2ldLmFkZHJlc3MgPT0gXCI2OUQ5OUIyQzY2MDQzQUNCRUFBODQ0NzUyNUMzNTZBRkM2NDA4RTBDXCIpIHx8ICh2YWxpZGF0b3JzW2ldLmFkZHJlc3MgPT0gXCIzNUFEN0EyQ0QyRkM3MTcxMUE2NzU4MzBFQzExNTgwODIyNzNENDU3XCIpKXtcbiAgICAgICAgICAgICAgICBsZXQgdm90ZXJBZGRyZXNzID0gdmFsaWRhdG9yc1tpXS5hZGRyZXNzO1xuICAgICAgICAgICAgICAgIGxldCBtaXNzZWRSZWNvcmRzID0gVmFsaWRhdG9yUmVjb3Jkcy5maW5kKHtcbiAgICAgICAgICAgICAgICAgICAgYWRkcmVzczp2b3RlckFkZHJlc3MsXG4gICAgICAgICAgICAgICAgICAgIGV4aXN0czpmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgJGFuZDogWyB7IGhlaWdodDogeyAkZ3Q6IHN0YXJ0SGVpZ2h0IH0gfSwgeyBoZWlnaHQ6IHsgJGx0ZTogbGF0ZXN0SGVpZ2h0IH0gfSBdXG4gICAgICAgICAgICAgICAgfSkuZmV0Y2goKTtcblxuICAgICAgICAgICAgICAgIGxldCBjb3VudHMgPSB7fTtcblxuICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwibWlzc2VkUmVjb3JkcyB0byBwcm9jZXNzOiBcIittaXNzZWRSZWNvcmRzLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgZm9yIChiIGluIG1pc3NlZFJlY29yZHMpe1xuICAgICAgICAgICAgICAgICAgICBsZXQgYmxvY2sgPSBCbG9ja3Njb24uZmluZE9uZSh7aGVpZ2h0Om1pc3NlZFJlY29yZHNbYl0uaGVpZ2h0fSk7XG4gICAgICAgICAgICAgICAgICAgIGxldCBleGlzdGluZ1JlY29yZCA9IE1pc3NlZEJsb2Nrc1N0YXRzLmZpbmRPbmUoe3ZvdGVyOnZvdGVyQWRkcmVzcywgcHJvcG9zZXI6YmxvY2sucHJvcG9zZXJBZGRyZXNzfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBjb3VudHNbYmxvY2sucHJvcG9zZXJBZGRyZXNzXSA9PT0gJ3VuZGVmaW5lZCcpe1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGV4aXN0aW5nUmVjb3JkKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb3VudHNbYmxvY2sucHJvcG9zZXJBZGRyZXNzXSA9IGV4aXN0aW5nUmVjb3JkLmNvdW50KzE7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvdW50c1tibG9jay5wcm9wb3NlckFkZHJlc3NdID0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgICAgICAgICAgICAgY291bnRzW2Jsb2NrLnByb3Bvc2VyQWRkcmVzc10rKztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGZvciAoYWRkcmVzcyBpbiBjb3VudHMpe1xuICAgICAgICAgICAgICAgICAgICBsZXQgZGF0YSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZvdGVyOiB2b3RlckFkZHJlc3MsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9wb3NlcjphZGRyZXNzLFxuICAgICAgICAgICAgICAgICAgICAgICAgY291bnQ6IGNvdW50c1thZGRyZXNzXVxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgYnVsa01pc3NlZFN0YXRzLmZpbmQoe3ZvdGVyOnZvdGVyQWRkcmVzcywgcHJvcG9zZXI6YWRkcmVzc30pLnVwc2VydCgpLnVwZGF0ZU9uZSh7JHNldDpkYXRhfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIH1cblxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoYnVsa01pc3NlZFN0YXRzLmxlbmd0aCA+IDApe1xuICAgICAgICAgICAgICAgIGJ1bGtNaXNzZWRTdGF0cy5leGVjdXRlKE1ldGVvci5iaW5kRW52aXJvbm1lbnQoKGVyciwgcmVzdWx0KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlcnIpe1xuICAgICAgICAgICAgICAgICAgICAgICAgQ09VTlRNSVNTRURCTE9DS1NTVEFUUyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAocmVzdWx0KXtcbiAgICAgICAgICAgICAgICAgICAgICAgIFN0YXR1cy51cHNlcnQoe2NoYWluSWQ6IE1ldGVvci5zZXR0aW5ncy5wdWJsaWMuY2hhaW5JZH0sIHskc2V0OntsYXN0TWlzc2VkQmxvY2tIZWlnaHQ6bGF0ZXN0SGVpZ2h0LCBsYXN0TWlzc2VkQmxvY2tUaW1lOiBuZXcgRGF0ZSgpfX0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgQ09VTlRNSVNTRURCTE9DS1NTVEFUUyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJkb25lXCIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZXtcbiAgICAgICAgICAgICAgICBDT1VOVE1JU1NFREJMT0NLU1NUQVRTID0gZmFsc2U7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGVsc2V7XG4gICAgICAgICAgICByZXR1cm4gXCJ1cGRhdGluZy4uLlwiO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAnQW5hbHl0aWNzLmFnZ3JlZ2F0ZUJsb2NrVGltZUFuZFZvdGluZ1Bvd2VyJzogZnVuY3Rpb24odGltZSl7XG4gICAgICAgIHRoaXMudW5ibG9jaygpO1xuICAgICAgICBsZXQgbm93ID0gbmV3IERhdGUoKTtcblxuICAgICAgICBpZiAodGltZSA9PSAnbScpe1xuICAgICAgICAgICAgbGV0IGF2ZXJhZ2VCbG9ja1RpbWUgPSAwO1xuICAgICAgICAgICAgbGV0IGF2ZXJhZ2VWb3RpbmdQb3dlciA9IDA7XG5cbiAgICAgICAgICAgIGxldCBhbmFseXRpY3MgPSBBbmFseXRpY3MuZmluZCh7IFwidGltZVwiOiB7ICRndDogbmV3IERhdGUoRGF0ZS5ub3coKSAtIDYwICogMTAwMCkgfSB9KS5mZXRjaCgpO1xuICAgICAgICAgICAgaWYgKGFuYWx5dGljcy5sZW5ndGggPiAwKXtcbiAgICAgICAgICAgICAgICBmb3IgKGkgaW4gYW5hbHl0aWNzKXtcbiAgICAgICAgICAgICAgICAgICAgYXZlcmFnZUJsb2NrVGltZSArPSBhbmFseXRpY3NbaV0udGltZURpZmY7XG4gICAgICAgICAgICAgICAgICAgIGF2ZXJhZ2VWb3RpbmdQb3dlciArPSBhbmFseXRpY3NbaV0udm90aW5nX3Bvd2VyO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBhdmVyYWdlQmxvY2tUaW1lID0gYXZlcmFnZUJsb2NrVGltZSAvIGFuYWx5dGljcy5sZW5ndGg7XG4gICAgICAgICAgICAgICAgYXZlcmFnZVZvdGluZ1Bvd2VyID0gYXZlcmFnZVZvdGluZ1Bvd2VyIC8gYW5hbHl0aWNzLmxlbmd0aDtcblxuICAgICAgICAgICAgICAgIENoYWluLnVwZGF0ZSh7Y2hhaW5JZDpNZXRlb3Iuc2V0dGluZ3MucHVibGljLmNoYWluSWR9LHskc2V0OntsYXN0TWludXRlVm90aW5nUG93ZXI6YXZlcmFnZVZvdGluZ1Bvd2VyLCBsYXN0TWludXRlQmxvY2tUaW1lOmF2ZXJhZ2VCbG9ja1RpbWV9fSk7XG4gICAgICAgICAgICAgICAgQXZlcmFnZURhdGEuaW5zZXJ0KHtcbiAgICAgICAgICAgICAgICAgICAgYXZlcmFnZUJsb2NrVGltZTogYXZlcmFnZUJsb2NrVGltZSxcbiAgICAgICAgICAgICAgICAgICAgYXZlcmFnZVZvdGluZ1Bvd2VyOiBhdmVyYWdlVm90aW5nUG93ZXIsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IHRpbWUsXG4gICAgICAgICAgICAgICAgICAgIGNyZWF0ZWRBdDogbm93XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAodGltZSA9PSAnaCcpe1xuICAgICAgICAgICAgbGV0IGF2ZXJhZ2VCbG9ja1RpbWUgPSAwO1xuICAgICAgICAgICAgbGV0IGF2ZXJhZ2VWb3RpbmdQb3dlciA9IDA7XG4gICAgICAgICAgICBsZXQgYW5hbHl0aWNzID0gQW5hbHl0aWNzLmZpbmQoeyBcInRpbWVcIjogeyAkZ3Q6IG5ldyBEYXRlKERhdGUubm93KCkgLSA2MCo2MCAqIDEwMDApIH0gfSkuZmV0Y2goKTtcbiAgICAgICAgICAgIGlmIChhbmFseXRpY3MubGVuZ3RoID4gMCl7XG4gICAgICAgICAgICAgICAgZm9yIChpIGluIGFuYWx5dGljcyl7XG4gICAgICAgICAgICAgICAgICAgIGF2ZXJhZ2VCbG9ja1RpbWUgKz0gYW5hbHl0aWNzW2ldLnRpbWVEaWZmO1xuICAgICAgICAgICAgICAgICAgICBhdmVyYWdlVm90aW5nUG93ZXIgKz0gYW5hbHl0aWNzW2ldLnZvdGluZ19wb3dlcjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYXZlcmFnZUJsb2NrVGltZSA9IGF2ZXJhZ2VCbG9ja1RpbWUgLyBhbmFseXRpY3MubGVuZ3RoO1xuICAgICAgICAgICAgICAgIGF2ZXJhZ2VWb3RpbmdQb3dlciA9IGF2ZXJhZ2VWb3RpbmdQb3dlciAvIGFuYWx5dGljcy5sZW5ndGg7XG5cbiAgICAgICAgICAgICAgICBDaGFpbi51cGRhdGUoe2NoYWluSWQ6TWV0ZW9yLnNldHRpbmdzLnB1YmxpYy5jaGFpbklkfSx7JHNldDp7bGFzdEhvdXJWb3RpbmdQb3dlcjphdmVyYWdlVm90aW5nUG93ZXIsIGxhc3RIb3VyQmxvY2tUaW1lOmF2ZXJhZ2VCbG9ja1RpbWV9fSk7XG4gICAgICAgICAgICAgICAgQXZlcmFnZURhdGEuaW5zZXJ0KHtcbiAgICAgICAgICAgICAgICAgICAgYXZlcmFnZUJsb2NrVGltZTogYXZlcmFnZUJsb2NrVGltZSxcbiAgICAgICAgICAgICAgICAgICAgYXZlcmFnZVZvdGluZ1Bvd2VyOiBhdmVyYWdlVm90aW5nUG93ZXIsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IHRpbWUsXG4gICAgICAgICAgICAgICAgICAgIGNyZWF0ZWRBdDogbm93XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aW1lID09ICdkJyl7XG4gICAgICAgICAgICBsZXQgYXZlcmFnZUJsb2NrVGltZSA9IDA7XG4gICAgICAgICAgICBsZXQgYXZlcmFnZVZvdGluZ1Bvd2VyID0gMDtcbiAgICAgICAgICAgIGxldCBhbmFseXRpY3MgPSBBbmFseXRpY3MuZmluZCh7IFwidGltZVwiOiB7ICRndDogbmV3IERhdGUoRGF0ZS5ub3coKSAtIDI0KjYwKjYwICogMTAwMCkgfSB9KS5mZXRjaCgpO1xuICAgICAgICAgICAgaWYgKGFuYWx5dGljcy5sZW5ndGggPiAwKXtcbiAgICAgICAgICAgICAgICBmb3IgKGkgaW4gYW5hbHl0aWNzKXtcbiAgICAgICAgICAgICAgICAgICAgYXZlcmFnZUJsb2NrVGltZSArPSBhbmFseXRpY3NbaV0udGltZURpZmY7XG4gICAgICAgICAgICAgICAgICAgIGF2ZXJhZ2VWb3RpbmdQb3dlciArPSBhbmFseXRpY3NbaV0udm90aW5nX3Bvd2VyO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBhdmVyYWdlQmxvY2tUaW1lID0gYXZlcmFnZUJsb2NrVGltZSAvIGFuYWx5dGljcy5sZW5ndGg7XG4gICAgICAgICAgICAgICAgYXZlcmFnZVZvdGluZ1Bvd2VyID0gYXZlcmFnZVZvdGluZ1Bvd2VyIC8gYW5hbHl0aWNzLmxlbmd0aDtcblxuICAgICAgICAgICAgICAgIENoYWluLnVwZGF0ZSh7Y2hhaW5JZDpNZXRlb3Iuc2V0dGluZ3MucHVibGljLmNoYWluSWR9LHskc2V0OntsYXN0RGF5Vm90aW5nUG93ZXI6YXZlcmFnZVZvdGluZ1Bvd2VyLCBsYXN0RGF5QmxvY2tUaW1lOmF2ZXJhZ2VCbG9ja1RpbWV9fSk7XG4gICAgICAgICAgICAgICAgQXZlcmFnZURhdGEuaW5zZXJ0KHtcbiAgICAgICAgICAgICAgICAgICAgYXZlcmFnZUJsb2NrVGltZTogYXZlcmFnZUJsb2NrVGltZSxcbiAgICAgICAgICAgICAgICAgICAgYXZlcmFnZVZvdGluZ1Bvd2VyOiBhdmVyYWdlVm90aW5nUG93ZXIsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IHRpbWUsXG4gICAgICAgICAgICAgICAgICAgIGNyZWF0ZWRBdDogbm93XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHJldHVybiBhbmFseXRpY3MubGVuZ3RoO1xuICAgIH0sXG4gICAgJ0FuYWx5dGljcy5hZ2dyZWdhdGVWYWxpZGF0b3JEYWlseUJsb2NrVGltZSc6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHRoaXMudW5ibG9jaygpO1xuICAgICAgICBsZXQgdmFsaWRhdG9ycyA9IFZhbGlkYXRvcnMuZmluZCh7fSkuZmV0Y2goKTtcbiAgICAgICAgbGV0IG5vdyA9IG5ldyBEYXRlKCk7XG4gICAgICAgIGZvciAoaSBpbiB2YWxpZGF0b3JzKXtcbiAgICAgICAgICAgIGxldCBhdmVyYWdlQmxvY2tUaW1lID0gMDtcblxuICAgICAgICAgICAgbGV0IGJsb2NrcyA9IEJsb2Nrc2Nvbi5maW5kKHtwcm9wb3NlckFkZHJlc3M6dmFsaWRhdG9yc1tpXS5hZGRyZXNzLCBcInRpbWVcIjogeyAkZ3Q6IG5ldyBEYXRlKERhdGUubm93KCkgLSAyNCo2MCo2MCAqIDEwMDApIH19LCB7ZmllbGRzOntoZWlnaHQ6MX19KS5mZXRjaCgpO1xuXG4gICAgICAgICAgICBpZiAoYmxvY2tzLmxlbmd0aCA+IDApe1xuICAgICAgICAgICAgICAgIGxldCBibG9ja0hlaWdodHMgPSBbXTtcbiAgICAgICAgICAgICAgICBmb3IgKGIgaW4gYmxvY2tzKXtcbiAgICAgICAgICAgICAgICAgICAgYmxvY2tIZWlnaHRzLnB1c2goYmxvY2tzW2JdLmhlaWdodCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgbGV0IGFuYWx5dGljcyA9IEFuYWx5dGljcy5maW5kKHtoZWlnaHQ6IHskaW46YmxvY2tIZWlnaHRzfX0sIHtmaWVsZHM6e2hlaWdodDoxLHRpbWVEaWZmOjF9fSkuZmV0Y2goKTtcblxuXG4gICAgICAgICAgICAgICAgZm9yIChhIGluIGFuYWx5dGljcyl7XG4gICAgICAgICAgICAgICAgICAgIGF2ZXJhZ2VCbG9ja1RpbWUgKz0gYW5hbHl0aWNzW2FdLnRpbWVEaWZmO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGF2ZXJhZ2VCbG9ja1RpbWUgPSBhdmVyYWdlQmxvY2tUaW1lIC8gYW5hbHl0aWNzLmxlbmd0aDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgQXZlcmFnZVZhbGlkYXRvckRhdGEuaW5zZXJ0KHtcbiAgICAgICAgICAgICAgICBwcm9wb3NlckFkZHJlc3M6IHZhbGlkYXRvcnNbaV0uYWRkcmVzcyxcbiAgICAgICAgICAgICAgICBhdmVyYWdlQmxvY2tUaW1lOiBhdmVyYWdlQmxvY2tUaW1lLFxuICAgICAgICAgICAgICAgIHR5cGU6ICdWYWxpZGF0b3JEYWlseUF2ZXJhZ2VCbG9ja1RpbWUnLFxuICAgICAgICAgICAgICAgIGNyZWF0ZWRBdDogbm93XG4gICAgICAgICAgICB9KVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxufSlcbiIsImltcG9ydCB7IE1ldGVvciB9IGZyb20gJ21ldGVvci9tZXRlb3InO1xuaW1wb3J0IHsgVmFsaWRhdG9yUmVjb3JkcywgQW5hbHl0aWNzLCBNaXNzZWRCbG9ja3MsIE1pc3NlZEJsb2Nrc1N0YXRzLCBWUERpc3RyaWJ1dGlvbnMgfSBmcm9tICcuLi9yZWNvcmRzLmpzJztcbmltcG9ydCB7IFZhbGlkYXRvcnMgfSBmcm9tICcuLi8uLi92YWxpZGF0b3JzL3ZhbGlkYXRvcnMuanMnO1xuXG5NZXRlb3IucHVibGlzaCgndmFsaWRhdG9yX3JlY29yZHMuYWxsJywgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBWYWxpZGF0b3JSZWNvcmRzLmZpbmQoKTtcbn0pO1xuXG5NZXRlb3IucHVibGlzaCgndmFsaWRhdG9yX3JlY29yZHMudXB0aW1lJywgZnVuY3Rpb24oYWRkcmVzcywgbnVtKXtcbiAgICByZXR1cm4gVmFsaWRhdG9yUmVjb3Jkcy5maW5kKHthZGRyZXNzOmFkZHJlc3N9LHtsaW1pdDpudW0sIHNvcnQ6e2hlaWdodDotMX19KTtcbn0pO1xuXG5NZXRlb3IucHVibGlzaCgnYW5hbHl0aWNzLmhpc3RvcnknLCBmdW5jdGlvbigpe1xuICAgIHJldHVybiBBbmFseXRpY3MuZmluZCh7fSx7c29ydDp7aGVpZ2h0Oi0xfSxsaW1pdDo1MH0pO1xufSk7XG5cbk1ldGVvci5wdWJsaXNoKCd2cERpc3RyaWJ1dGlvbi5sYXRlc3QnLCBmdW5jdGlvbigpe1xuICAgIHJldHVybiBWUERpc3RyaWJ1dGlvbnMuZmluZCh7fSx7c29ydDp7aGVpZ2h0Oi0xfSwgbGltaXQ6MX0pO1xufSk7XG5cbnB1Ymxpc2hDb21wb3NpdGUoJ21pc3NlZGJsb2Nrcy52YWxpZGF0b3InLCBmdW5jdGlvbihhZGRyZXNzLCB0eXBlKXtcbiAgICBsZXQgY29uZGl0aW9ucyA9IHt9O1xuICAgIGlmICh0eXBlID09ICd2b3Rlcicpe1xuICAgICAgICBjb25kaXRpb25zID0ge1xuICAgICAgICAgICAgdm90ZXI6IGFkZHJlc3NcbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNle1xuICAgICAgICBjb25kaXRpb25zID0ge1xuICAgICAgICAgICAgcHJvcG9zZXI6IGFkZHJlc3NcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgICBmaW5kKCl7XG4gICAgICAgICAgICByZXR1cm4gTWlzc2VkQmxvY2tzU3RhdHMuZmluZChjb25kaXRpb25zKVxuICAgICAgICB9LFxuICAgICAgICBjaGlsZHJlbjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGZpbmQoc3RhdHMpe1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gVmFsaWRhdG9ycy5maW5kKFxuICAgICAgICAgICAgICAgICAgICAgICAge30sXG4gICAgICAgICAgICAgICAgICAgICAgICB7ZmllbGRzOnthZGRyZXNzOjEsIGRlc2NyaXB0aW9uOjEsIHByb2ZpbGVfdXJsOjF9fVxuICAgICAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICBdXG4gICAgfVxufSk7XG5cbnB1Ymxpc2hDb21wb3NpdGUoJ21pc3NlZHJlY29yZHMudmFsaWRhdG9yJywgZnVuY3Rpb24oYWRkcmVzcywgdHlwZSl7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgZmluZCgpe1xuICAgICAgICAgICAgcmV0dXJuIE1pc3NlZEJsb2Nrcy5maW5kKFxuICAgICAgICAgICAgICAgIHtbdHlwZV06IGFkZHJlc3N9LFxuICAgICAgICAgICAgICAgIHtzb3J0OiB7dXBkYXRlZEF0OiAtMX19XG4gICAgICAgICAgICApXG4gICAgICAgIH0sXG4gICAgICAgIGNoaWxkcmVuOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgZmluZCgpe1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gVmFsaWRhdG9ycy5maW5kKFxuICAgICAgICAgICAgICAgICAgICAgICAge30sXG4gICAgICAgICAgICAgICAgICAgICAgICB7ZmllbGRzOnthZGRyZXNzOjEsIGRlc2NyaXB0aW9uOjEsIG9wZXJhdG9yQWRkcmVzczoxfX1cbiAgICAgICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgIH1cbn0pO1xuIiwiaW1wb3J0IHsgTW9uZ28gfSBmcm9tICdtZXRlb3IvbW9uZ28nO1xuaW1wb3J0IHsgVmFsaWRhdG9ycyB9IGZyb20gJy4uL3ZhbGlkYXRvcnMvdmFsaWRhdG9ycyc7XG5cbmV4cG9ydCBjb25zdCBWYWxpZGF0b3JSZWNvcmRzID0gbmV3IE1vbmdvLkNvbGxlY3Rpb24oJ3ZhbGlkYXRvcl9yZWNvcmRzJyk7XG5leHBvcnQgY29uc3QgQW5hbHl0aWNzID0gbmV3IE1vbmdvLkNvbGxlY3Rpb24oJ2FuYWx5dGljcycpO1xuZXhwb3J0IGNvbnN0IE1pc3NlZEJsb2Nrc1N0YXRzID0gbmV3IE1vbmdvLkNvbGxlY3Rpb24oJ21pc3NlZF9ibG9ja3Nfc3RhdHMnKTtcbmV4cG9ydCBjb25zdCBNaXNzZWRCbG9ja3MgPSBuZXcgIE1vbmdvLkNvbGxlY3Rpb24oJ21pc3NlZF9ibG9ja3MnKTtcbmV4cG9ydCBjb25zdCBWUERpc3RyaWJ1dGlvbnMgPSBuZXcgTW9uZ28uQ29sbGVjdGlvbigndm90aW5nX3Bvd2VyX2Rpc3RyaWJ1dGlvbnMnKTtcbmV4cG9ydCBjb25zdCBBdmVyYWdlRGF0YSA9IG5ldyBNb25nby5Db2xsZWN0aW9uKCdhdmVyYWdlX2RhdGEnKTtcbmV4cG9ydCBjb25zdCBBdmVyYWdlVmFsaWRhdG9yRGF0YSA9IG5ldyBNb25nby5Db2xsZWN0aW9uKCdhdmVyYWdlX3ZhbGlkYXRvcl9kYXRhJyk7XG5cbk1pc3NlZEJsb2Nrc1N0YXRzLmhlbHBlcnMoe1xuICAgIHByb3Bvc2VyTW9uaWtlcigpe1xuICAgICAgICBsZXQgdmFsaWRhdG9yID0gVmFsaWRhdG9ycy5maW5kT25lKHthZGRyZXNzOnRoaXMucHJvcG9zZXJ9KTtcbiAgICAgICAgcmV0dXJuICh2YWxpZGF0b3IuZGVzY3JpcHRpb24pP3ZhbGlkYXRvci5kZXNjcmlwdGlvbi5tb25pa2VyOnRoaXMucHJvcG9zZXI7XG4gICAgfSxcbiAgICB2b3Rlck1vbmlrZXIoKXtcbiAgICAgICAgbGV0IHZhbGlkYXRvciA9IFZhbGlkYXRvcnMuZmluZE9uZSh7YWRkcmVzczp0aGlzLnZvdGVyfSk7XG4gICAgICAgIHJldHVybiAodmFsaWRhdG9yLmRlc2NyaXB0aW9uKT92YWxpZGF0b3IuZGVzY3JpcHRpb24ubW9uaWtlcjp0aGlzLnZvdGVyO1xuICAgIH1cbn0pXG4iLCJpbXBvcnQgeyBNZXRlb3IgfSBmcm9tICdtZXRlb3IvbWV0ZW9yJztcbmltcG9ydCB7IFN0YXR1cyB9IGZyb20gJy4uL3N0YXR1cy5qcyc7XG5pbXBvcnQgeyBjaGVjayB9IGZyb20gJ21ldGVvci9jaGVjaydcblxuTWV0ZW9yLnB1Ymxpc2goJ3N0YXR1cy5zdGF0dXMnLCBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFN0YXR1cy5maW5kKHtjaGFpbklkOk1ldGVvci5zZXR0aW5ncy5wdWJsaWMuY2hhaW5JZH0pO1xufSk7XG5cbiIsImltcG9ydCB7IE1vbmdvIH0gZnJvbSAnbWV0ZW9yL21vbmdvJztcblxuZXhwb3J0IGNvbnN0IFN0YXR1cyA9IG5ldyBNb25nby5Db2xsZWN0aW9uKCdzdGF0dXMnKTsiLCJpbXBvcnQgeyBNZXRlb3IgfSBmcm9tICdtZXRlb3IvbWV0ZW9yJztcbmltcG9ydCB7IEhUVFAgfSBmcm9tICdtZXRlb3IvaHR0cCc7XG5pbXBvcnQgeyBUcmFuc2FjdGlvbnMgfSBmcm9tICcuLi8uLi90cmFuc2FjdGlvbnMvdHJhbnNhY3Rpb25zLmpzJztcbmltcG9ydCB7IFZhbGlkYXRvcnMgfSBmcm9tICcuLi8uLi92YWxpZGF0b3JzL3ZhbGlkYXRvcnMuanMnO1xuXG5jb25zdCBBZGRyZXNzTGVuZ3RoID0gNDA7XG5cbk1ldGVvci5tZXRob2RzKHtcbiAgICAnVHJhbnNhY3Rpb25zLnVwZGF0ZVRyYW5zYWN0aW9ucyc6IGFzeW5jIGZ1bmN0aW9uKCl7XG4gICAgICAgIHRoaXMudW5ibG9jaygpO1xuICAgICAgICBpZiAoVFhTWU5DSU5HKVxuICAgICAgICAgICAgcmV0dXJuIFwiU3luY2luZyB0cmFuc2FjdGlvbnMuLi5cIjtcblxuICAgICAgICBjb25zdCB0cmFuc2FjdGlvbnMgPSBUcmFuc2FjdGlvbnMuZmluZCh7cHJvY2Vzc2VkOmZhbHNlfSx7bGltaXQ6IDUwMH0pLmZldGNoKCk7XG4gICAgICAgIHRyeXtcbiAgICAgICAgICAgIFRYU1lOQ0lORyA9IHRydWU7XG4gICAgICAgICAgICBjb25zdCBidWxrVHJhbnNhY3Rpb25zID0gVHJhbnNhY3Rpb25zLnJhd0NvbGxlY3Rpb24oKS5pbml0aWFsaXplVW5vcmRlcmVkQnVsa09wKCk7XG4gICAgICAgICAgICBmb3IgKGxldCBpIGluIHRyYW5zYWN0aW9ucyl7XG4gICAgICAgICAgICAgICAgbGV0IHVybCA9IFwiXCI7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgdXJsID0gQVBJKyAnL2Nvc21vcy90eC92MWJldGExL3R4cy8nK3RyYW5zYWN0aW9uc1tpXS50eGhhc2g7XG4gICAgICAgICAgICAgICAgICAgIGxldCByZXNwb25zZSA9IEhUVFAuZ2V0KHVybCk7XG4gICAgICAgICAgICAgICAgICAgIGxldCB0eCA9IEpTT04ucGFyc2UocmVzcG9uc2UuY29udGVudCk7XG5cbiAgICAgICAgICAgICAgICAgICAgdHguaGVpZ2h0ID0gcGFyc2VJbnQodHgudHhfcmVzcG9uc2UuaGVpZ2h0KTtcbiAgICAgICAgICAgICAgICAgICAgdHgucHJvY2Vzc2VkID0gdHJ1ZTtcblxuICAgICAgICAgICAgICAgICAgICBidWxrVHJhbnNhY3Rpb25zLmZpbmQoe3R4aGFzaDp0cmFuc2FjdGlvbnNbaV0udHhoYXNofSkudXBkYXRlT25lKHskc2V0OnR4fSk7XG5cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2F0Y2goZSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyh1cmwpO1xuICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcInR4IG5vdCBmb3VuZDogJW9cIilcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJHZXR0aW5nIHRyYW5zYWN0aW9uICVvOiAlb1wiLCB0cmFuc2FjdGlvbnNbaV0udHhoYXNoLCBlKTtcbiAgICAgICAgICAgICAgICAgICAgYnVsa1RyYW5zYWN0aW9ucy5maW5kKHt0eGhhc2g6dHJhbnNhY3Rpb25zW2ldLnR4aGFzaH0pLnVwZGF0ZU9uZSh7JHNldDp7cHJvY2Vzc2VkOnRydWUsIG1pc3Npbmc6dHJ1ZX19KTsgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChidWxrVHJhbnNhY3Rpb25zLmxlbmd0aCA+IDApe1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiYWFhOiAlb1wiLGJ1bGtUcmFuc2FjdGlvbnMubGVuZ3RoKVxuICAgICAgICAgICAgICAgIGJ1bGtUcmFuc2FjdGlvbnMuZXhlY3V0ZSgoZXJyLCByZXN1bHQpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVycil7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHQpe1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2cocmVzdWx0KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlKSB7XG4gICAgICAgICAgICBUWFNZTkNJTkcgPSBmYWxzZTtcbiAgICAgICAgICAgIHJldHVybiBlXG4gICAgICAgIH1cbiAgICAgICAgVFhTWU5DSU5HID0gZmFsc2U7XG4gICAgICAgIHJldHVybiB0cmFuc2FjdGlvbnMubGVuZ3RoXG4gICAgfSxcbiAgICAnVHJhbnNhY3Rpb25zLmZpbmREZWxlZ2F0aW9uJzogZnVuY3Rpb24oYWRkcmVzcywgaGVpZ2h0KXtcbiAgICAgICAgdGhpcy51bmJsb2NrKCk7XG4gICAgICAgIC8vIGZvbGxvd2luZyBjb3Ntb3Mtc2RrL3gvc2xhc2hpbmcvc3BlYy8wNl9ldmVudHMubWQgYW5kIGNvc21vcy1zZGsveC9zdGFraW5nL3NwZWMvMDZfZXZlbnRzLm1kXG4gICAgICAgIHJldHVybiBUcmFuc2FjdGlvbnMuZmluZCh7XG4gICAgICAgICAgICAkb3I6IFt7JGFuZDogW1xuICAgICAgICAgICAgICAgIHtcInR4X3Jlc3BvbnNlLmxvZ3MuZXZlbnRzLnR5cGVcIjogXCJkZWxlZ2F0ZVwifSxcbiAgICAgICAgICAgICAgICB7XCJ0eF9yZXNwb25zZS5sb2dzLmV2ZW50cy5hdHRyaWJ1dGVzLmtleVwiOiBcInZhbGlkYXRvclwifSxcbiAgICAgICAgICAgICAgICB7XCJ0eF9yZXNwb25zZS5sb2dzLmV2ZW50cy5hdHRyaWJ1dGVzLnZhbHVlXCI6IGFkZHJlc3N9XG4gICAgICAgICAgICBdfSwgeyRhbmQ6W1xuICAgICAgICAgICAgICAgIHtcInR4X3Jlc3BvbnNlLmxvZ3MuZXZlbnRzLmF0dHJpYnV0ZXMua2V5XCI6IFwiYWN0aW9uXCJ9LFxuICAgICAgICAgICAgICAgIHtcInR4X3Jlc3BvbnNlLmxvZ3MuZXZlbnRzLmF0dHJpYnV0ZXMudmFsdWVcIjogXCJ1bmphaWxcIn0sXG4gICAgICAgICAgICAgICAge1widHhfcmVzcG9uc2UubG9ncy5ldmVudHMuYXR0cmlidXRlcy5rZXlcIjogXCJzZW5kZXJcIn0sXG4gICAgICAgICAgICAgICAge1widHhfcmVzcG9uc2UubG9ncy5ldmVudHMuYXR0cmlidXRlcy52YWx1ZVwiOiBhZGRyZXNzfVxuICAgICAgICAgICAgXX0sIHskYW5kOltcbiAgICAgICAgICAgICAgICB7XCJ0eF9yZXNwb25zZS5sb2dzLmV2ZW50cy50eXBlXCI6IFwiY3JlYXRlX3ZhbGlkYXRvclwifSxcbiAgICAgICAgICAgICAgICB7XCJ0eF9yZXNwb25zZS5sb2dzLmV2ZW50cy5hdHRyaWJ1dGVzLmtleVwiOiBcInZhbGlkYXRvclwifSxcbiAgICAgICAgICAgICAgICB7XCJ0eF9yZXNwb25zZS5sb2dzLmV2ZW50cy5hdHRyaWJ1dGVzLnZhbHVlXCI6IGFkZHJlc3N9XG4gICAgICAgICAgICBdfSwgeyRhbmQ6W1xuICAgICAgICAgICAgICAgIHtcInR4X3Jlc3BvbnNlLmxvZ3MuZXZlbnRzLnR5cGVcIjogXCJ1bmJvbmRcIn0sXG4gICAgICAgICAgICAgICAge1widHhfcmVzcG9uc2UubG9ncy5ldmVudHMuYXR0cmlidXRlcy5rZXlcIjogXCJ2YWxpZGF0b3JcIn0sXG4gICAgICAgICAgICAgICAge1widHhfcmVzcG9uc2UubG9ncy5ldmVudHMuYXR0cmlidXRlcy52YWx1ZVwiOiBhZGRyZXNzfVxuICAgICAgICAgICAgXX0sIHskYW5kOltcbiAgICAgICAgICAgICAgICB7XCJ0eF9yZXNwb25zZS5sb2dzLmV2ZW50cy50eXBlXCI6IFwicmVkZWxlZ2F0ZVwifSxcbiAgICAgICAgICAgICAgICB7XCJ0eF9yZXNwb25zZS5sb2dzLmV2ZW50cy5hdHRyaWJ1dGVzLmtleVwiOiBcImRlc3RpbmF0aW9uX3ZhbGlkYXRvclwifSxcbiAgICAgICAgICAgICAgICB7XCJ0eF9yZXNwb25zZS5sb2dzLmV2ZW50cy5hdHRyaWJ1dGVzLnZhbHVlXCI6IGFkZHJlc3N9XG4gICAgICAgICAgICBdfV0sXG4gICAgICAgICAgICBcInR4X3Jlc3BvbnNlLmNvZGVcIjogMCxcbiAgICAgICAgICAgIGhlaWdodDp7JGx0OmhlaWdodH19LFxuICAgICAgICB7c29ydDp7aGVpZ2h0Oi0xfSxcbiAgICAgICAgICAgIGxpbWl0OiAxfVxuICAgICAgICApLmZldGNoKCk7XG4gICAgfSxcbiAgICAnVHJhbnNhY3Rpb25zLmZpbmRVc2VyJzogZnVuY3Rpb24oYWRkcmVzcywgZmllbGRzPW51bGwpe1xuICAgICAgICB0aGlzLnVuYmxvY2soKTtcbiAgICAgICAgLy8gYWRkcmVzcyBpcyBlaXRoZXIgZGVsZWdhdG9yIGFkZHJlc3Mgb3IgdmFsaWRhdG9yIG9wZXJhdG9yIGFkZHJlc3NcbiAgICAgICAgbGV0IHZhbGlkYXRvcjtcbiAgICAgICAgaWYgKCFmaWVsZHMpXG4gICAgICAgICAgICBmaWVsZHMgPSB7YWRkcmVzczoxLCBkZXNjcmlwdGlvbjoxLCBvcGVyYXRvcl9hZGRyZXNzOjEsIGRlbGVnYXRvcl9hZGRyZXNzOjF9O1xuICAgICAgICBpZiAoYWRkcmVzcy5pbmNsdWRlcyhNZXRlb3Iuc2V0dGluZ3MucHVibGljLmJlY2gzMlByZWZpeFZhbEFkZHIpKXtcbiAgICAgICAgICAgIC8vIHZhbGlkYXRvciBvcGVyYXRvciBhZGRyZXNzXG4gICAgICAgICAgICB2YWxpZGF0b3IgPSBWYWxpZGF0b3JzLmZpbmRPbmUoe29wZXJhdG9yX2FkZHJlc3M6YWRkcmVzc30sIHtmaWVsZHN9KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChhZGRyZXNzLmluY2x1ZGVzKE1ldGVvci5zZXR0aW5ncy5wdWJsaWMuYmVjaDMyUHJlZml4QWNjQWRkcikpe1xuICAgICAgICAgICAgLy8gZGVsZWdhdG9yIGFkZHJlc3NcbiAgICAgICAgICAgIHZhbGlkYXRvciA9IFZhbGlkYXRvcnMuZmluZE9uZSh7ZGVsZWdhdG9yX2FkZHJlc3M6YWRkcmVzc30sIHtmaWVsZHN9KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChhZGRyZXNzLmxlbmd0aCA9PT0gQWRkcmVzc0xlbmd0aCkge1xuICAgICAgICAgICAgdmFsaWRhdG9yID0gVmFsaWRhdG9ycy5maW5kT25lKHthZGRyZXNzOmFkZHJlc3N9LCB7ZmllbGRzfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHZhbGlkYXRvcil7XG4gICAgICAgICAgICByZXR1cm4gdmFsaWRhdG9yO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcblxuICAgIH1cbn0pO1xuIiwiaW1wb3J0IHsgTWV0ZW9yIH0gZnJvbSAnbWV0ZW9yL21ldGVvcic7XG5pbXBvcnQgeyBUcmFuc2FjdGlvbnMgfSBmcm9tICcuLi90cmFuc2FjdGlvbnMuanMnO1xuaW1wb3J0IHsgQmxvY2tzY29uIH0gZnJvbSAnLi4vLi4vYmxvY2tzL2Jsb2Nrcy5qcyc7XG5cblxucHVibGlzaENvbXBvc2l0ZSgndHJhbnNhY3Rpb25zLmxpc3QnLCBmdW5jdGlvbihsaW1pdCA9IDMwKXtcbiAgICByZXR1cm4ge1xuICAgICAgICBmaW5kKCl7XG4gICAgICAgICAgICByZXR1cm4gVHJhbnNhY3Rpb25zLmZpbmQoe2hlaWdodDogeyAkZXhpc3RzOiB0cnVlfSwgcHJvY2Vzc2VkOiB7JG5lOiBmYWxzZX19LHtzb3J0OntoZWlnaHQ6LTF9LCBsaW1pdDpsaW1pdH0pXG4gICAgICAgIH0sXG4gICAgICAgIGNoaWxkcmVuOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgZmluZCh0eCl7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eC5oZWlnaHQpXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gQmxvY2tzY29uLmZpbmQoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAge2hlaWdodDp0eC5oZWlnaHR9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtmaWVsZHM6e3RpbWU6MSwgaGVpZ2h0OjF9fVxuICAgICAgICAgICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgIH1cbn0pO1xuXG5wdWJsaXNoQ29tcG9zaXRlKCd0cmFuc2FjdGlvbnMudmFsaWRhdG9yJywgZnVuY3Rpb24odmFsaWRhdG9yQWRkcmVzcywgZGVsZWdhdG9yQWRkcmVzcywgbGltaXQ9MTAwKXtcbiAgICBsZXQgcXVlcnkgPSB7fTtcbiAgICBpZiAodmFsaWRhdG9yQWRkcmVzcyAmJiBkZWxlZ2F0b3JBZGRyZXNzKXtcbiAgICAgICAgcXVlcnkgPSB7JG9yOlt7XCJ0eF9yZXNwb25zZS5sb2dzLmV2ZW50cy5hdHRyaWJ1dGVzLnZhbHVlXCI6dmFsaWRhdG9yQWRkcmVzc30sIHtcInR4X3Jlc3BvbnNlLmxvZ3MuZXZlbnRzLmF0dHJpYnV0ZXMudmFsdWVcIjpkZWxlZ2F0b3JBZGRyZXNzfV19XG4gICAgfVxuXG4gICAgaWYgKCF2YWxpZGF0b3JBZGRyZXNzICYmIGRlbGVnYXRvckFkZHJlc3Mpe1xuICAgICAgICBxdWVyeSA9IHtcInR4X3Jlc3BvbnNlLmxvZ3MuZXZlbnRzLmF0dHJpYnV0ZXMudmFsdWVcIjpkZWxlZ2F0b3JBZGRyZXNzfVxuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICAgIGZpbmQoKXtcbiAgICAgICAgICAgIHJldHVybiBUcmFuc2FjdGlvbnMuZmluZChxdWVyeSwge3NvcnQ6e2hlaWdodDotMX0sIGxpbWl0OmxpbWl0fSlcbiAgICAgICAgfSxcbiAgICAgICAgY2hpbGRyZW46W1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGZpbmQodHgpe1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gQmxvY2tzY29uLmZpbmQoXG4gICAgICAgICAgICAgICAgICAgICAgICB7aGVpZ2h0OnR4LmhlaWdodH0sXG4gICAgICAgICAgICAgICAgICAgICAgICB7ZmllbGRzOnt0aW1lOjEsIGhlaWdodDoxfX1cbiAgICAgICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgIH1cbn0pXG5cbnB1Ymxpc2hDb21wb3NpdGUoJ3RyYW5zYWN0aW9ucy5maW5kT25lJywgZnVuY3Rpb24oaGFzaCl7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgZmluZCgpe1xuICAgICAgICAgICAgcmV0dXJuIFRyYW5zYWN0aW9ucy5maW5kKHt0eGhhc2g6aGFzaH0pXG4gICAgICAgIH0sXG4gICAgICAgIGNoaWxkcmVuOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgZmluZCh0eCl7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBCbG9ja3Njb24uZmluZChcbiAgICAgICAgICAgICAgICAgICAgICAgIHtoZWlnaHQ6dHguaGVpZ2h0fSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHtmaWVsZHM6e3RpbWU6MSwgaGVpZ2h0OjF9fVxuICAgICAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICBdXG4gICAgfVxufSlcblxucHVibGlzaENvbXBvc2l0ZSgndHJhbnNhY3Rpb25zLmhlaWdodCcsIGZ1bmN0aW9uKGhlaWdodCl7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgZmluZCgpe1xuICAgICAgICAgICAgcmV0dXJuIFRyYW5zYWN0aW9ucy5maW5kKHtoZWlnaHQ6aGVpZ2h0fSlcbiAgICAgICAgfSxcbiAgICAgICAgY2hpbGRyZW46IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBmaW5kKHR4KXtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIEJsb2Nrc2Nvbi5maW5kKFxuICAgICAgICAgICAgICAgICAgICAgICAge2hlaWdodDp0eC5oZWlnaHR9LFxuICAgICAgICAgICAgICAgICAgICAgICAge2ZpZWxkczp7dGltZToxLCBoZWlnaHQ6MX19XG4gICAgICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIF1cbiAgICB9XG59KSIsImltcG9ydCB7IE1vbmdvIH0gZnJvbSAnbWV0ZW9yL21vbmdvJztcbmltcG9ydCB7IEJsb2Nrc2NvbiB9IGZyb20gJy4uL2Jsb2Nrcy9ibG9ja3MuanMnO1xuaW1wb3J0IHsgVHhJY29uIH0gZnJvbSAnLi4vLi4vdWkvY29tcG9uZW50cy9JY29ucy5qc3gnO1xuXG5leHBvcnQgY29uc3QgVHJhbnNhY3Rpb25zID0gbmV3IE1vbmdvLkNvbGxlY3Rpb24oJ3RyYW5zYWN0aW9ucycpO1xuXG5UcmFuc2FjdGlvbnMuaGVscGVycyh7XG4gICAgYmxvY2soKXtcbiAgICAgICAgcmV0dXJuIEJsb2Nrc2Nvbi5maW5kT25lKHtoZWlnaHQ6dGhpcy5oZWlnaHR9KTtcbiAgICB9XG59KSIsIi8qIGVzbGludC1kaXNhYmxlIGNhbWVsY2FzZSAqL1xuXG5pbXBvcnQgeyBNZXRlb3IgfSBmcm9tICdtZXRlb3IvbWV0ZW9yJztcbmltcG9ydCB7IFRyYW5zYWN0aW9ucyB9IGZyb20gJy4uLy4uL3RyYW5zYWN0aW9ucy90cmFuc2FjdGlvbnMuanMnO1xuaW1wb3J0IHsgQmxvY2tzY29uIH0gZnJvbSAnLi4vLi4vYmxvY2tzL2Jsb2Nrcy5qcyc7XG5pbXBvcnQgeyBWYWxpZGF0b3JzIH0gZnJvbSAnLi4vLi4vdmFsaWRhdG9ycy92YWxpZGF0b3JzLmpzJztcbmltcG9ydCB7IENoYWluIH0gZnJvbSAnLi4vLi4vY2hhaW4vY2hhaW4uanMnO1xuaW1wb3J0IHsgZ2V0VmFsaWRhdG9yUHJvZmlsZVVybCB9IGZyb20gJy4uLy4uL2Jsb2Nrcy9zZXJ2ZXIvbWV0aG9kcy5qcyc7XG5cblxuTWV0ZW9yLm1ldGhvZHMoe1xuICAgICdWYWxpZGF0b3JzLmZpbmRDcmVhdGVWYWxpZGF0b3JUaW1lJzogZnVuY3Rpb24oYWRkcmVzcyl7XG4gICAgICAgIHRoaXMudW5ibG9jaygpO1xuICAgICAgICAvLyBsb29rIHVwIHRoZSBjcmVhdGUgdmFsaWRhdG9yIHRpbWUgdG8gY29uc2lkZXIgaWYgdGhlIHZhbGlkYXRvciBoYXMgbmV2ZXIgdXBkYXRlZCB0aGUgY29tbWlzc2lvblxuICAgICAgICBsZXQgdHggPSBUcmFuc2FjdGlvbnMuZmluZE9uZSh7JGFuZDpbXG4gICAgICAgICAgICB7XCJ0eC5ib2R5Lm1lc3NhZ2VzLmRlbGVnYXRvcl9hZGRyZXNzXCI6YWRkcmVzc30sXG4gICAgICAgICAgICB7XCJ0eC5ib2R5Lm1lc3NhZ2VzLkB0eXBlXCI6XCIvY29zbW9zLnN0YWtpbmcudjFiZXRhMS5Nc2dDcmVhdGVWYWxpZGF0b3JcIn0sXG4gICAgICAgICAgICB7XCJ0eF9yZXNwb25zZS5jb2RlXCI6MH1cbiAgICAgICAgXX0pO1xuXG4gICAgICAgIGlmICh0eCl7XG4gICAgICAgICAgICBsZXQgYmxvY2sgPSBCbG9ja3Njb24uZmluZE9uZSh7aGVpZ2h0OnR4LmhlaWdodH0pO1xuICAgICAgICAgICAgaWYgKGJsb2NrKXtcbiAgICAgICAgICAgICAgICByZXR1cm4gYmxvY2sudGltZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNle1xuICAgICAgICAgICAgLy8gbm8gc3VjaCBjcmVhdGUgdmFsaWRhdG9yIHR4XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9LFxuICAgICdWYWxpZGF0b3JzLmdldEFsbERlbGVnYXRpb25zJyhhZGRyZXNzKXtcbiAgICAgICAgdGhpcy51bmJsb2NrKCk7XG4gICAgICAgIGxldCB1cmwgPSBgJHtBUEl9L2Nvc21vcy9zdGFraW5nL3YxYmV0YTEvdmFsaWRhdG9ycy8ke2FkZHJlc3N9L2RlbGVnYXRpb25zP3BhZ2luYXRpb24ubGltaXQ9MTAmcGFnaW5hdGlvbi5jb3VudF90b3RhbD10cnVlYDtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgbGV0IGRlbGVnYXRpb25zID0gSFRUUC5nZXQodXJsKTtcbiAgICAgICAgICAgIGlmIChkZWxlZ2F0aW9ucy5zdGF0dXNDb2RlID09IDIwMCkge1xuICAgICAgICAgICAgICAgIGxldCBkZWxlZ2F0aW9uc0NvdW50ID0gSlNPTi5wYXJzZShkZWxlZ2F0aW9ucy5jb250ZW50KT8ucGFnaW5hdGlvbj8udG90YWw7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRlbGVnYXRpb25zQ291bnQ7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyh1cmwpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJHZXR0aW5nIGVycm9yOiAlbyB3aGVuIGdldHRpbmcgZGVsZWdhdGlvbnMgY291bnQgZnJvbSAlb1wiLCBlLCB1cmwpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgICdWYWxpZGF0b3JzLmZldGNoS2V5YmFzZScoYWRkcmVzcykge1xuICAgICAgICB0aGlzLnVuYmxvY2soKTtcbiAgICAgICAgLy8gZmV0Y2hpbmcga2V5YmFzZSBldmVyeSBiYXNlIG9uIGtleWJhc2VGZXRjaGluZ0ludGVydmFsIHNldHRpbmdzXG4gICAgICAgIC8vIGRlZmF1bHQgdG8gZXZlcnkgNSBob3VycyBcbiAgICAgICAgXG4gICAgICAgIGxldCB1cmwgPSBSUEMgKyAnL3N0YXR1cyc7XG4gICAgICAgIGxldCBjaGFpbklkO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgbGV0IHJlc3BvbnNlID0gSFRUUC5nZXQodXJsKTtcbiAgICAgICAgICAgIGxldCBzdGF0dXMgPSBKU09OLnBhcnNlKHJlc3BvbnNlPy5jb250ZW50KTtcbiAgICAgICAgICAgIGNoYWluSWQgPSAoc3RhdHVzPy5yZXN1bHQ/Lm5vZGVfaW5mbz8ubmV0d29yayk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiRXJyb3IgZ2V0dGluZyBjaGFpbklkIGZvciBrZXliYXNlIGZldGNoaW5nXCIpICAgICAgICBcbiAgICAgICAgfVxuICAgICAgICBsZXQgY2hhaW5TdGF0dXMgPSBDaGFpbi5maW5kT25lKHsgY2hhaW5JZH0pO1xuICAgICAgICBjb25zdCBidWxrVmFsaWRhdG9ycyA9IFZhbGlkYXRvcnMucmF3Q29sbGVjdGlvbigpLmluaXRpYWxpemVVbm9yZGVyZWRCdWxrT3AoKTtcblxuICAgICAgICBsZXQgbGFzdEtleWJhc2VGZXRjaFRpbWUgPSBEYXRlLnBhcnNlKGNoYWluU3RhdHVzPy5sYXN0S2V5YmFzZUZldGNoVGltZSkgPz8gMFxuICAgICAgICBjb25zb2xlLmxvZyhcIkxhc3QgZmV0Y2ggdGltZTogJW9cIiwgbGFzdEtleWJhc2VGZXRjaFRpbWUpXG5cbiAgICAgICAgY29uc29sZS5sb2coJ0ZldGNoaW5nIGtleWJhc2UuLi4nKVxuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tbG9vcC1mdW5jXG4gICAgICAgIFZhbGlkYXRvcnMuZmluZCh7fSkuZm9yRWFjaChhc3luYyAodmFsaWRhdG9yKSA9PiB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGlmICh2YWxpZGF0b3I/LmRlc2NyaXB0aW9uICYmIHZhbGlkYXRvcj8uZGVzY3JpcHRpb24/LmlkZW50aXR5KSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBwcm9maWxlVXJsID0gZ2V0VmFsaWRhdG9yUHJvZmlsZVVybCh2YWxpZGF0b3I/LmRlc2NyaXB0aW9uPy5pZGVudGl0eSlcbiAgICAgICAgICAgICAgICAgICAgaWYgKHByb2ZpbGVVcmwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJ1bGtWYWxpZGF0b3JzLmZpbmQoeyBhZGRyZXNzOiB2YWxpZGF0b3I/LmFkZHJlc3MgfSkudXBzZXJ0KCkudXBkYXRlT25lKHsgJHNldDogeyAncHJvZmlsZV91cmwnOiBwcm9maWxlVXJsIH0gfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYnVsa1ZhbGlkYXRvcnMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ1bGtWYWxpZGF0b3JzLmV4ZWN1dGUoKGVyciwgcmVzdWx0KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBFcnJvciB3aGVuIHVwZGF0aW5nIHZhbGlkYXRvciBwcm9maWxlX3VybCAke2Vycn1gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnVmFsaWRhdG9yIHByb2ZpbGVfdXJsIGhhcyBiZWVuIHVwZGF0ZWQhJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkVycm9yIGZldGNoaW5nIEtleWJhc2UgZm9yICVvOiAlb1wiLCB2YWxpZGF0b3I/LmFkZHJlc3MsIGUpXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICAgIHRyeXtcbiAgICAgICAgICAgIENoYWluLnVwZGF0ZSh7IGNoYWluSWQgfSwgeyAkc2V0OiB7IGxhc3RLZXliYXNlRmV0Y2hUaW1lOiBuZXcgRGF0ZSgpLnRvVVRDU3RyaW5nKCkgfSB9KTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaChlKXtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiRXJyb3Igd2hlbiB1cGRhdGluZyBsYXN0S2V5YmFzZUZldGNoVGltZVwiKVxuICAgICAgICB9XG5cbiAgICB9ICAgIFxuXG59KTsiLCJpbXBvcnQgeyBNZXRlb3IgfSBmcm9tICdtZXRlb3IvbWV0ZW9yJztcbmltcG9ydCB7IFZhbGlkYXRvcnMgfSBmcm9tICcuLi92YWxpZGF0b3JzLmpzJztcbmltcG9ydCB7IFZhbGlkYXRvclJlY29yZHMgfSBmcm9tICcuLi8uLi9yZWNvcmRzL3JlY29yZHMuanMnO1xuaW1wb3J0IHsgVm90aW5nUG93ZXJIaXN0b3J5IH0gZnJvbSAnLi4vLi4vdm90aW5nLXBvd2VyL2hpc3RvcnkuanMnO1xuXG5NZXRlb3IucHVibGlzaCgndmFsaWRhdG9ycy5hbGwnLCBmdW5jdGlvbiAoc29ydCA9IFwiZGVzY3JpcHRpb24ubW9uaWtlclwiLCBkaXJlY3Rpb24gPSAtMSwgZmllbGRzPXt9KSB7XG4gICAgcmV0dXJuIFZhbGlkYXRvcnMuZmluZCh7fSwge3NvcnQ6IHtbc29ydF06IGRpcmVjdGlvbn0sIGZpZWxkczogZmllbGRzfSk7XG59KTtcblxucHVibGlzaENvbXBvc2l0ZSgndmFsaWRhdG9ycy5maXJzdFNlZW4nLHtcbiAgICBmaW5kKCkge1xuICAgICAgICByZXR1cm4gVmFsaWRhdG9ycy5maW5kKHt9KTtcbiAgICB9LFxuICAgIGNoaWxkcmVuOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAgIGZpbmQodmFsKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFZhbGlkYXRvclJlY29yZHMuZmluZChcbiAgICAgICAgICAgICAgICAgICAgeyBhZGRyZXNzOiB2YWwuYWRkcmVzcyB9LFxuICAgICAgICAgICAgICAgICAgICB7IHNvcnQ6IHtoZWlnaHQ6IDF9LCBsaW1pdDogMX1cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgXVxufSk7XG5cbk1ldGVvci5wdWJsaXNoKCd2YWxpZGF0b3JzLnZvdGluZ19wb3dlcicsIGZ1bmN0aW9uKCl7XG4gICAgcmV0dXJuIFZhbGlkYXRvcnMuZmluZCh7XG4gICAgICAgIHN0YXR1czogJ0JPTkRfU1RBVFVTX0JPTkRFRCcsXG4gICAgICAgIGphaWxlZDpmYWxzZVxuICAgIH0se1xuICAgICAgICBzb3J0OntcbiAgICAgICAgICAgIHZvdGluZ19wb3dlcjotMVxuICAgICAgICB9LFxuICAgICAgICBmaWVsZHM6e1xuICAgICAgICAgICAgYWRkcmVzczogMSxcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOjEsXG4gICAgICAgICAgICB2b3RpbmdfcG93ZXI6MSxcbiAgICAgICAgICAgIHByb2ZpbGVfdXJsOjFcbiAgICAgICAgfVxuICAgIH1cbiAgICApO1xufSk7XG5cbnB1Ymxpc2hDb21wb3NpdGUoJ3ZhbGlkYXRvci5kZXRhaWxzJywgZnVuY3Rpb24oYWRkcmVzcyl7XG4gICAgbGV0IG9wdGlvbnMgPSB7YWRkcmVzczphZGRyZXNzfTtcbiAgICBpZiAoYWRkcmVzcy5pbmRleE9mKE1ldGVvci5zZXR0aW5ncy5wdWJsaWMuYmVjaDMyUHJlZml4VmFsQWRkcikgIT0gLTEpe1xuICAgICAgICBvcHRpb25zID0ge29wZXJhdG9yX2FkZHJlc3M6YWRkcmVzc31cbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgICAgZmluZCgpe1xuICAgICAgICAgICAgcmV0dXJuIFZhbGlkYXRvcnMuZmluZChvcHRpb25zKVxuICAgICAgICB9LFxuICAgICAgICBjaGlsZHJlbjogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGZpbmQodmFsKXtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFZvdGluZ1Bvd2VySGlzdG9yeS5maW5kKFxuICAgICAgICAgICAgICAgICAgICAgICAge2FkZHJlc3M6dmFsLmFkZHJlc3N9LFxuICAgICAgICAgICAgICAgICAgICAgICAge3NvcnQ6e2hlaWdodDotMX0sIGxpbWl0OjUwfVxuICAgICAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBmaW5kKHZhbCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gVmFsaWRhdG9yUmVjb3Jkcy5maW5kKFxuICAgICAgICAgICAgICAgICAgICAgICAgeyBhZGRyZXNzOiB2YWwuYWRkcmVzcyB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgeyBzb3J0OiB7aGVpZ2h0OiAtMX0sIGxpbWl0OiBNZXRlb3Iuc2V0dGluZ3MucHVibGljLnVwdGltZVdpbmRvd31cbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIF1cbiAgICB9XG59KTtcbiIsImltcG9ydCB7IE1vbmdvIH0gZnJvbSAnbWV0ZW9yL21vbmdvJztcbmltcG9ydCB7IFZhbGlkYXRvclJlY29yZHMgfSBmcm9tICcuLi9yZWNvcmRzL3JlY29yZHMuanMnO1xuaW1wb3J0IHsgVm90aW5nUG93ZXJIaXN0b3J5IH0gZnJvbSAnLi4vdm90aW5nLXBvd2VyL2hpc3RvcnkuanMnO1xuXG5leHBvcnQgY29uc3QgVmFsaWRhdG9ycyA9IG5ldyBNb25nby5Db2xsZWN0aW9uKCd2YWxpZGF0b3JzJyk7XG5cblZhbGlkYXRvcnMuaGVscGVycyh7XG4gICAgZmlyc3RTZWVuKCl7XG4gICAgICAgIHJldHVybiBWYWxpZGF0b3JSZWNvcmRzLmZpbmRPbmUoe2FkZHJlc3M6dGhpcy5hZGRyZXNzfSk7XG4gICAgfSxcbiAgICBoaXN0b3J5KCl7XG4gICAgICAgIHJldHVybiBWb3RpbmdQb3dlckhpc3RvcnkuZmluZCh7YWRkcmVzczp0aGlzLmFkZHJlc3N9LCB7c29ydDp7aGVpZ2h0Oi0xfSwgbGltaXQ6NTB9KS5mZXRjaCgpO1xuICAgIH1cbn0pXG4vLyBWYWxpZGF0b3JzLmhlbHBlcnMoe1xuLy8gICAgIHVwdGltZSgpe1xuLy8gICAgICAgICAvLyBjb25zb2xlLmxvZyh0aGlzLmFkZHJlc3MpO1xuLy8gICAgICAgICBsZXQgbGFzdEh1bmRyZWQgPSBWYWxpZGF0b3JSZWNvcmRzLmZpbmQoe2FkZHJlc3M6dGhpcy5hZGRyZXNzfSwge3NvcnQ6e2hlaWdodDotMX0sIGxpbWl0OjEwMH0pLmZldGNoKCk7XG4vLyAgICAgICAgIGNvbnNvbGUubG9nKGxhc3RIdW5kcmVkKTtcbi8vICAgICAgICAgbGV0IHVwdGltZSA9IDA7XG4vLyAgICAgICAgIGZvciAoaSBpbiBsYXN0SHVuZHJlZCl7XG4vLyAgICAgICAgICAgICBpZiAobGFzdEh1bmRyZWRbaV0uZXhpc3RzKXtcbi8vICAgICAgICAgICAgICAgICB1cHRpbWUrPTE7XG4vLyAgICAgICAgICAgICB9XG4vLyAgICAgICAgIH1cbi8vICAgICAgICAgcmV0dXJuIHVwdGltZTtcbi8vICAgICB9XG4vLyB9KSIsImltcG9ydCB7IE1vbmdvIH0gZnJvbSAnbWV0ZW9yL21vbmdvJztcblxuZXhwb3J0IGNvbnN0IFZvdGluZ1Bvd2VySGlzdG9yeSA9IG5ldyBNb25nby5Db2xsZWN0aW9uKCd2b3RpbmdfcG93ZXJfaGlzdG9yeScpO1xuIiwiaW1wb3J0IHsgTW9uZ28gfSBmcm9tICdtZXRlb3IvbW9uZ28nO1xuXG5leHBvcnQgY29uc3QgRXZpZGVuY2VzID0gbmV3IE1vbmdvLkNvbGxlY3Rpb24oJ2V2aWRlbmNlcycpO1xuIiwiaW1wb3J0IHsgTW9uZ28gfSBmcm9tICdtZXRlb3IvbW9uZ28nO1xuXG5leHBvcnQgY29uc3QgVmFsaWRhdG9yU2V0cyA9IG5ldyBNb25nby5Db2xsZWN0aW9uKCd2YWxpZGF0b3Jfc2V0cycpO1xuIiwiLy8gSW1wb3J0IG1vZHVsZXMgdXNlZCBieSBib3RoIGNsaWVudCBhbmQgc2VydmVyIHRocm91Z2ggYSBzaW5nbGUgaW5kZXggZW50cnkgcG9pbnRcbi8vIGUuZy4gdXNlcmFjY291bnRzIGNvbmZpZ3VyYXRpb24gZmlsZS5cbiIsImltcG9ydCB7IEJsb2Nrc2NvbiB9IGZyb20gJy4uLy4uL2FwaS9ibG9ja3MvYmxvY2tzLmpzJztcbmltcG9ydCB7IFByb3Bvc2FscyB9IGZyb20gJy4uLy4uL2FwaS9wcm9wb3NhbHMvcHJvcG9zYWxzLmpzJztcbmltcG9ydCB7IFZhbGlkYXRvclJlY29yZHMsIEFuYWx5dGljcywgTWlzc2VkQmxvY2tzU3RhdHMsIE1pc3NlZEJsb2NrcywgQXZlcmFnZURhdGEsIEF2ZXJhZ2VWYWxpZGF0b3JEYXRhIH0gZnJvbSAnLi4vLi4vYXBpL3JlY29yZHMvcmVjb3Jkcy5qcyc7XG4vLyBpbXBvcnQgeyBTdGF0dXMgfSBmcm9tICcuLi8uLi9hcGkvc3RhdHVzL3N0YXR1cy5qcyc7XG5pbXBvcnQgeyBUcmFuc2FjdGlvbnMgfSBmcm9tICcuLi8uLi9hcGkvdHJhbnNhY3Rpb25zL3RyYW5zYWN0aW9ucy5qcyc7XG5pbXBvcnQgeyBWYWxpZGF0b3JTZXRzIH0gZnJvbSAnLi4vLi4vYXBpL3ZhbGlkYXRvci1zZXRzL3ZhbGlkYXRvci1zZXRzLmpzJztcbmltcG9ydCB7IFZhbGlkYXRvcnMgfSBmcm9tICcuLi8uLi9hcGkvdmFsaWRhdG9ycy92YWxpZGF0b3JzLmpzJztcbmltcG9ydCB7IFZvdGluZ1Bvd2VySGlzdG9yeSB9IGZyb20gJy4uLy4uL2FwaS92b3RpbmctcG93ZXIvaGlzdG9yeS5qcyc7XG5pbXBvcnQgeyBFdmlkZW5jZXMgfSBmcm9tICcuLi8uLi9hcGkvZXZpZGVuY2VzL2V2aWRlbmNlcy5qcyc7XG5pbXBvcnQgeyBDb2luU3RhdHMgfSBmcm9tICcuLi8uLi9hcGkvY29pbi1zdGF0cy9jb2luLXN0YXRzLmpzJztcbmltcG9ydCB7IENoYWluU3RhdGVzIH0gZnJvbSAnLi4vLi4vYXBpL2NoYWluL2NoYWluLmpzJztcblxuQ2hhaW5TdGF0ZXMucmF3Q29sbGVjdGlvbigpLmNyZWF0ZUluZGV4KHtoZWlnaHQ6IC0xfSx7dW5pcXVlOnRydWV9KTtcblxuQmxvY2tzY29uLnJhd0NvbGxlY3Rpb24oKS5jcmVhdGVJbmRleCh7aGVpZ2h0OiAtMX0se3VuaXF1ZTp0cnVlfSk7XG5CbG9ja3Njb24ucmF3Q29sbGVjdGlvbigpLmNyZWF0ZUluZGV4KHtwcm9wb3NlckFkZHJlc3M6MX0pO1xuXG5FdmlkZW5jZXMucmF3Q29sbGVjdGlvbigpLmNyZWF0ZUluZGV4KHtoZWlnaHQ6IC0xfSk7XG5cblByb3Bvc2Fscy5yYXdDb2xsZWN0aW9uKCkuY3JlYXRlSW5kZXgoe3Byb3Bvc2FsSWQ6IDF9LCB7dW5pcXVlOnRydWV9KTtcblxuVmFsaWRhdG9yUmVjb3Jkcy5yYXdDb2xsZWN0aW9uKCkuY3JlYXRlSW5kZXgoe2FkZHJlc3M6MSxoZWlnaHQ6IC0xfSwge3VuaXF1ZToxfSk7XG5WYWxpZGF0b3JSZWNvcmRzLnJhd0NvbGxlY3Rpb24oKS5jcmVhdGVJbmRleCh7YWRkcmVzczoxLGV4aXN0czoxLCBoZWlnaHQ6IC0xfSk7XG5cbkFuYWx5dGljcy5yYXdDb2xsZWN0aW9uKCkuY3JlYXRlSW5kZXgoe2hlaWdodDogLTF9LCB7dW5pcXVlOnRydWV9KVxuXG5NaXNzZWRCbG9ja3MucmF3Q29sbGVjdGlvbigpLmNyZWF0ZUluZGV4KHtwcm9wb3NlcjoxLCB2b3RlcjoxLCB1cGRhdGVkQXQ6IC0xfSk7XG5NaXNzZWRCbG9ja3MucmF3Q29sbGVjdGlvbigpLmNyZWF0ZUluZGV4KHtwcm9wb3NlcjoxLCBibG9ja0hlaWdodDotMX0pO1xuTWlzc2VkQmxvY2tzLnJhd0NvbGxlY3Rpb24oKS5jcmVhdGVJbmRleCh7dm90ZXI6MSwgYmxvY2tIZWlnaHQ6LTF9KTtcbk1pc3NlZEJsb2Nrcy5yYXdDb2xsZWN0aW9uKCkuY3JlYXRlSW5kZXgoe3ZvdGVyOjEsIHByb3Bvc2VyOjEsIGJsb2NrSGVpZ2h0Oi0xfSwge3VuaXF1ZTp0cnVlfSk7XG5cbk1pc3NlZEJsb2Nrc1N0YXRzLnJhd0NvbGxlY3Rpb24oKS5jcmVhdGVJbmRleCh7cHJvcG9zZXI6MX0pO1xuTWlzc2VkQmxvY2tzU3RhdHMucmF3Q29sbGVjdGlvbigpLmNyZWF0ZUluZGV4KHt2b3RlcjoxfSk7XG5NaXNzZWRCbG9ja3NTdGF0cy5yYXdDb2xsZWN0aW9uKCkuY3JlYXRlSW5kZXgoe3Byb3Bvc2VyOjEsIHZvdGVyOjF9LHt1bmlxdWU6dHJ1ZX0pO1xuXG5BdmVyYWdlRGF0YS5yYXdDb2xsZWN0aW9uKCkuY3JlYXRlSW5kZXgoe3R5cGU6MSwgY3JlYXRlZEF0Oi0xfSx7dW5pcXVlOnRydWV9KTtcbkF2ZXJhZ2VWYWxpZGF0b3JEYXRhLnJhd0NvbGxlY3Rpb24oKS5jcmVhdGVJbmRleCh7cHJvcG9zZXJBZGRyZXNzOjEsY3JlYXRlZEF0Oi0xfSx7dW5pcXVlOnRydWV9KTtcbi8vIFN0YXR1cy5yYXdDb2xsZWN0aW9uLmNyZWF0ZUluZGV4KHt9KVxuXG5UcmFuc2FjdGlvbnMucmF3Q29sbGVjdGlvbigpLmNyZWF0ZUluZGV4KHt0eGhhc2g6MX0se3VuaXF1ZTp0cnVlfSk7XG5UcmFuc2FjdGlvbnMucmF3Q29sbGVjdGlvbigpLmNyZWF0ZUluZGV4KHtoZWlnaHQ6LTF9KTtcblRyYW5zYWN0aW9ucy5yYXdDb2xsZWN0aW9uKCkuY3JlYXRlSW5kZXgoe3Byb2Nlc3NlZDoxfSk7XG4vLyBUcmFuc2FjdGlvbnMucmF3Q29sbGVjdGlvbigpLmNyZWF0ZUluZGV4KHthY3Rpb246MX0pO1xuVHJhbnNhY3Rpb25zLnJhd0NvbGxlY3Rpb24oKS5jcmVhdGVJbmRleCh7XCJ0eF9yZXNwb25zZS5sb2dzLmV2ZW50cy5hdHRyaWJ1dGVzLmtleVwiOjF9KTtcblRyYW5zYWN0aW9ucy5yYXdDb2xsZWN0aW9uKCkuY3JlYXRlSW5kZXgoe1widHhfcmVzcG9uc2UubG9ncy5ldmVudHMuYXR0cmlidXRlcy52YWx1ZVwiOjF9KTtcblRyYW5zYWN0aW9ucy5yYXdDb2xsZWN0aW9uKCkuY3JlYXRlSW5kZXgoe1xuICAgIFwidHguYm9keS5tZXNzYWdlcy5kZWxlZ2F0b3JfYWRkcmVzc1wiOjEsXG4gICAgXCJ0eC5ib2R5Lm1lc3NhZ2VzLkB0eXBlXCI6MSxcbiAgICBcInR4X3Jlc3BvbnNlLmNvZGVcIjogMVxufSx7cGFydGlhbEZpbHRlckV4cHJlc3Npb246IHtcInR4X3Jlc3BvbnNlLmNvZGVcIjp7JGV4aXN0czogdHJ1ZX19fSlcblxuVmFsaWRhdG9yU2V0cy5yYXdDb2xsZWN0aW9uKCkuY3JlYXRlSW5kZXgoe2Jsb2NrX2hlaWdodDotMX0pO1xuXG5WYWxpZGF0b3JzLnJhd0NvbGxlY3Rpb24oKS5jcmVhdGVJbmRleCh7YWRkcmVzczoxfSx7dW5pcXVlOnRydWUsIHBhcnRpYWxGaWx0ZXJFeHByZXNzaW9uOiB7IGFkZHJlc3M6IHsgJGV4aXN0czogdHJ1ZSB9IH0gfSk7XG4vLyBWYWxpZGF0b3JzLnJhd0NvbGxlY3Rpb24oKS5jcmVhdGVJbmRleCh7Y29uc2Vuc3VzUHVia2V5OjF9LHt1bmlxdWU6dHJ1ZX0pO1xuVmFsaWRhdG9ycy5yYXdDb2xsZWN0aW9uKCkuY3JlYXRlSW5kZXgoe1wiY29uc2Vuc3VzUHVia2V5LnZhbHVlXCI6MX0se3VuaXF1ZTp0cnVlLCBwYXJ0aWFsRmlsdGVyRXhwcmVzc2lvbjogeyBcImNvbnNlbnN1c1B1YmtleS52YWx1ZVwiOiB7ICRleGlzdHM6IHRydWUgfSB9fSk7XG5cblZvdGluZ1Bvd2VySGlzdG9yeS5yYXdDb2xsZWN0aW9uKCkuY3JlYXRlSW5kZXgoe2FkZHJlc3M6MSxoZWlnaHQ6LTF9KTtcblZvdGluZ1Bvd2VySGlzdG9yeS5yYXdDb2xsZWN0aW9uKCkuY3JlYXRlSW5kZXgoe3R5cGU6MX0pO1xuXG5Db2luU3RhdHMucmF3Q29sbGVjdGlvbigpLmNyZWF0ZUluZGV4KHtsYXN0X3VwZGF0ZWRfYXQ6LTF9LHt1bmlxdWU6dHJ1ZX0pO1xuIiwiLy8gSW1wb3J0IHNlcnZlciBzdGFydHVwIHRocm91Z2ggYSBzaW5nbGUgaW5kZXggZW50cnkgcG9pbnRcblxuaW1wb3J0ICcuL3V0aWwuanMnO1xuaW1wb3J0ICcuL3JlZ2lzdGVyLWFwaS5qcyc7XG5pbXBvcnQgJy4vY3JlYXRlLWluZGV4ZXMuanMnO1xuXG4vLyBpbXBvcnQgUmVhY3QgZnJvbSAncmVhY3QnO1xuLy8gaW1wb3J0IHsgcmVuZGVyVG9Ob2RlU3RyZWFtIH0gZnJvbSAncmVhY3QtZG9tL3NlcnZlcic7XG4vLyBpbXBvcnQgeyByZW5kZXJUb1N0cmluZyB9IGZyb20gXCJyZWFjdC1kb20vc2VydmVyXCI7XG5pbXBvcnQgeyBvblBhZ2VMb2FkIH0gZnJvbSAnbWV0ZW9yL3NlcnZlci1yZW5kZXInO1xuLy8gaW1wb3J0IHsgU3RhdGljUm91dGVyIH0gZnJvbSAncmVhY3Qtcm91dGVyLWRvbSc7XG4vLyBpbXBvcnQgeyBTZXJ2ZXJTdHlsZVNoZWV0IH0gZnJvbSBcInN0eWxlZC1jb21wb25lbnRzXCJcbmltcG9ydCB7IEhlbG1ldCB9IGZyb20gJ3JlYWN0LWhlbG1ldCc7XG5cbi8vIGltcG9ydCBBcHAgZnJvbSAnLi4vLi4vdWkvQXBwLmpzeCc7XG5cbm9uUGFnZUxvYWQoc2luayA9PiB7XG4gICAgLy8gY29uc3QgY29udGV4dCA9IHt9O1xuICAgIC8vIGNvbnN0IHNoZWV0ID0gbmV3IFNlcnZlclN0eWxlU2hlZXQoKVxuXG4gICAgLy8gY29uc3QgaHRtbCA9IHJlbmRlclRvU3RyaW5nKHNoZWV0LmNvbGxlY3RTdHlsZXMoXG4gICAgLy8gICAgIDxTdGF0aWNSb3V0ZXIgbG9jYXRpb249e3NpbmsucmVxdWVzdC51cmx9IGNvbnRleHQ9e2NvbnRleHR9PlxuICAgIC8vICAgICAgICAgPEFwcCAvPlxuICAgIC8vICAgICA8L1N0YXRpY1JvdXRlcj5cbiAgICAvLyAgICkpO1xuXG4gICAgLy8gc2luay5yZW5kZXJJbnRvRWxlbWVudEJ5SWQoJ2FwcCcsIGh0bWwpO1xuXG4gICAgY29uc3QgaGVsbWV0ID0gSGVsbWV0LnJlbmRlclN0YXRpYygpO1xuICAgIHNpbmsuYXBwZW5kVG9IZWFkKGhlbG1ldC5tZXRhLnRvU3RyaW5nKCkpO1xuICAgIHNpbmsuYXBwZW5kVG9IZWFkKGhlbG1ldC50aXRsZS50b1N0cmluZygpKTtcblxuICAgIC8vIHNpbmsuYXBwZW5kVG9IZWFkKHNoZWV0LmdldFN0eWxlVGFncygpKTtcbn0pOyIsIi8vIFJlZ2lzdGVyIHlvdXIgYXBpcyBoZXJlXG5cbmltcG9ydCAnLi4vLi4vYXBpL2xlZGdlci9zZXJ2ZXIvbWV0aG9kcy5qcyc7XG5cbmltcG9ydCAnLi4vLi4vYXBpL2NoYWluL3NlcnZlci9tZXRob2RzLmpzJztcbmltcG9ydCAnLi4vLi4vYXBpL2NoYWluL3NlcnZlci9wdWJsaWNhdGlvbnMuanMnO1xuXG5pbXBvcnQgJy4uLy4uL2FwaS9ibG9ja3Mvc2VydmVyL21ldGhvZHMuanMnO1xuaW1wb3J0ICcuLi8uLi9hcGkvYmxvY2tzL3NlcnZlci9wdWJsaWNhdGlvbnMuanMnO1xuXG5pbXBvcnQgJy4uLy4uL2FwaS92YWxpZGF0b3JzL3NlcnZlci9tZXRob2RzLmpzJztcbmltcG9ydCAnLi4vLi4vYXBpL3ZhbGlkYXRvcnMvc2VydmVyL3B1YmxpY2F0aW9ucy5qcyc7XG5cbmltcG9ydCAnLi4vLi4vYXBpL3JlY29yZHMvc2VydmVyL21ldGhvZHMuanMnO1xuaW1wb3J0ICcuLi8uLi9hcGkvcmVjb3Jkcy9zZXJ2ZXIvcHVibGljYXRpb25zLmpzJztcblxuaW1wb3J0ICcuLi8uLi9hcGkvcHJvcG9zYWxzL3NlcnZlci9tZXRob2RzLmpzJztcbmltcG9ydCAnLi4vLi4vYXBpL3Byb3Bvc2Fscy9zZXJ2ZXIvcHVibGljYXRpb25zLmpzJztcblxuaW1wb3J0ICcuLi8uLi9hcGkvdm90aW5nLXBvd2VyL3NlcnZlci9wdWJsaWNhdGlvbnMuanMnO1xuXG5pbXBvcnQgJy4uLy4uL2FwaS90cmFuc2FjdGlvbnMvc2VydmVyL21ldGhvZHMuanMnO1xuaW1wb3J0ICcuLi8uLi9hcGkvdHJhbnNhY3Rpb25zL3NlcnZlci9wdWJsaWNhdGlvbnMuanMnO1xuXG5pbXBvcnQgJy4uLy4uL2FwaS9kZWxlZ2F0aW9ucy9zZXJ2ZXIvbWV0aG9kcy5qcyc7XG5pbXBvcnQgJy4uLy4uL2FwaS9kZWxlZ2F0aW9ucy9zZXJ2ZXIvcHVibGljYXRpb25zLmpzJztcblxuaW1wb3J0ICcuLi8uLi9hcGkvc3RhdHVzL3NlcnZlci9wdWJsaWNhdGlvbnMuanMnO1xuXG5pbXBvcnQgJy4uLy4uL2FwaS9hY2NvdW50cy9zZXJ2ZXIvbWV0aG9kcy5qcyc7XG5cbmltcG9ydCAnLi4vLi4vYXBpL2NvaW4tc3RhdHMvc2VydmVyL21ldGhvZHMuanMnO1xuIiwiaW1wb3J0IGJlY2gzMiBmcm9tICdiZWNoMzInXG5pbXBvcnQgeyBIVFRQIH0gZnJvbSAnbWV0ZW9yL2h0dHAnO1xuaW1wb3J0ICogYXMgY2hlZXJpbyBmcm9tICdjaGVlcmlvJztcbmltcG9ydCB7IHRtaGFzaCB9IGZyb20gJ3RlbmRlcm1pbnQvbGliL2hhc2gnXG5cbk1ldGVvci5tZXRob2RzKHtcbiAgICBoZXhUb0JlY2gzMjogZnVuY3Rpb24oYWRkcmVzcywgcHJlZml4KSB7XG4gICAgICAgIGxldCBhZGRyZXNzQnVmZmVyID0gQnVmZmVyLmZyb20oYWRkcmVzcywgJ2hleCcpO1xuICAgICAgICAvLyBsZXQgYnVmZmVyID0gQnVmZmVyLmFsbG9jKDM3KVxuICAgICAgICAvLyBhZGRyZXNzQnVmZmVyLmNvcHkoYnVmZmVyKTtcbiAgICAgICAgcmV0dXJuIGJlY2gzMi5lbmNvZGUocHJlZml4LCBiZWNoMzIudG9Xb3JkcyhhZGRyZXNzQnVmZmVyKSk7XG4gICAgfSxcbiAgICBwdWJrZXlUb0JlY2gzMk9sZDogZnVuY3Rpb24ocHVia2V5LCBwcmVmaXgpIHtcbiAgICAgICAgbGV0IGJ1ZmZlcjtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgaWYgKHB1YmtleS50eXBlLmluZGV4T2YoXCJFZDI1NTE5XCIpID4gMCl7XG4gICAgICAgICAgICAvLyAnMTYyNERFNjQyMCcgaXMgZWQyNTUxOSBwdWJrZXkgcHJlZml4XG4gICAgICAgICAgICAgICAgbGV0IHB1YmtleUFtaW5vUHJlZml4ID0gQnVmZmVyLmZyb20oJzE2MjRERTY0MjAnLCAnaGV4Jyk7XG4gICAgICAgICAgICAgICAgYnVmZmVyID0gQnVmZmVyLmFsbG9jKDM3KTtcbiAgICAgICAgXG4gICAgICAgICAgICAgICAgcHVia2V5QW1pbm9QcmVmaXguY29weShidWZmZXIsIDApXG4gICAgICAgICAgICAgICAgQnVmZmVyLmZyb20ocHVia2V5LnZhbHVlLCAnYmFzZTY0JykuY29weShidWZmZXIsIHB1YmtleUFtaW5vUHJlZml4Lmxlbmd0aClcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKHB1YmtleS50eXBlLmluZGV4T2YoXCJTZWNwMjU2azFcIikgPiAwKXtcbiAgICAgICAgICAgIC8vICdFQjVBRTk4NzIxJyBpcyBzZWNwMjU2azEgcHVia2V5IHByZWZpeFxuICAgICAgICAgICAgICAgIGxldCBwdWJrZXlBbWlub1ByZWZpeCA9IEJ1ZmZlci5mcm9tKCdFQjVBRTk4NzIxJywgJ2hleCcpO1xuICAgICAgICAgICAgICAgIGJ1ZmZlciA9IEJ1ZmZlci5hbGxvYygzOCk7XG4gICAgXG4gICAgICAgICAgICAgICAgcHVia2V5QW1pbm9QcmVmaXguY29weShidWZmZXIsIDApXG4gICAgICAgICAgICAgICAgQnVmZmVyLmZyb20ocHVia2V5LnZhbHVlLCAnYmFzZTY0JykuY29weShidWZmZXIsIHB1YmtleUFtaW5vUHJlZml4Lmxlbmd0aClcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiUHVia2V5IHR5cGUgbm90IHN1cHBvcnRlZC5cIik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gYmVjaDMyLmVuY29kZShwcmVmaXgsIGJlY2gzMi50b1dvcmRzKGJ1ZmZlcikpXG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGUpe1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJFcnJvciBjb252ZXJ0aW5nIGZyb20gcHVia2V5IHRvIGJlY2gzMjogJW9cXG4gJW9cIiwgcHVia2V5LCBlKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgICB9XG4gICAgfSxcbiAgICBwdWJrZXlUb0JlY2gzMjogZnVuY3Rpb24ocHVia2V5LCBwcmVmaXgpIHtcbiAgICAgICAgbGV0IGJ1ZmZlcjtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgaWYgKHB1YmtleVtcIkB0eXBlXCJdLmluZGV4T2YoXCJlZDI1NTE5XCIpID4gMCl7XG4gICAgICAgICAgICAvLyAnMTYyNERFNjQyMCcgaXMgZWQyNTUxOSBwdWJrZXkgcHJlZml4XG4gICAgICAgICAgICAgICAgbGV0IHB1YmtleUFtaW5vUHJlZml4ID0gQnVmZmVyLmZyb20oJzE2MjRERTY0MjAnLCAnaGV4Jyk7XG4gICAgICAgICAgICAgICAgYnVmZmVyID0gQnVmZmVyLmFsbG9jKDM3KTtcbiAgICAgICAgXG4gICAgICAgICAgICAgICAgcHVia2V5QW1pbm9QcmVmaXguY29weShidWZmZXIsIDApXG4gICAgICAgICAgICAgICAgQnVmZmVyLmZyb20ocHVia2V5LmtleSwgJ2Jhc2U2NCcpLmNvcHkoYnVmZmVyLCBwdWJrZXlBbWlub1ByZWZpeC5sZW5ndGgpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChwdWJrZXlbXCJAdHlwZVwiXS5pbmRleE9mKFwic2VjcDI1NmsxXCIpID4gMCl7XG4gICAgICAgICAgICAvLyAnRUI1QUU5ODcyMScgaXMgc2VjcDI1NmsxIHB1YmtleSBwcmVmaXhcbiAgICAgICAgICAgICAgICBsZXQgcHVia2V5QW1pbm9QcmVmaXggPSBCdWZmZXIuZnJvbSgnRUI1QUU5ODcyMScsICdoZXgnKTtcbiAgICAgICAgICAgICAgICBidWZmZXIgPSBCdWZmZXIuYWxsb2MoMzgpO1xuICAgIFxuICAgICAgICAgICAgICAgIHB1YmtleUFtaW5vUHJlZml4LmNvcHkoYnVmZmVyLCAwKVxuICAgICAgICAgICAgICAgIEJ1ZmZlci5mcm9tKHB1YmtleS5rZXksICdiYXNlNjQnKS5jb3B5KGJ1ZmZlciwgcHVia2V5QW1pbm9QcmVmaXgubGVuZ3RoKVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJQdWJrZXkgdHlwZSBub3Qgc3VwcG9ydGVkLlwiKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBiZWNoMzIuZW5jb2RlKHByZWZpeCwgYmVjaDMyLnRvV29yZHMoYnVmZmVyKSlcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZSl7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIkVycm9yIGNvbnZlcnRpbmcgZnJvbSBwdWJrZXkgdG8gYmVjaDMyOiAlb1xcbiAlb1wiLCBwdWJrZXksIGUpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICAgIH1cbiAgICB9LFxuICAgIGJlY2gzMlRvUHVia2V5OiBmdW5jdGlvbihwdWJrZXksIHR5cGUpIHtcbiAgICAgICAgLy8gdHlwZSBjYW4gb25seSBiZSBlaXRoZXIgJ3RlbmRlcm1pbnQvUHViS2V5U2VjcDI1NmsxJyBvciAndGVuZGVybWludC9QdWJLZXlFZDI1NTE5J1xuICAgICAgICBsZXQgcHVia2V5QW1pbm9QcmVmaXgsIGJ1ZmZlcjtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgaWYgKHR5cGUuaW5kZXhPZihcImVkMjU1MTlcIikgPiAwKXtcbiAgICAgICAgICAgIC8vICcxNjI0REU2NDIwJyBpcyBlZDI1NTE5IHB1YmtleSBwcmVmaXhcbiAgICAgICAgICAgICAgICBwdWJrZXlBbWlub1ByZWZpeCA9IEJ1ZmZlci5mcm9tKCcxNjI0REU2NDIwJywgJ2hleCcpXG4gICAgICAgICAgICAgICAgYnVmZmVyID0gQnVmZmVyLmZyb20oYmVjaDMyLmZyb21Xb3JkcyhiZWNoMzIuZGVjb2RlKHB1YmtleSkud29yZHMpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKHR5cGUuaW5kZXhPZihcInNlY3AyNTZrMVwiKSA+IDApe1xuICAgICAgICAgICAgLy8gJ0VCNUFFOTg3MjEnIGlzIHNlY3AyNTZrMSBwdWJrZXkgcHJlZml4XG4gICAgICAgICAgICAgICAgcHVia2V5QW1pbm9QcmVmaXggPSBCdWZmZXIuZnJvbSgnRUI1QUU5ODcyMScsICdoZXgnKVxuICAgICAgICAgICAgICAgIGJ1ZmZlciA9IEJ1ZmZlci5mcm9tKGJlY2gzMi5mcm9tV29yZHMoYmVjaDMyLmRlY29kZShwdWJrZXkpLndvcmRzKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIlB1YmtleSB0eXBlIG5vdCBzdXBwb3J0ZWQuXCIpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4gYnVmZmVyLnNsaWNlKHB1YmtleUFtaW5vUHJlZml4Lmxlbmd0aCkudG9TdHJpbmcoJ2Jhc2U2NCcpO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlKXtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiRXJyb3IgY29udmVydGluZyBmcm9tIGJlY2gzMiB0byBwdWJrZXk6ICVvXFxuICVvXCIsIHB1YmtleSwgZSk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgICAgfVxuICAgIH0sXG4gICAgZ2V0QWRkcmVzc0Zyb21QdWJrZXk6IGZ1bmN0aW9uKHB1YmtleSl7XG4gICAgICAgIHZhciBieXRlcyA9IEJ1ZmZlci5mcm9tKHB1YmtleS5rZXksICdiYXNlNjQnKTtcbiAgICAgICAgcmV0dXJuIHRtaGFzaChieXRlcykuc2xpY2UoMCwgMjApLnRvU3RyaW5nKCdoZXgnKS50b1VwcGVyQ2FzZSgpO1xuICAgIH0sXG4gICAgZ2V0RGVsZWdhdG9yOiBmdW5jdGlvbihvcGVyYXRvckFkZHIpe1xuICAgICAgICBsZXQgYWRkcmVzcyA9IGJlY2gzMi5kZWNvZGUob3BlcmF0b3JBZGRyKTtcbiAgICAgICAgcmV0dXJuIGJlY2gzMi5lbmNvZGUoTWV0ZW9yLnNldHRpbmdzLnB1YmxpYy5iZWNoMzJQcmVmaXhBY2NBZGRyLCBhZGRyZXNzLndvcmRzKTtcbiAgICB9LFxuICAgIGdldEtleWJhc2VUZWFtUGljOiBmdW5jdGlvbihrZXliYXNlVXJsKXtcbiAgICAgICAgbGV0IHRlYW1QYWdlID0gSFRUUC5nZXQoa2V5YmFzZVVybCk7XG4gICAgICAgIGlmICh0ZWFtUGFnZS5zdGF0dXNDb2RlID09IDIwMCl7XG4gICAgICAgICAgICBsZXQgcGFnZSA9IGNoZWVyaW8ubG9hZCh0ZWFtUGFnZS5jb250ZW50KTtcbiAgICAgICAgICAgIHJldHVybiBwYWdlKFwiLmtiLW1haW4tY2FyZCBpbWdcIikuYXR0cignc3JjJyk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIGdldFZlcnNpb246IGZ1bmN0aW9uKCl7XG4gICAgICAgIGNvbnN0IHZlcnNpb24gPSBBc3NldHMuZ2V0VGV4dCgndmVyc2lvbicpO1xuICAgICAgICByZXR1cm4gdmVyc2lvbiA/IHZlcnNpb24gOiAnYmV0YSdcbiAgICB9XG59KVxuIiwiaW1wb3J0IFJlYWN0IGZyb20gJ3JlYWN0JztcbmltcG9ydCB7IFVuY29udHJvbGxlZFRvb2x0aXAgfSBmcm9tICdyZWFjdHN0cmFwJztcblxuZXhwb3J0IGNvbnN0IERlbm9tU3ltYm9sID0gKHByb3BzKSA9PiB7XG4gICAgc3dpdGNoIChwcm9wcy5kZW5vbSl7XG4gICAgY2FzZSBcInN0ZWFrXCI6XG4gICAgICAgIHJldHVybiAn8J+lqSc7XG4gICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuICfwn42FJztcbiAgICB9XG59XG5cblxuZXhwb3J0IGNvbnN0IFByb3Bvc2FsU3RhdHVzSWNvbiA9IChwcm9wcykgPT4ge1xuICAgIHN3aXRjaCAocHJvcHMuc3RhdHVzKXtcbiAgICBjYXNlICdQUk9QT1NBTF9TVEFUVVNfUEFTU0VEJzpcbiAgICAgICAgcmV0dXJuIDxpIGNsYXNzTmFtZT1cImZhcyBmYS1jaGVjay1jaXJjbGUgdGV4dC1zdWNjZXNzXCI+PC9pPjtcbiAgICBjYXNlICdQUk9QT1NBTF9TVEFUVVNfUkVKRUNURUQnOlxuICAgICAgICByZXR1cm4gPGkgY2xhc3NOYW1lPVwiZmFzIGZhLXRpbWVzLWNpcmNsZSB0ZXh0LWRhbmdlclwiPjwvaT47XG4gICAgY2FzZSAnUFJPUE9TQUxfU1RBVFVTX1JFTU9WRUQnOlxuICAgICAgICByZXR1cm4gPGkgY2xhc3NOYW1lPVwiZmFzIGZhLXRyYXNoLWFsdCB0ZXh0LWRhcmtcIj48L2k+XG4gICAgY2FzZSAnUFJPUE9TQUxfU1RBVFVTX0RFUE9TSVRfUEVSSU9EJzpcbiAgICAgICAgcmV0dXJuIDxpIGNsYXNzTmFtZT1cImZhcyBmYS1iYXR0ZXJ5LWhhbGYgdGV4dC13YXJuaW5nXCI+PC9pPjtcbiAgICBjYXNlICdQUk9QT1NBTF9TVEFUVVNfVk9USU5HX1BFUklPRCc6XG4gICAgICAgIHJldHVybiA8aSBjbGFzc05hbWU9XCJmYXMgZmEtaGFuZC1wYXBlciB0ZXh0LWluZm9cIj48L2k+O1xuICAgIGRlZmF1bHQ6XG4gICAgICAgIHJldHVybiA8aT48L2k+O1xuICAgIH1cbn1cblxuZXhwb3J0IGNvbnN0IFZvdGVJY29uID0gKHByb3BzKSA9PiB7XG4gICAgc3dpdGNoIChwcm9wcy52b3RlKXtcbiAgICBjYXNlICd5ZXMnOlxuICAgICAgICByZXR1cm4gPGkgY2xhc3NOYW1lPVwiZmFzIGZhLWNoZWNrIHRleHQtc3VjY2Vzc1wiPjwvaT47XG4gICAgY2FzZSAnbm8nOlxuICAgICAgICByZXR1cm4gPGkgY2xhc3NOYW1lPVwiZmFzIGZhLXRpbWVzIHRleHQtZGFuZ2VyXCI+PC9pPjtcbiAgICBjYXNlICdhYnN0YWluJzpcbiAgICAgICAgcmV0dXJuIDxpIGNsYXNzTmFtZT1cImZhcyBmYS11c2VyLXNsYXNoIHRleHQtd2FybmluZ1wiPjwvaT47XG4gICAgY2FzZSAnbm9fd2l0aF92ZXRvJzpcbiAgICAgICAgcmV0dXJuIDxpIGNsYXNzTmFtZT1cImZhcyBmYS1leGNsYW1hdGlvbi10cmlhbmdsZSB0ZXh0LWluZm9cIj48L2k+O1xuICAgIGRlZmF1bHQ6XG4gICAgICAgIHJldHVybiA8aT48L2k+O1xuICAgIH1cbn1cblxuZXhwb3J0IGNvbnN0IFR4SWNvbiA9IChwcm9wcykgPT4ge1xuICAgIGlmIChwcm9wcy52YWxpZCl7XG4gICAgICAgIHJldHVybiA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LXN1Y2Nlc3MgdGV4dC1ub3dyYXBcIj48aSBjbGFzc05hbWU9XCJmYXMgZmEtY2hlY2stY2lyY2xlXCI+PC9pPjwvc3Bhbj47XG4gICAgfVxuICAgIGVsc2V7XG4gICAgICAgIHJldHVybiA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LWRhbmdlciB0ZXh0LW5vd3JhcFwiPjxpIGNsYXNzTmFtZT1cImZhcyBmYS10aW1lcy1jaXJjbGVcIj48L2k+PC9zcGFuPjtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBJbmZvSWNvbiBleHRlbmRzIFJlYWN0LkNvbXBvbmVudCB7XG4gICAgY29uc3RydWN0b3IocHJvcHMpIHtcbiAgICAgICAgc3VwZXIocHJvcHMpO1xuICAgICAgICB0aGlzLnJlZiA9IFJlYWN0LmNyZWF0ZVJlZigpO1xuICAgIH1cblxuICAgIHJlbmRlcigpIHtcbiAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgIDxpIGtleT0naWNvbicgY2xhc3NOYW1lPSdtYXRlcmlhbC1pY29ucyBpbmZvLWljb24nIHJlZj17dGhpcy5yZWZ9PmluZm88L2k+LFxuICAgICAgICAgICAgPFVuY29udHJvbGxlZFRvb2x0aXAga2V5PSd0b29sdGlwJyBwbGFjZW1lbnQ9J3JpZ2h0JyB0YXJnZXQ9e3RoaXMucmVmfT5cbiAgICAgICAgICAgICAgICB7dGhpcy5wcm9wcy5jaGlsZHJlbj90aGlzLnByb3BzLmNoaWxkcmVuOnRoaXMucHJvcHMudG9vbHRpcFRleHR9XG4gICAgICAgICAgICA8L1VuY29udHJvbGxlZFRvb2x0aXA+XG4gICAgICAgIF1cbiAgICB9XG59IiwiLyogZXNsaW50LWRpc2FibGUgbm8tdGFicyAqL1xuaW1wb3J0IHsgTWV0ZW9yIH0gZnJvbSAnbWV0ZW9yL21ldGVvcic7XG5pbXBvcnQgbnVtYnJvIGZyb20gJ251bWJybyc7XG5cbmF1dG9mb3JtYXQgPSAodmFsdWUpID0+IHtcbiAgICBsZXQgZm9ybWF0dGVyID0gJzAsMC4wMDAwJztcbiAgICB2YWx1ZSA9IE1hdGgucm91bmQodmFsdWUgKiAxMDAwKSAvIDEwMDBcbiAgICBpZiAoTWF0aC5yb3VuZCh2YWx1ZSkgPT09IHZhbHVlKVxuICAgICAgICBmb3JtYXR0ZXIgPSAnMCwwJ1xuICAgIGVsc2UgaWYgKE1hdGgucm91bmQodmFsdWUqMTApID09PSB2YWx1ZSoxMClcbiAgICAgICAgZm9ybWF0dGVyID0gJzAsMC4wJ1xuICAgIGVsc2UgaWYgKE1hdGgucm91bmQodmFsdWUqMTAwKSA9PT0gdmFsdWUqMTAwKVxuICAgICAgICBmb3JtYXR0ZXIgPSAnMCwwLjAwJ1xuICAgIGVsc2UgaWYgKE1hdGgucm91bmQodmFsdWUqMTAwMCkgPT09IHZhbHVlKjEwMDApXG4gICAgICAgIGZvcm1hdHRlciA9ICcwLDAuMDAwJ1xuICAgIHJldHVybiBudW1icm8odmFsdWUpLmZvcm1hdChmb3JtYXR0ZXIpXG59XG5cbmNvbnN0IGNvaW5MaXN0ID0gTWV0ZW9yLnNldHRpbmdzLnB1YmxpYy5jb2lucztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQ29pbiB7XG5zdGF0aWMgU3Rha2luZ0NvaW4gPSBjb2luTGlzdC5maW5kKGNvaW4gPT4gY29pbi5kZW5vbSA9PT0gTWV0ZW9yLnNldHRpbmdzLnB1YmxpYy5ib25kRGVub20pO1xuc3RhdGljIE1pblN0YWtlID0gMSAvIE51bWJlcihDb2luLlN0YWtpbmdDb2luLmZyYWN0aW9uKTtcblxuY29uc3RydWN0b3IoYW1vdW50LCBkZW5vbT1NZXRlb3Iuc2V0dGluZ3MucHVibGljLmJvbmREZW5vbSkge1xuICAgIGNvbnN0IGxvd2VyRGVub20gPSBkZW5vbS50b0xvd2VyQ2FzZSgpO1xuICAgIHRoaXMuX2NvaW4gPSBjb2luTGlzdC5maW5kKGNvaW4gPT5cbiAgICAgICAgY29pbi5kZW5vbS50b0xvd2VyQ2FzZSgpID09PSBsb3dlckRlbm9tIHx8IGNvaW4uZGlzcGxheU5hbWUudG9Mb3dlckNhc2UoKSA9PT0gbG93ZXJEZW5vbVxuICAgICk7XG5cbiAgICBpZiAodGhpcy5fY29pbil7XG4gICAgICAgIGlmIChsb3dlckRlbm9tID09PSB0aGlzLl9jb2luLmRlbm9tLnRvTG93ZXJDYXNlKCkpIHtcbiAgICAgICAgICAgIHRoaXMuX2Ftb3VudCA9IE51bWJlcihhbW91bnQpO1xuICAgICAgICB9IGVsc2UgaWYgKGxvd2VyRGVub20gPT09IHRoaXMuX2NvaW4uZGlzcGxheU5hbWUudG9Mb3dlckNhc2UoKSkge1xuICAgICAgICAgICAgdGhpcy5fYW1vdW50ID0gTnVtYmVyKGFtb3VudCkgKiB0aGlzLl9jb2luLmZyYWN0aW9uO1xuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICB0aGlzLl9jb2luID0gXCJcIjtcbiAgICAgICAgdGhpcy5fYW1vdW50ID0gTnVtYmVyKGFtb3VudCk7XG4gICAgfVxufVxuXG5nZXQgYW1vdW50ICgpIHtcbiAgICByZXR1cm4gdGhpcy5fYW1vdW50O1xufVxuXG5nZXQgc3Rha2luZ0Ftb3VudCAoKSB7XG4gICAgcmV0dXJuICh0aGlzLl9jb2luKT90aGlzLl9hbW91bnQgLyB0aGlzLl9jb2luLmZyYWN0aW9uOnRoaXMuX2Ftb3VudDtcbn1cblxudG9TdHJpbmcgKHByZWNpc2lvbikge1xuICAgIC8vIGRlZmF1bHQgdG8gZGlzcGxheSBpbiBtaW50IGRlbm9tIGlmIGl0IGhhcyBtb3JlIHRoYW4gNCBkZWNpbWFsIHBsYWNlc1xuICAgIGxldCBtaW5TdGFrZSA9IENvaW4uU3Rha2luZ0NvaW4uZnJhY3Rpb24vKHByZWNpc2lvbj8oMTAgKiogcHJlY2lzaW9uKToxMDAwMClcbiAgICBpZiAodGhpcy5hbW91bnQgPT09IDApIHtcbiAgICAgICAgcmV0dXJuIGAwICR7dGhpcy5fY29pbi5kaXNwbGF5TmFtZX1gXG4gICAgfVxuICAgIGVsc2UgaWYgKHRoaXMuYW1vdW50IDwgbWluU3Rha2UpIHtcbiAgICAgICAgcmV0dXJuIGAke251bWJybyh0aGlzLmFtb3VudCkuZm9ybWF0KCcwLDAuMDAwMDAwJyApfSAke3RoaXMuX2NvaW4uZGVub219YDtcbiAgICB9XG4gICAgZWxzZSBpZiAoIXRoaXMuX2NvaW4uZGlzcGxheU5hbWUpe1xuICAgICAgICByZXR1cm4gYCR7dGhpcy5zdGFraW5nQW1vdW50ID8/IDB9ICR7Q29pbi5TdGFraW5nQ29pbi5kaXNwbGF5TmFtZX1gXG4gICAgfVxuICAgIGVsc2UgaWYgKHRoaXMuYW1vdW50ICUgMSA9PT0gMCl7XG4gICAgICAgIHJldHVybiBgJHt0aGlzLnN0YWtpbmdBbW91bnR9ICR7dGhpcy5fY29pbi5kaXNwbGF5TmFtZX1gXG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICByZXR1cm4gYCR7cHJlY2lzaW9uP251bWJybyh0aGlzLnN0YWtpbmdBbW91bnQpLmZvcm1hdCgnMCwwLicgKyAnMCcucmVwZWF0KHByZWNpc2lvbikpOmF1dG9mb3JtYXQodGhpcy5zdGFraW5nQW1vdW50KX0gJHt0aGlzLl9jb2luLmRpc3BsYXlOYW1lfWBcbiAgICB9XG59XG59IiwiaW1wb3J0IFJlYWN0IGZyb20gJ3JlYWN0JztcbmltcG9ydCB7IERpc2FwcGVhcmVkTG9hZGluZyB9IGZyb20gJ3JlYWN0LWxvYWRpbmdnJztcblxuY29uc3QgTG9hZGVyID0gKCkgPT4gPGRpdj48RGlzYXBwZWFyZWRMb2FkaW5nIGNvbG9yPVwiI2JkMDgxY1wiIHNpemU9XCJzbVwiLz48L2Rpdj47XG5cbmV4cG9ydCBkZWZhdWx0IExvYWRlcjsiLCJleHBvcnQgY29uc3QgZ29UaW1lVG9JU09TdHJpbmcgPSAodGltZSkgPT4ge1xuICAgIGNvbnN0IG1pbGxpc2Vjb25kID0gcGFyc2VJbnQodGltZS5zZWNvbmRzK3RpbWUubmFub3MudG9TdHJpbmcoKS5zdWJzdHJpbmcoMCwzKSk7XG4gICAgcmV0dXJuIChuZXcgRGF0ZShtaWxsaXNlY29uZCkpLnRvSVNPU3RyaW5nKClcbn0iLCIvLyBTZXJ2ZXIgZW50cnkgcG9pbnQsIGltcG9ydHMgYWxsIHNlcnZlciBjb2RlXG5cbmltcG9ydCAnL2ltcG9ydHMvc3RhcnR1cC9zZXJ2ZXInO1xuaW1wb3J0ICcvaW1wb3J0cy9zdGFydHVwL2JvdGgnO1xuLy8gaW1wb3J0IG1vbWVudCBmcm9tICdtb21lbnQnO1xuLy8gaW1wb3J0ICcvaW1wb3J0cy9hcGkvYmxvY2tzL2Jsb2Nrcy5qcyc7XG5cblNZTkNJTkcgPSBmYWxzZTtcblRYU1lOQ0lORyA9IGZhbHNlO1xuQ09VTlRNSVNTRURCTE9DS1MgPSBmYWxzZTtcbkNPVU5UTUlTU0VEQkxPQ0tTU1RBVFMgPSBmYWxzZTtcblJQQyA9IE1ldGVvci5zZXR0aW5ncy5yZW1vdGUucnBjO1xuQVBJID0gTWV0ZW9yLnNldHRpbmdzLnJlbW90ZS5hcGk7XG5cbnRpbWVyQmxvY2tzID0gMDtcbnRpbWVyVHJhbnNhY3Rpb25zID0gMDtcbnRpbWVyQ2hhaW4gPSAwO1xudGltZXJDb25zZW5zdXMgPSAwO1xudGltZXJQcm9wb3NhbCA9IDA7XG50aW1lclByb3Bvc2Fsc1Jlc3VsdHMgPSAwO1xudGltZXJNaXNzZWRCbG9jayA9IDA7XG50aW1lckRlbGVnYXRpb24gPSAwO1xudGltZXJBZ2dyZWdhdGUgPSAwO1xudGltZXJGZXRjaEtleWJhc2UgPSAwO1xuXG5jb25zdCBERUZBVUxUU0VUVElOR1MgPSAnL2RlZmF1bHRfc2V0dGluZ3MuanNvbic7XG5cbnVwZGF0ZUNoYWluU3RhdHVzID0gKCkgPT4ge1xuICAgIE1ldGVvci5jYWxsKCdjaGFpbi51cGRhdGVTdGF0dXMnLCAoZXJyb3IsIHJlc3VsdCkgPT4ge1xuICAgICAgICBpZiAoZXJyb3Ipe1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJ1cGRhdGVTdGF0dXM6ICVvXCIsIGVycm9yKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNle1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJ1cGRhdGVTdGF0dXM6ICVvXCIsIHJlc3VsdCk7XG4gICAgICAgIH1cbiAgICB9KVxufVxuXG51cGRhdGVCbG9jayA9ICgpID0+IHtcbiAgICBNZXRlb3IuY2FsbCgnYmxvY2tzLmJsb2Nrc1VwZGF0ZScsIChlcnJvciwgcmVzdWx0KSA9PiB7XG4gICAgICAgIGlmIChlcnJvcil7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcInVwZGF0ZUJsb2NrczogJW9cIiwgZXJyb3IpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2V7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcInVwZGF0ZUJsb2NrczogJW9cIiwgcmVzdWx0KTtcbiAgICAgICAgfVxuICAgIH0pXG59XG5cbnVwZGF0ZVRyYW5zYWN0aW9ucyA9ICgpID0+IHtcbiAgICBNZXRlb3IuY2FsbCgnVHJhbnNhY3Rpb25zLnVwZGF0ZVRyYW5zYWN0aW9ucycsIChlcnJvciwgcmVzdWx0KSA9PiB7XG4gICAgICAgIGlmIChlcnJvcil7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcInVwZGF0ZVRyYW5zYWN0aW9uczogJW9cIixlcnJvcik7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZXtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwidXBkYXRlVHJhbnNhY3Rpb25zOiAlb1wiLHJlc3VsdCk7XG4gICAgICAgIH1cbiAgICB9KVxufVxuXG5nZXRDb25zZW5zdXNTdGF0ZSA9ICgpID0+IHtcbiAgICBNZXRlb3IuY2FsbCgnY2hhaW4uZ2V0Q29uc2Vuc3VzU3RhdGUnLCAoZXJyb3IsIHJlc3VsdCkgPT4ge1xuICAgICAgICBpZiAoZXJyb3Ipe1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJnZXQgY29uc2Vuc3VzOiAlb1wiLCBlcnJvcilcbiAgICAgICAgfVxuICAgIH0pXG59XG5cbmdldFByb3Bvc2FscyA9ICgpID0+IHtcbiAgICBNZXRlb3IuY2FsbCgncHJvcG9zYWxzLmdldFByb3Bvc2FscycsIChlcnJvciwgcmVzdWx0KSA9PiB7XG4gICAgICAgIGlmIChlcnJvcil7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImdldCBwcm9wb3NhbDogJW9cIiwgZXJyb3IpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChyZXN1bHQpe1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJnZXQgcHJvcG9zYWw6ICVvXCIsIHJlc3VsdCk7XG4gICAgICAgIH1cbiAgICB9KTtcbn1cblxuZ2V0UHJvcG9zYWxzUmVzdWx0cyA9ICgpID0+IHtcbiAgICBNZXRlb3IuY2FsbCgncHJvcG9zYWxzLmdldFByb3Bvc2FsUmVzdWx0cycsIChlcnJvciwgcmVzdWx0KSA9PiB7XG4gICAgICAgIGlmIChlcnJvcil7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImdldCBwcm9wb3NhbHMgcmVzdWx0OiAlb1wiLCBlcnJvcik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlc3VsdCl7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImdldCBwcm9wb3NhbHMgcmVzdWx0OiAlb1wiLCByZXN1bHQpO1xuICAgICAgICB9XG4gICAgfSk7XG59XG5cbnVwZGF0ZU1pc3NlZEJsb2NrcyA9ICgpID0+IHtcbiAgICBNZXRlb3IuY2FsbCgnVmFsaWRhdG9yUmVjb3Jkcy5jYWxjdWxhdGVNaXNzZWRCbG9ja3MnLCAoZXJyb3IsIHJlc3VsdCkgPT57XG4gICAgICAgIGlmIChlcnJvcil7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIm1pc3NlZCBibG9ja3MgZXJyb3I6ICVvXCIsIGVycm9yKVxuICAgICAgICB9XG4gICAgICAgIGlmIChyZXN1bHQpe1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJtaXNzZWQgYmxvY2tzIG9rOiAlb1wiLCByZXN1bHQpO1xuICAgICAgICB9XG4gICAgfSk7XG59XG5cbmZldGNoS2V5YmFzZSA9ICgpID0+IHtcbiAgICBNZXRlb3IuY2FsbCgnVmFsaWRhdG9ycy5mZXRjaEtleWJhc2UnLCAoZXJyb3IsIHJlc3VsdCkgPT4ge1xuICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiRXJyb3Igd2hlbiBmZXRjaGluZyBLZXliYXNlXCIgKyBlcnJvcilcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIktleWJhc2UgcHJvZmlsZV91cmwgdXBkYXRlZCBcIiwgcmVzdWx0KTtcbiAgICAgICAgfVxuICAgIH0pO1xufVxuXG5nZXREZWxlZ2F0aW9ucyA9ICgpID0+IHtcbiAgICBNZXRlb3IuY2FsbCgnZGVsZWdhdGlvbnMuZ2V0RGVsZWdhdGlvbnMnLCAoZXJyb3IsIHJlc3VsdCkgPT4ge1xuICAgICAgICBpZiAoZXJyb3Ipe1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJnZXQgZGVsZWdhdGlvbnMgZXJyb3I6ICVvXCIsIGVycm9yKVxuICAgICAgICB9XG4gICAgICAgIGVsc2V7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImdldCBkZWxlZ2F0aW9ucyBvazogJW9cIiwgcmVzdWx0KVxuICAgICAgICB9XG4gICAgfSk7XG59XG5cbmFnZ3JlZ2F0ZU1pbnV0ZWx5ID0gKCkgPT57XG4gICAgLy8gZG9pbmcgc29tZXRoaW5nIGV2ZXJ5IG1pblxuICAgIE1ldGVvci5jYWxsKCdBbmFseXRpY3MuYWdncmVnYXRlQmxvY2tUaW1lQW5kVm90aW5nUG93ZXInLCBcIm1cIiwgKGVycm9yLCByZXN1bHQpID0+IHtcbiAgICAgICAgaWYgKGVycm9yKXtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiYWdncmVnYXRlIG1pbnV0ZWx5IGJsb2NrIHRpbWUgZXJyb3I6ICVvXCIsIGVycm9yKVxuICAgICAgICB9XG4gICAgICAgIGVsc2V7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImFnZ3JlZ2F0ZSBtaW51dGVseSBibG9jayB0aW1lIG9rOiAlb1wiLCByZXN1bHQpXG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIE1ldGVvci5jYWxsKCdjb2luU3RhdHMuZ2V0Q29pblN0YXRzJywgKGVycm9yLCByZXN1bHQpID0+IHtcbiAgICAgICAgaWYgKGVycm9yKXtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZ2V0IGNvaW4gc3RhdHMgZXJyb3I6ICVvXCIsIGVycm9yKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNle1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJnZXQgY29pbiBzdGF0cyBvazogJW9cIiwgcmVzdWx0KVxuICAgICAgICB9XG4gICAgfSk7XG59XG5cbmFnZ3JlZ2F0ZUhvdXJseSA9ICgpID0+e1xuICAgIC8vIGRvaW5nIHNvbWV0aGluZyBldmVyeSBob3VyXG4gICAgTWV0ZW9yLmNhbGwoJ0FuYWx5dGljcy5hZ2dyZWdhdGVCbG9ja1RpbWVBbmRWb3RpbmdQb3dlcicsIFwiaFwiLCAoZXJyb3IsIHJlc3VsdCkgPT4ge1xuICAgICAgICBpZiAoZXJyb3Ipe1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJhZ2dyZWdhdGUgaG91cmx5IGJsb2NrIHRpbWUgZXJyb3I6ICVvXCIsIGVycm9yKVxuICAgICAgICB9XG4gICAgICAgIGVsc2V7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImFnZ3JlZ2F0ZSBob3VybHkgYmxvY2sgdGltZSBvazogJW9cIiwgcmVzdWx0KVxuICAgICAgICB9XG4gICAgfSk7XG59XG5cbmFnZ3JlZ2F0ZURhaWx5ID0gKCkgPT57XG4gICAgLy8gZG9pbmcgc29tdGhpbmcgZXZlcnkgZGF5XG4gICAgTWV0ZW9yLmNhbGwoJ0FuYWx5dGljcy5hZ2dyZWdhdGVCbG9ja1RpbWVBbmRWb3RpbmdQb3dlcicsIFwiZFwiLCAoZXJyb3IsIHJlc3VsdCkgPT4ge1xuICAgICAgICBpZiAoZXJyb3Ipe1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJhZ2dyZWdhdGUgZGFpbHkgYmxvY2sgdGltZSBlcnJvcjogJW9cIiwgZXJyb3IpXG4gICAgICAgIH1cbiAgICAgICAgZWxzZXtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiYWdncmVnYXRlIGRhaWx5IGJsb2NrIHRpbWUgb2s6ICVvXCIsIHJlc3VsdClcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgTWV0ZW9yLmNhbGwoJ0FuYWx5dGljcy5hZ2dyZWdhdGVWYWxpZGF0b3JEYWlseUJsb2NrVGltZScsIChlcnJvciwgcmVzdWx0KSA9PiB7XG4gICAgICAgIGlmIChlcnJvcil7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImFnZ3JlZ2F0ZSB2YWxpZGF0b3JzIGJsb2NrIHRpbWUgZXJyb3I6ICVvXCIsIGVycm9yKVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJhZ2dyZWdhdGUgdmFsaWRhdG9ycyBibG9jayB0aW1lIG9rOiAlb1wiLCByZXN1bHQpO1xuICAgICAgICB9XG4gICAgfSlcbn1cblxuXG5cbk1ldGVvci5zdGFydHVwKGFzeW5jIGZ1bmN0aW9uKCl7XG4gICAgaWYgKE1ldGVvci5pc0RldmVsb3BtZW50KXtcbiAgICAgICAgcHJvY2Vzcy5lbnYuTk9ERV9UTFNfUkVKRUNUX1VOQVVUSE9SSVpFRCA9IDA7XG4gICAgICAgIGltcG9ydCBERUZBVUxUU0VUVElOR1NKU09OIGZyb20gJy4uL2RlZmF1bHRfc2V0dGluZ3MuanNvbidcbiAgICAgICAgT2JqZWN0LmtleXMoREVGQVVMVFNFVFRJTkdTSlNPTikuZm9yRWFjaCgoa2V5KSA9PiB7XG4gICAgICAgICAgICBpZiAoTWV0ZW9yLnNldHRpbmdzW2tleV0gPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKGBDSEVDSyBTRVRUSU5HUyBKU09OOiAke2tleX0gaXMgbWlzc2luZyBmcm9tIHNldHRpbmdzYClcbiAgICAgICAgICAgICAgICBNZXRlb3Iuc2V0dGluZ3Nba2V5XSA9IHt9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgT2JqZWN0LmtleXMoREVGQVVMVFNFVFRJTkdTSlNPTltrZXldKS5mb3JFYWNoKChwYXJhbSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChNZXRlb3Iuc2V0dGluZ3Nba2V5XVtwYXJhbV0gPT0gdW5kZWZpbmVkKXtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKGBDSEVDSyBTRVRUSU5HUyBKU09OOiAke2tleX0uJHtwYXJhbX0gaXMgbWlzc2luZyBmcm9tIHNldHRpbmdzYClcbiAgICAgICAgICAgICAgICAgICAgTWV0ZW9yLnNldHRpbmdzW2tleV1bcGFyYW1dID0gREVGQVVMVFNFVFRJTkdTSlNPTltrZXldW3BhcmFtXVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgaWYgKE1ldGVvci5zZXR0aW5ncy5kZWJ1Zy5zdGFydFRpbWVyKXtcbiAgICAgICAgdGltZXJDb25zZW5zdXMgPSBNZXRlb3Iuc2V0SW50ZXJ2YWwoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIGdldENvbnNlbnN1c1N0YXRlKCk7XG4gICAgICAgIH0sIE1ldGVvci5zZXR0aW5ncy5wYXJhbXMuY29uc2Vuc3VzSW50ZXJ2YWwpO1xuXG4gICAgICAgIHRpbWVyQmxvY2tzID0gTWV0ZW9yLnNldEludGVydmFsKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICB1cGRhdGVCbG9jaygpO1xuICAgICAgICB9LCBNZXRlb3Iuc2V0dGluZ3MucGFyYW1zLmJsb2NrSW50ZXJ2YWwpO1xuXG4gICAgICAgIHRpbWVyVHJhbnNhY3Rpb25zID0gTWV0ZW9yLnNldEludGVydmFsKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICB1cGRhdGVUcmFuc2FjdGlvbnMoKTtcbiAgICAgICAgfSwgTWV0ZW9yLnNldHRpbmdzLnBhcmFtcy50cmFuc2FjdGlvbnNJbnRlcnZhbCk7XG5cbiAgICAgICAgdGltZXJDaGFpbiA9IE1ldGVvci5zZXRJbnRlcnZhbChmdW5jdGlvbigpe1xuICAgICAgICAgICAgdXBkYXRlQ2hhaW5TdGF0dXMoKTtcbiAgICAgICAgfSwgTWV0ZW9yLnNldHRpbmdzLnBhcmFtcy5zdGF0dXNJbnRlcnZhbCk7XG5cbiAgICAgICAgaWYgKE1ldGVvci5zZXR0aW5ncy5wdWJsaWMubW9kdWxlcy5nb3Ype1xuICAgICAgICAgICAgdGltZXJQcm9wb3NhbCA9IE1ldGVvci5zZXRJbnRlcnZhbChmdW5jdGlvbiAoKXtcbiAgICAgICAgICAgICAgICBnZXRQcm9wb3NhbHMoKTtcbiAgICAgICAgICAgIH0sIE1ldGVvci5zZXR0aW5ncy5wYXJhbXMucHJvcG9zYWxJbnRlcnZhbCk7XG5cbiAgICAgICAgICAgIHRpbWVyUHJvcG9zYWxzUmVzdWx0cyA9IE1ldGVvci5zZXRJbnRlcnZhbChmdW5jdGlvbiAoKXtcbiAgICAgICAgICAgICAgICBnZXRQcm9wb3NhbHNSZXN1bHRzKCk7XG4gICAgICAgICAgICB9LCBNZXRlb3Iuc2V0dGluZ3MucGFyYW1zLnByb3Bvc2FsSW50ZXJ2YWwpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGltZXJNaXNzZWRCbG9jayA9IE1ldGVvci5zZXRJbnRlcnZhbChmdW5jdGlvbigpe1xuICAgICAgICAgICAgdXBkYXRlTWlzc2VkQmxvY2tzKCk7XG4gICAgICAgIH0sIE1ldGVvci5zZXR0aW5ncy5wYXJhbXMubWlzc2VkQmxvY2tzSW50ZXJ2YWwpO1xuXG4gICAgICAgIHRpbWVyRmV0Y2hLZXliYXNlID0gTWV0ZW9yLnNldEludGVydmFsKGZ1bmN0aW9uICgpe1xuICAgICAgICAgICAgZmV0Y2hLZXliYXNlKCk7XG4gICAgICAgIH0sIE1ldGVvci5zZXR0aW5ncy5wYXJhbXMua2V5YmFzZUZldGNoaW5nSW50ZXJ2YWwpO1xuXG4gICAgICAgIC8vIHRpbWVyRGVsZWdhdGlvbiA9IE1ldGVvci5zZXRJbnRlcnZhbChmdW5jdGlvbigpe1xuICAgICAgICAvLyAgICAgZ2V0RGVsZWdhdGlvbnMoKTtcbiAgICAgICAgLy8gfSwgTWV0ZW9yLnNldHRpbmdzLnBhcmFtcy5kZWxlZ2F0aW9uSW50ZXJ2YWwpO1xuXG4gICAgICAgIHRpbWVyQWdncmVnYXRlID0gTWV0ZW9yLnNldEludGVydmFsKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBsZXQgbm93ID0gbmV3IERhdGUoKTtcbiAgICAgICAgICAgIGlmICgobm93LmdldFVUQ1NlY29uZHMoKSA9PSAwKSl7XG4gICAgICAgICAgICAgICAgYWdncmVnYXRlTWludXRlbHkoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKChub3cuZ2V0VVRDTWludXRlcygpID09IDApICYmIChub3cuZ2V0VVRDU2Vjb25kcygpID09IDApKXtcbiAgICAgICAgICAgICAgICBhZ2dyZWdhdGVIb3VybHkoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKChub3cuZ2V0VVRDSG91cnMoKSA9PSAwKSAmJiAobm93LmdldFVUQ01pbnV0ZXMoKSA9PSAwKSAmJiAobm93LmdldFVUQ1NlY29uZHMoKSA9PSAwKSl7XG4gICAgICAgICAgICAgICAgYWdncmVnYXRlRGFpbHkoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgMTAwMClcbiAgICB9XG59KTsiXX0=
