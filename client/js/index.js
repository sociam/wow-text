/* jshint undef: true, strict:false, trailing:false, unused:false, quotmark:false */
/* global require, exports, console, process, module, L, angular, _, jQuery, window, document, Image, Backbone, syncedStorageGUID, Parallel */

angular.module('bones', ['btford.socket-io']) 
    .controller('main', function($scope, $rootScope) { 
    }).run(function() {}).factory('mysocket', function (socketFactory) {
        var myIoSocket = io.connect('http://localhost:3000/'),
            socket = socketFactory({ ioSocket: myIoSocket });
        return socket;
    }).factory('wikiproc', function() { 
        return {
            process:function(json) { 
                return new Date(json.timestamp); 
            }
        };
    }).factory('twitterproc', function(utils) { 
        return {
            process:function(json) { 
                var tokens = json.text.trim()                
                        .split(' ')
                        .map(function(x) { return x.trim(); })
                        .filter(function(x) { return x.length > 0; }),
                    hashtags = tokens.filter(function(x) { return x.indexOf('#') == 0; }),
                    ats = tokens.filter(function(x) { return x.indexOf('@') == 0; }),
                    author = json.screen_name;
                // count the hashtags
                return { 
                    tokens : tokens.length,
                    hashtags : hashtags,                    
                    nhashtags : hashtags.length,
                    ats : ats,
                    authors : [author]
                };
            },
            reduce:function(results) {
                var d0 = results[0], d1 = results[1];
                return dict(Object.keys(d0).map(function(k) { 
                    var v0 = d0[k], v1 = d1[k];
                        type = typeof v0;
                    if (type == 'object' && v0.length !== undefined) { return [ k, v0.concat(v1) ]; }
                    if (type == 'number') { return [ k, v0 + v1 ]; }
                    return 0;
                }));
            }
        };
    }).controller('main', function($scope,utils,mysocket,wikiproc,twitterproc) { 
        var u = utils, 
            sa = function(f) { return utils.safeApply($scope,f); },
            dict = function dict(pairs) { var o = {};    pairs.map(function(pair) { o[pair[0]] = pair[1]; }); return o; };

        var sources = $scope.sources = {
                wikipedia: { 
                    src: 'wikipedia_hose', 
                    processor: wikiproc.process,
                    reduce:wikiproc.reduce
                },
                twitter: {
                    src:'twitter_hose',
                    processor:twitterproc.process,
                    reduce:twitterproc.reduce
                }
            },
            window_size = 20;

        _(sources).values().map(function(s) { 
            s.count = 0; s.queue = []; 
            s.register = [];
            s.computed = [];
        });
        // mysocket.addListener("wikipedia_hose", function (data) { 
        //     // console.log("wikipedia", data); 
        //     data = JSON.parse(data.data);
        //     sa(function() { sources.wikipedia.count++; });
        //     sources.wikipedia.queue.push(data);
        //     sources.wikipedia.register.push(data);
        //     if (sources.wikipedia.register.length > window_size) { 
        //         sources.wikipedia.register.shift();  
        //     }
        //     if (sources.wikipedia.queue.length >= 8) { 
        //         var pl = new Parallel(sources.wikipedia.queue);
        //         sources.wikipedia.queue = [];
        //         pl.map(sources.wikipedia.processor).then(function(x,d) { 
        //             // console.log('result ! ', x,d);
        //             sources.wikipedia.computed = x;
        //             new Parallel(x).require(dict).reduce(sources.wikipedia.reduce).then(function(x) { 
        //                 console.log('wikipedia stats!: ', x);
        //                 sa(function() { sources.wikipedia.stats = x; });
        //             });
        //         });
        //     }
        // });
        mysocket.addListener("twitter_hose", function (data) { 
            data = JSON.parse(data.data);            
            sa(function() { sources.twitter.count++; });
            sources.twitter.queue.push(data);
            sources.twitter.register.push(data);
            if (sources.twitter.register.length > window_size) { 
                sources.twitter.register.shift();  
            }

            if (sources.twitter.queue.length >= window_size) {
                // console.log('twitter queue ',  sources.twitter.queue);
                var pl = new Parallel(sources.twitter.queue);
                sources.twitter.queue = [];
                pl.map(sources.twitter.processor).then(function(x,d) { 
                    sources.wikipedia.computed = x;
                    new Parallel(x).require(dict).reduce(sources.twitter.reduce).then(function(x) { 
                        console.log('twitter stats!: ', x);
                        sa(function() { 
                            sources.twitter.stats = x; 
                            sources.twitter.stats.hashtags = u.uniqstr(sources.twitter.stats.hashtags);
                            sources.twitter.stats.hashtags.sort();
                            sources.twitter.stats.ats = u.uniqstr(sources.twitter.stats.ats);
                            sources.twitter.stats.ats.sort();
                            sources.twitter.stats.authors = u.uniqstr(sources.twitter.stats.authors);
                            sources.twitter.stats.authors.sort();
                        });
                    });
                });
            }
        });
    });
