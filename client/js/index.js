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
                        .split(/[\s\.,\!\?]/) //  .split(' ')
                        .map(function(x) { return x.trim(); })
                        .filter(function(x) { return x.length > 0; }),
                    hashtags = tokens.filter(function(x) { return x.indexOf('#') == 0; }),
                    ats = tokens.filter(function(x) { return x.indexOf('@') == 0; }),
                    author = json.screen_name;
                // count the hashtags
                return { 
                    chars : Math.min(140,json.text.split('').length),
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
        var u = $scope.u = utils, 
            sa = function(f) { return utils.safeApply($scope,f); },
            dict = function dict(pairs) { var o = {};    pairs.map(function(pair) { o[pair[0]] = pair[1]; }); return o; },
            PARALLEL_ARGS = {
                maxWorkers:4
            };

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
            window_size = 5;

        _(sources).values().map(function(s) { 
            s.count = 0; s.queue = []; 
            s.register = [];
            s.computed = [];
            s.stats_history = [];
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
                var n = sources.twitter.queue.length,
                    pl = new Parallel(sources.twitter.queue, PARALLEL_ARGS);
                sources.twitter.queue = [];
                pl.map(sources.twitter.processor).then(function(xc) { 
                    sources.wikipedia.computed = xc;
                    sources.twitter.stats_history = sources.twitter.stats_history.concat(xc); // adding them

                    new Parallel(xc, PARALLEL_ARGS).require(dict).reduce(sources.twitter.reduce).then(function(stats) { 
                        console.log('twitter stats!: ', stats);
                        stats.n = n;
                        stats.hashtags = u.uniqstr(stats.hashtags);
                        stats.hashtags.sort();
                        stats.ats = u.uniqstr(stats.ats);
                        stats.ats.sort();
                        stats.authors = u.uniqstr(stats.authors);
                        stats.authors.sort();

                        stats.avg_chars = stats.chars/n;
                        stats.avg_tokens = stats.tokens/n;
                        stats.avg_hashtags = stats.nhashtags/n;                        
                        stats.avg_ats = stats.ats.length/n;

                        sa(function() { 
                            sources.twitter.stats = stats;
                        });
                    });
                });
            }
            window.s = $scope;
        });
    });
