/* jshint undef: true, strict:false, trailing:false, unused:false, quotmark:false */
/* global io, require, exports, console, process, module, L, angular, _, jQuery, window, document, Image, Backbone, syncedStorageGUID, Parallel */

angular.module('bones').factory('mysocket', function (socketFactory) {
    var myIoSocket = io.connect('http://localhost:3000/'),
        socket = socketFactory({ ioSocket: myIoSocket });
    return socket;
});