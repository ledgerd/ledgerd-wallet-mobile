// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'starter.services' is found in services.js
// 'starter.controllers' is found in controllers.js
angular.module('starter', ['ionic', 'starter.controllers', 'starter.services'])

.run(function($ionicPlatform) {
  $ionicPlatform.ready(function() {
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    if (window.cordova && window.cordova.plugins && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
      cordova.plugins.Keyboard.disableScroll(true);

    }
    if (window.StatusBar) {
      // org.apache.cordova.statusbar required
      StatusBar.styleDefault();
    }
  });
})

.config(function($stateProvider, $urlRouterProvider) {

  // Ionic uses AngularUI Router which uses the concept of states
  // Learn more here: https://github.com/angular-ui/ui-router
  // Set up the various states which the app can be in.
  // Each state's controller can be found in controllers.js
  $stateProvider

    // setup an abstract state for the tabs directive
    .state('auth', {
      url: '/auth',
      abstract: true,
      templateUrl: 'templates/auth.html'
    })

    .state('auth.open', {
      url: '/open',
      views: {
        'auth-open': {
          templateUrl: 'templates/auth-open.html',
          controller: 'OpenCtrl'
        }
      }
    })

  // setup an abstract state for the tabs directive
    .state('payment', {
    url: '/payment',
    abstract: true,
    templateUrl: 'templates/payment.html',
  })

  // Each tab has its own nav history stack:

  .state('payment.dash', {
    url: '/dash',
      cache: false,
    views: {
      'payment': {
        templateUrl: 'templates/payment-dash.html',
        controller: 'DashCtrl'
      }
    }
  })

    .state('payment.input', {
      url: '/input/:address',
      views: {
        'payment': {
          templateUrl: 'templates/payment-input.html',
          controller: 'InputCtrl'
        }
      }
    })

    .state('payment.transaction',{
      url:'/transaction',
      views:{
        'payment':{
          templateUrl: 'templates/payment-transaction.html',
          controller: 'TransactionCtrl'
        }
      }
    })

  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/payment/dash');

});
