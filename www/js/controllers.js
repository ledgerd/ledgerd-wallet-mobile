angular.module('starter.controllers', [])

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

.controller('DashCtrl', function($scope,$location) {
    if(!localStorage.getItem('publicKey')){
      $location.path('/auth/open');
    }

    $scope.logout = function(){
      localStorage.removeItem('publicKey');
      localStorage.removeItem('privateKey');
      $location.path('/auth/open');
    }

    $scope.publicKey = localStorage.getItem('publicKey');
    new QRCode(document.getElementById("qrcode"),{
      text:localStorage.getItem('publicKey'),
      width: 128,
      height: 128,
      colorDark : "#333333",
      colorLight : "#ffffff",
    });

    $scope.scanPayment=function(){
      //cordova.plugins.barcodeScanner.scan(
      //  function (result) {
      //    alert("We got a barcode\n" +
      //      "Result: " + result.text + "\n" +
      //      "Format: " + result.format + "\n" +
      //      "Cancelled: " + result.cancelled);
      //  },
      //  function (error) {
      //    alert("Scanning failed: " + error);
      //  }
      //);
      $location.path('/payment/input');
    }
  })

  .controller('InputCtrl',function($scope,$location) {
    $scope.send = {};
    $scope.send.address = 'rUBJSUTZRniy9Kpg4ZPKXFQHB5o19ZTFtM';
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
      $scope.findpath_text='计算支付路径...';
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
        $scope.findpath_text='';
        console.log('path',pass);
        $scope.funds=pass;
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
    conn.then(function(){
      $scope.status_text='成功连接服务器';
      api.getServerInfo().then(function(info){
        $scope.status_text='成功获取服务器信息，开始查询信任线';
        api.getTrustlines($scope.send.address,{ledgerVersion:info.validatedLedger.ledgerVersion-1}).then(function (trustlines) {
          $scope.status_text='成功获取到信任线';
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
    })

    $scope.pay=function(fund){

    }
  });
