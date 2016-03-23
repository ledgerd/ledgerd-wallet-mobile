angular.module('starter.controllers', ['ionic'])

  .controller('OpenCtrl', function($scope,$location) {
    if(localStorage.getItem('publicKey')){
      $location.path('/payment/dash');
    }
    $scope.openWallet = function(){
      $scope.publicKey = (new RippleAddress($scope.privateKey)).getAddress();
      localStorage.setItem('publicKey',$scope.publicKey);
      localStorage.setItem('privateKey',$scope.privateKey);
      $location.path('/payment/dash');
    }
  })

.controller('DashCtrl', function($scope,$location,$state) {
    //如果未登录跳转到登录
    if(!localStorage.getItem('publicKey')){
      $location.path('/auth/open');
    }
    //退出登录
    $scope.logout = function(){
      localStorage.removeItem('publicKey');
      localStorage.removeItem('privateKey');
      $location.path('/auth/open');
    }

    $scope.publicKey = localStorage.getItem('publicKey');
    new QRCode(document.getElementById("qrcode"),{
      text:$scope.publicKey,
      width: 200,
      height: 200,
      colorDark : "#333333",
      colorLight : "#ffffff",
    });

    //获取账户余额
    conn.then(function(){
      api.getServerInfo().then(function(info){
        api.getBalances($scope.publicKey,{ledgerVersion:info.validatedLedger.ledgerVersion-1}).then(function(balances) {
          var items = [];
          balances.forEach(function (balance) {
            var index = -1;
            for(i=0;i<items.length;i++){
              if(items[i].currency == balance.currency){
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
          console.log(items);
        })
      })
    });

    //向他人付款功能
    $scope.scanPayment=function(){
      cordova.plugins.barcodeScanner.scan(
        function (result) {
          if(!result.cancelled){
            $state.go('payment.input',{address:result.text})
          }
        },
        function (error) {
          alert("扫描失败: " + error);
        }
      );
      //$location.path('/payment/input');
    }
  })

  .controller('InputCtrl',function($scope,$location,$stateParams,$ionicLoading) {
    $scope.send = {};
    $scope.send.address = $stateParams.address;
    $scope.send.value= '1';
    var xrpAmount={
      currency: 'XRP',
      value: $scope.send.value
    }
    $scope.send.amount=xrpAmount;
    $scope.amount = [];
    $scope.amount.push(xrpAmount);
    //var send = $scope.send;

    //计算要支付货币的路径
    $scope.findPath = function () {
      $scope.status_text='计算支付路径...';
      $ionicLoading.show({template: '正在计算支付路径...'});
      var findpath = {
        source: {
          address: localStorage.getItem('publicKey')
        },
        destination: {
          address: $scope.send.address,
          amount: {
            currency:$scope.send.amount.currency,
            value:$scope.send.amount.value
          }
        }
      }
      if($scope.send.amount.counterparty){
        findpath.destination.amount.counterparty=$scope.send.amount.counterparty;
      }
      api.getPaths(findpath).then(function (pass, fail) {
        $scope.status_text='';
        $ionicLoading.hide();
        console.log('path',pass);
        $scope.paths=pass;
      });
    }

    $scope.updateAddress = function () {
      //if (!send.address)return;
      $scope.findPath();
    }

    $scope.updateValue = function () {
      //if (!send.value)return;
      $scope.findPath();
    }

    $scope.updateCurrency = function () {
      $scope.findPath();
    }

    //获取服务器信息以查询对方要可接收的货币
    $scope.status_text='查询可接收币种...';
    $ionicLoading.show({template: '正在查询可接收币种...'});
    conn.then(function(){
      $scope.status_text='成功连接到支付网络！';
      $ionicLoading.show({template: '成功连接到支付网络！'});
      api.getServerInfo().then(function(info){
        $scope.status_text='成功获取服务器信息，开始查询信任线...';
        $ionicLoading.show({template: '成功获取服务器信息，开始查询信任线...'});
        api.getTrustlines($scope.send.address,{ledgerVersion:info.validatedLedger.ledgerVersion-1}).then(function (trustlines) {
          $scope.status_text='成功获取到信任线！';
          $ionicLoading.show({template: '成功获取到信任线！'});
          //console.log('trustlines',trustlines);
          trustlines.forEach(function (trustline) {
            $scope.amount.push({
              currency: trustline.specification.currency,
              counterparty: trustline.specification.counterparty,
              value: $scope.send.value,
            })
          });
          $scope.findPath();
        });
      })
    });

    $scope.pay=function(path){
      const payment = {
        source: fund.source,
        destination: fund.destination
      };
      $ionicLoading.show({template: '转账中...'});
      api.preparePayment(localStorage.getItem('publicKey'), payment).then(function(prepared){
        var signed = api.sign(prepared.txJSON,localStorage.getItem('privateKey'));
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
    $scope.publicKey = localStorage.getItem('publicKey');
    $ionicLoading.show({template: '查询中...'});
    conn.then(function() {
      api.getServerInfo().then(function(info) {
        api.getTransactions(localStorage.getItem('publicKey'), {
          //maxLedgerVersion:info.validatedLedger.ledgerVersion-1,
          minLedgerVersion:info.validatedLedger.ledgerVersion-680000,
          types: ['payment']
        }).then(function (transactions) {
          $ionicLoading.hide();
          $scope.items = transactions;
          console.log(transactions);
        });
      });
    });
  });
