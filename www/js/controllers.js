angular.module('starter.controllers', ['ionic','monospaced.qrcode'])

  .controller('OpenCtrl', function($scope,$state,$ionicPopup) {
    if(localStorage.getItem('secret') && localStorage.getItem('address')){
      $state.go('payment.dash');
    }else {
      $scope.openWallet = function (account) {
        console.log(account);
        try {
          var address = (new RippleAddress(account.secret)).getAddress();
          localStorage.setItem('address', address);
          localStorage.setItem('secret', account.secret);
          $state.go('payment.dash');
        }catch(ex){
          $ionicPopup.alert({
            title: '错误',
            template: '请输入正确的密钥'
          });
        }
      }
    }
  })

  .controller('CreateCtrl',function($scope,$state,$ionicPopup) {
    if (localStorage.getItem('address')) {
      $state.go('payment.dash');
    } else {
      //生成secret和address
      $scope.ledgerd = api.generateAddress();
      $scope.openWallet = function () {
        localStorage.setItem('address', $scope.ledgerd.address);
        localStorage.setItem('secret', $scope.ledgerd.secret);
        $state.go('payment.dash');
      }

      $scope.copyLedgerd = function(text){

      }
    }
  })

.controller('DashCtrl', function($scope,$state,$ionicLoading,$timeout,$ionicPopup) {
    //如果未登录跳转到登录
    if(!localStorage.getItem('secret')){
      $state.go('open');
    }else {
      //退出登录
      $scope.logout = function () {
        localStorage.removeItem('secret');
        localStorage.removeItem('address');
        $state.go('open');
      }

      var account = {
        address : localStorage.getItem('address'),
        secret : localStorage.getItem('secret')
      };
      $scope.account = account;

      $scope.copyAddress = function(){

      }

      //获取账户余额
      $scope.items = [];
      $ionicLoading.show({template: '查询余额...'});
      conn.then(function () {
        api.getServerInfo().then(function (info) {
          api.getBalances(account.address, {ledgerVersion: info.validatedLedger.ledgerVersion - 1}).then(function (balances) {
            var items = [];
            balances.forEach(function (balance) {
              var index = -1;
              for (i = 0; i < items.length; i++) {
                if (items[i].currency == balance.currency) {
                  index = i;
                  break;
                }
              }
              //var index = items.indexOf(balance.currency);
              if (index == -1) {//如果不含同种币
                var item = {
                  currency: balance.currency,
                  fund: Number(balance.value),
                  banks: [{
                    value: balance.value,
                    counterparty: balance.counterparty
                  }]
                }
                items.push(item);
              } else {//已经存在同种币
                var item = items[index];
                item.fund += Number(balance.value);
                item.banks.push({
                  value: balance.value,
                  counterparty: balance.counterparty
                });
              }
            });//forEach
            $scope.items = items;
            $ionicLoading.hide();
            console.log(items);
          }).catch($ionicLoading.hide());
        })
      });

      //向他人付款功能
      $scope.scanPayment = function () {
        //$state.go('payment.input',{address:'rGyr8CauR458A1efcVLHV5Bcs9PaiEVEJt'});//亿石的总账号
        //$state.go('payment.input',{address:'rEDQGsaPTNKMp9JomYhKsVS7VCjSaGaPWu'});//雍自飞
        if ($scope.items.length) {
          cordova.plugins.barcodeScanner.scan(
            function (result) {
              if (!result.cancelled) {
                $state.go('payment.input', {address: result.text})
              }
            },
            function (error) {
              $ionicPopup.alert({
                title: '扫描失败',
                template: error
              });
            }
          );
        } else {
          $ionicPopup.alert({
            title: '失败',
            template: '账户余额不足，无法进行支付'
          });
        }
      }
    }
  })

  .controller('InputCtrl',function($scope,$location,$stateParams,$ionicLoading) {
    $scope.send = {};
    $scope.send.address = $stateParams.address;
    var lgdAmount={
      currency: 'LGD',
      value: $scope.send.value
    }
    $scope.send.amount=lgdAmount;
    $scope.amount = [];
    $scope.amount.push(lgdAmount);

    //计算要支付货币的路径
    $scope.findPath = function () {
      if ($scope.send.value > 0) {
        $scope.status_text = '计算支付路径...';
        $ionicLoading.show({template: '正在计算支付路径...'});
        var findpath = {
          source: {
            address: localStorage.getItem('address')
          },
          destination: {
            address: $scope.send.address,
            amount: {
              currency: $scope.send.amount.currency,
              value: $scope.send.value
            }
          }
        }
        if ($scope.send.amount.counterparty) {
          findpath.destination.amount.counterparty = $scope.send.amount.counterparty;
        }
        api.getPaths(findpath).then(function (pass, fail) {
          $ionicLoading.hide();
          console.log('path', pass);
          $scope.paths = pass;
        }).catch(function(e){
          $scope.paths = [];
          $ionicLoading.hide();
        });
      }
    }

    //获取服务器信息以查询对方要可接收的货币
    $scope.active=false;
    $ionicLoading.show({template: '正在查询可接收币种...'});
    conn.then(function(){
      api.getServerInfo().then(function(info){
        $ionicLoading.show({template: '成功获取服务器信息，开始查询信任线...'});
        api.getTrustlines($scope.send.address,{ledgerVersion:info.validatedLedger.ledgerVersion-1}).then(function (trustlines) {
          $ionicLoading.show({template: '成功获取到信任线！'});
          trustlines.forEach(function (trustline) {
            $scope.amount.push({
              currency: trustline.specification.currency,
              counterparty: trustline.specification.counterparty,
              value: $scope.send.value,
            })
          });
          $scope.serverInfo = info;
          $scope.active=true;
        }).catch(function (e) {
          $ionicLoading.hide();
        });
        $scope.findPath();
      })
    });

    $scope.pay=function(path){
      const payment = {
        source: path.source,
        destination: path.destination
      };
      $ionicLoading.show({template: '转账中...'});
      api.preparePayment(localStorage.getItem('address'), payment).then(function(prepared){
        var signed = api.sign(prepared.txJSON,localStorage.getItem('secret'));
        api.submit(signed.signedTransaction).then(function(result){
          if(result.resultCode == 'tesSUCCESS'){
            $ionicLoading.hide();
            alert('转账成功！');
            $location.path('/payment/dash');
          }else{
            $ionicLoading.hide();
            alert(result.resultCode+'->'+ result.resultMessage);
          }
        });
      });
    }
  })
  .controller('TransactionCtrl',function($scope,$ionicLoading,$ionicHistory,$state){

    $scope.address = localStorage.getItem('address');
    $ionicLoading.show({template: '查询中...'});
    conn.then(function() {
      api.getLedger().then(function(ledger){
        console.log(ledger);
        api.getTransactions(localStorage.getItem('address'), {
          maxLedgerVersion:ledger.ledgerVersion,
          minLedgerVersion:1,
          types: ['payment']
        }).then(function (transactions) {
          $ionicLoading.hide();
          $scope.items = transactions;
          console.log(transactions);
        });
      });
    });
  });
