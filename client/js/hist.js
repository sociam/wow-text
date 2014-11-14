/* jshint undef: true, strict:false, trailing:false, unused:false, quotmark:false */
/* global require, exports, console, process, module, L, angular, _, jQuery, window, document, Image, Backbone, syncedStorageGUID, Parallel, d3 */

angular.module('bones') 
	.directive('histogram', function() { 
		return {
			restrict:'E',
			scope:{ data:'=', field:'@', xmax:'@' },
			replace:true,
			template:'<div class="hist"></div>',
			controller:function($scope, $element, utils) {
				// Generate a Bates distribution of 10 random variables.
				var formatCount = d3.format(",.0f"),
					ticks = 30,
					svg = d3.select($element[0]).append("svg"),
					hist = [],
					mergeIntoHist = function(src) { 
						console.log('merge into ', src);
						if (hist.length === 0) { 
							hist = src;
						} else {
							_(src).map(function(v,i) { 
								if (!hist[i]) { 
									hist.push(v); 
								} else {
									v.map(function(v) { hist[i].push(v); });	
									hist[i].y += v.y;
								}
							});
						}
						console.log('updated hist >> ', hist.length, hist);
					};	// main data

				var margin = {top: 0, right: 6, bottom: 20, left: 6},
				    width = $element.find('svg').width()  - margin.left - margin.right,
				    height = $element.find('svg').height() - margin.top - margin.bottom,
				    draw = function() { 
						// Generate a histogram using twenty uniformly-spaced bins.
						svg.selectAll('g, rect, text').remove();

						if (!($scope.data && $scope.field)) { return;	}
						var dmax = parseInt($scope.xmax),
							values = $scope.data.map(function(x) { return x[$scope.field]; }), // .filter(function(x) { return x !== undefined && x < dmax; }),						    
						    x = d3.scale.linear().domain([0, dmax]).range([margin.left, margin.left+width]),
							data = d3.layout.histogram().bins(x.ticks(ticks))(values);

						console.log('dmax ', dmax, values);

						// merge data and hist
						console.error('should have 30 slots  >>>>>>>>>>>>>>>>>>>>>>>>>> ', data.length);
						mergeIntoHist(data);
						data = hist;
						window.hd = data;
						// console.log('data >> ', values.length, data);
						// console.log('dmax ', dmax, d3.max(data, function(d) { return d.length; }));

						if (!data.length) { return; }

						var y = d3.scale.linear()
						    .domain([0, d3.max(data, function(d) { return d.length; })])
						    .range([height, 0]);

						var xAxis = d3.svg.axis()
						    .scale(x)
						    .orient("bottom");

						svg.attr("width", width + margin.left + margin.right)
						    .attr("height", height + margin.top + margin.bottom).append("g")
						    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

						var bar = svg.selectAll(".bar")
						    .data(data)
						  .enter().append("g")
						    .attr("class", "bar")
						    .attr("transform", function(d) { return "translate(" + x(d.x) + "," + y(d.y) + ")"; });

						bar.append("rect")
						    .attr("x", 1)
						    .attr("width", x(data[0].dx)-4)
						    .attr("height", function(d) { return height - y(d.y); });

						bar.append("text")
						    .attr("dy", ".6em")
						    .attr("y", 6)
						    .attr("x", (x(data[0].dx)-4) / 2)
						    .attr("text-anchor", "middle")
						    .text(function(d) { return formatCount(d.y); });

						svg.append("g")
						    .attr("class", "x axis")
						    .attr("transform", "translate(0," + height + ")")
						    .call(xAxis);

					};

					$scope.$watchCollection('data', function(d) {
						console.log('data changed ', d);
						draw();
						// var datas = d.map(function(x) { return x[$scope.field]; });
						// console.log('things > ', $scope.field, datas);
					});

				window.$hs = $scope;
			}	
		};
	});
