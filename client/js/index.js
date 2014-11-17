/* jshint undef: true, strict:false, trailing:false, unused:false, quotmark:false */
/* global io, require, exports, console, process, module, L, angular, _, jQuery, window, document, Image, Backbone, syncedStorageGUID, Parallel */

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
            process:function(json_arr) { 
                return json_arr.map(function(json) { 
                    var tokens = json.text.trim()                
                            .split(/[\s\.,\!\?]/) //  .split(' ')
                            .map(function(x) { return x.trim(); })
                            .filter(function(x) { return x.length > 0; }),
                        hashtags = tokens.filter(function(x) { return x.indexOf('#') === 0; }),
                        ats = tokens.filter(function(x) { return x.indexOf('@') === 0; }),
                        author = json.user && json.user.screen_name;
                    // count the hashtags
                    return { 
                        chars : Math.min(140,json.text.length),
                        tokens : tokens.length,
                        hashtags : hashtags,                    
                        nhashtags : hashtags.length,
                        ats : ats,
                        authors : [author]
                    };
                });
            },
            reduce:function(results) {
                var single_merge = function(d0, d1) {
                    return dict(Object.keys(d0).map(function(k) { 
                        var v0 = d0[k], v1 = d1[k],
                            type = typeof v0;
                        if (type == 'object' && v0.length !== undefined) { return [ k, uniqstr(v0.concat(v1)) ]; }
                        if (type == 'number') { return [ k, v0 + v1 ]; }
                        return 0;
                    }));
                };
                return results.reduce(function(a,b) { return single_merge(a,b); });
            }
        };
    }).controller('main', function($scope,utils,mysocket,wikiproc,twitterproc) { 
        var u = $scope.u = utils, 
            sa = function(f) { return utils.safeApply($scope,f); },
            uniqstr = function uniqstr(L) {
                var o = {}, i, l = L.length, r = [];
                for(i=0; i<l;i+=1) { o[L[i]] = L[i]; }
                for(i in o) { r.push(o[i]); }
                return r;
            },
            dict = function dict(pairs) { var o = {};    pairs.map(function(pair) { o[pair[0]] = pair[1]; }); return o; },
            PARALLEL_ARGS = {  maxWorkers:4   };

        var sources = $scope.sources = {
                twitter: {
                    src:'twitter_hose',
                    processor:twitterproc.process,
                    reduce:twitterproc.reduce
                }
            },
            window_size = 200;

        _(sources).values().map(function(s) { 
            s.count = 0; s.queue = []; 
            s.register = [];
            s.computed = [];
            s.stats_history = [];
        });
        mysocket.addListener("spinn3r_hose", function (data) { 
            // if (sources.twitter.count > window_size+1) { return; }
            $scope.$apply(function() { sources.twitter.count++; });            
            data = JSON.parse(data.data);            
            sources.twitter.queue.push(data);

            // update of display
            sources.twitter.register.push(data);
            if (sources.twitter.register.length > window_size) { 
                sources.twitter.register.shift();  
            }

            if (sources.twitter.queue.length >= window_size) {
                var workpile = sources.twitter.queue.splice(0,window_size),
                    n = workpile.length,
                    pl = new Parallel(workpile, PARALLEL_ARGS);
                // sources.twitter.queue = [];
                pl.spawn(sources.twitter.processor).then(function(xc) { 
                    sources.twitter.computed = xc.concat();
                    new Parallel(xc, PARALLEL_ARGS)
                        .require(dict)
                        .require(uniqstr)
                        .spawn(sources.twitter.reduce)
                        .then(function(stats) { 
                            console.log('stats ', stats);
                            var out = {
                                n: n,
                                hashtags:stats.hashtags,
                                ats:stats.ats,
                                authors : stats.authors,
                                chars : stats.chars,
                                tokens : stats.tokens,
                                avg_tokens : stats.tokens/n,                            
                                avg_chars : stats.chars/n,
                            };
                            // console.log('stats authors ', stats.authors, stats.authors.length);
                            // console.log('out -- ', out);
                            // out.hashtags.sort();
                            // out.ats.sort();
                            // out.authors.sort();
                            out.avg_ats = out.ats.length/n;
                            out.avg_hashtags = out.hashtags.length/n;
                            $scope.$apply(function() { sources.twitter.stats = out;  });
                    });
                });
            }
            window.s = $scope;
        });
    });
