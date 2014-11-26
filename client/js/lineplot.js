/* jshint undef: true, strict:false, trailing:false, unused:false, quotmark:false */
/* global require, exports, console, process, module, L, angular, _, jQuery, window, document, Image, Backbone, syncedStorageGUID, Parallel, d3 */

angular.module('bones') 
	.directive('lineplot', function() { 
		return {
			restrict:'E',
			scope:{ data:'=' },
			replace:true,
			template:'<svg class="lineplot"></svg>',
			controller:function($scope, $element, utils) {
				// Generate a Bates distribution of 10 random variables.
				var u = utils,
					svg = d3.select($element[0]),
					N = 40,
					values = [];	// main data

				var margin = {top: 20, right: 0, bottom: 20, left: 0},
					width = $element.width(),
					height = $element.height(),
				    x = d3.scale.linear().domain([N,0]).range([margin.left,width-margin.right]),
				    y = d3.scale.linear().range([height - margin.bottom, margin.top]),
				    draw = function() {
				    	if (!values.length) { return; }
						width = $element.width();
						height = $element.height();
					    x = d3.scale.linear().domain([N,0]).range([margin.left,width-margin.right]);
					    y = d3.scale.linear().range([height - margin.bottom, margin.top]);
						var xAxis = d3.svg.axis().scale(x).orient("bottom"),
							yAxis = d3.svg.axis().scale(y).orient("left"),
						    line = d3.svg.line()
						    	.interpolate('basis')
						    	.x(function(d,i) { return x(i); })
							    .y(function(d) { return y(d); });

						y.domain([0, d3.max(values)]);

						svg.selectAll('.line').data([0])
							.enter().append("path").attr('class', 'line');

						svg.selectAll('.line').datum(values)
					       .attr("class", "line")
					       .transition()
					       .duration(600)
					       .attr("d", line);

						svg.selectAll('y axis')
							.append("g")
						    .attr("class", "y axis")
						    .call(yAxis);					      
					};

					$scope.$watch('data', function(d) {
						if (d !== undefined) {
							// console.log('width ', width);
							values.push(d);
							if (values.length > N) { values.shift();	}
							draw();
						}
						// console.log('parent height ', $element.parent().height());
						$element.height($element.parent().height());
						$element.width($element.parent().width());						
					});
				console.log('lineplot component width ', width, height);
				window.$hs = $scope;
			}	
		};
	});
