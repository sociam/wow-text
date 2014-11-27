/* jshint undef: true, strict:false, trailing:false, unused:false, quotmark:false */
/* global io, require, exports, console, process, module, L, angular, _, jQuery, window, document, Image, Backbone, syncedStorageGUID, Parallel */

angular.module('bones', ['btford.socket-io']) 
    .factory('lang', function(utils) { 
    	var ds = {},
    		u = utils,
    		srcs = { en : 'data/wordsEn.txt' };
    	return {
    		getDict: function(lang)  {
    			if (ds[lang]) { return u.dresolved(ds[lang]); }
				var d = u.deferred();
				if (!srcs[lang]) { throw new Error('No source for language ', lang, srcs); } 
				var dcounts = ds[lang] = {};
				d3.csv(srcs[lang]).row(function(d) { 
                    var word = d.word; dcounts[word] = true; return '';
				}).get(function() {
                    console.info(' dictionary loaded ', lang, ' ', _(ds[lang]).keys().length, ' words ');
					d.resolve(dcounts);
				});
    			return d.promise();
    		}
    	};
    }).factory('twitterproc', function(utils) { 
        return {
            process:function(json_arr) { 
                return json_arr.map(function(json) { 
                    var tokens = (json.text || '').trim()                
                            .split(/[\s\.,\!\?]/) //  .split(' ')
                            .map(function(x) { return x && x.trim() || ''; })
                            .filter(function(x) { return x && x.length > 0; }),
                        hashtags = tokens.filter(function(x) { return x && x.indexOf('#') === 0; }),
                        // ats = tokens.filter(function(x) { return x && x.indexOf('@') === 0; }),
                        links = tokens.filter(function(x) { return x && x.indexOf('http') === 0; }),
                        // author = json.user && json.user.screen_name,
                        eng_words = tokens.filter(function(x) { return x && global.env.eng[x.toLowerCase().trim()]; }),
                        eng_ratio = eng_words.length/(1.0*(tokens.length || 1)),
                        atmsg = (json.text || '').indexOf('@') == 0,
                        is_eng = eng_ratio > 0.2;
                    return { 
                        text:json.text || '',
                        chars : Math.min(140,json.text && json.text.length || 0),
                        tokens : tokens && tokens.length || 0,
                        hashtags : hashtags,                    
                        nlinks : links && links.length || 0,
                        nhashtags : hashtags && hashtags.length || 0,
                        // ats : ats,
                        atmsg : atmsg,
                        // authors : [author],
                        is_eng: is_eng ? 1 : 0
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
    }).controller('main', function($scope,utils,mysocket,twitterproc,lang) { 
        var u = $scope.u = utils, 
            sa = function(f) { return utils.safeApply($scope,f); },
            ncols = $scope.ncols = 12,
            nrows = $scope.nrows = 15,
            uniqstr = function uniqstr(L) {
                var o = {}, i, l = L.length, r = [];
                for(i=0; i<l;i+=1) { o[L[i]] = L[i]; }
                for(i in o) { r.push(o[i]); }
                return r;
            },
            dict = function dict(pairs) { var o = {};    pairs.map(function(pair) { o[pair[0]] = pair[1]; }); return o; };

        lang.getDict('en').then(function(eng) { 
            // console.log('eng is -- ', eng);
            var sources = $scope.sources = {
                    twitter: {
                        src:'twitter_hose',
                        processor:twitterproc.process,
                        reduce:twitterproc.reduce
                    }
                },
                window_size = 350,
                i = $scope.i = 0;

            _(sources).values().map(function(s) { 
                s.count = 0; s.queue = []; 
                s.computed = [];
            });
            mysocket.addListener("spinn3r_hose", function (data) { 
                // if (sources.twitter.count > window_size+1) { return; }
                $scope.$apply(function() { sources.twitter.count++; });            
                data = JSON.parse(data.data);            
                sources.twitter.queue.push(data);
                if (sources.twitter.queue.length >= window_size) {
                    var workpile = sources.twitter.queue.splice(0,window_size),
                        n = workpile.length,
                        pl = new Parallel(workpile, { env : { eng: eng } });
                    pl.spawn(sources.twitter.processor).then(function(xc) { 
                        // console.log(xc.map(function(x) { return x.nlinks; }));
                        sa(function() { 
                            var todel = sources.twitter.computed.length >= nrows * ncols ? nrows*ncols : 0;
                            // sources.twitter.computed.splice.apply(sources.twitter.computed,
                            //     [i,todel].concat(xc));
                            // i += xc.length;
                            // i = i % nrows * ncols;
                            sources.twitter.computed = sources.twitter.computed.concat(xc).slice(-nrows*ncols);
                            // console.log(sources.twitter.computed.length);
                        });
                    });
                }
                window.s = $scope;
            });
        });
    });
