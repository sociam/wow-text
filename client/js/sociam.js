/* jshint undef: true, strict:false, trailing:false, unused:false, quotmark:false */
/* global io, require, exports, console, process, module, L, angular, _, jQuery, window, document, Image, Backbone, syncedStorageGUID, Parallel */

// SOCIAM logo

angular.module('bones',[]) 
    .controller('main', function($scope,utils) {
        var u = $scope.u = utils, 
            sa = function(f) { return utils.safeApply($scope,f); },
            letters = $scope.letters = 'SOCIAM',
            i = $scope.i = 0,
            pause = true;

            // window.setInterval(function() { 
            //     console.log("scope > ", $scope.i);                
            //     sa(function() { $scope.i++;  });
            // }, 100);

            window.setInterval(function() { 
                pause = !pause;
            }, 5000*Math.random()+500);

            var update = function() { 
                sa(function() { if (!pause) { $scope.i++; } });
                window.setTimeout(update, 1); // Math.round(t));
            };
            update();
        });
