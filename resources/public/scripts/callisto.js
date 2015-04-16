var dataSource = "http://localhost:3000/data";
//var dataSource =  "test.json";

function drawTimeChart() {
  var tip = d3.tip().attr("class", "d3-tip")
  .html(function(d) {
    return d.from + "<br>" + d.subject;
  });

  var width = 860, height = 500;

  var parseDate = d3.time.format("%Y-%m-%d").parse,
      formatPercent = d3.format(".0%");


  var x = d3.time.scale().range([0,width]);
  var y = d3.scale.linear().range([height,0]);


  var color = d3.scale.category20();


  var timechart = d3.select("body").append("svg")
  .attr("width", width+20)
  .attr("height", height)
  .attr("class", "timechart");

  timechart.call(tip);

  //var bar = svg.selectAll("g").data(static_data)
  //    .enter().append("g")
  //    .attr("transform", function(d, i)
  //         { return "translate(0," + i * barHeight + ")"; });

  //bar.append("rect")
  //    .attr("width", x)
  //    .attr("height", barHeight - 1);

  //bar.append("text")
  //    .attr("x", function(d) { return x(d) - 3; })
  //    .attr("y", barHeight / 2)
  //    .attr("dy", ".35em")
  //    .text(function(d) { return d; });

  d3.json(dataSource, function(error, data) {
    //console.log(data);

    data.data.forEach(function(d) {
      d.date = parseDate(d.date);
      d.senderId = +d.senderId;
      d.color = color(d.senderId);
      d.order = 1;
    });

    data.data.sort(function(a,b) {
      var dateDiff = a.date-b.date;
      if (dateDiff == 0) {
        dateDiff = a.senderId - b.senderId;
      }
      return dateDiff;
    });

    var firstDate = data.data[0].date;
    var lastDate = data.data[data.data.length - 1].date;
    var curDate = firstDate;
    var orderInc = 0;
    data.data.forEach(function(d, i) {
      if (curDate < d.date) {
        orderInc = 0;
        curDate = d.date;
      }
      d.order = d.order + orderInc;
      orderInc = orderInc + 1;
    });

    //x = d3.time.scale().domain([firstDate, lastDate]).range([0,width]);
    //x.domain = d3.extent(data.data, function(d) { return d.date; })
    x = d3.time.scale()
    .domain(d3.extent(data.data, function(d) { return d.date; }))
    .range([0,width]);

    //console.log(d3.extent(data.data, function(d) { return d.date; }));
    //console.log(x(data.data[0].date));
    //console.log(x(data.data[data.data.length - 1].date));
    //y.domain([0, d3.max(data.data, function(d) {return d.value; })]);
    y.domain([0, 10]);

    //var buckets = d3.time.days(x.domain()[0], new Date().setDate(x.domain()[1].getDate + 1) );
    var buckets = d3.time.days(x.domain()[0], x.domain()[1]);
    var cellWidth = d3.scale.ordinal().domain(buckets).rangeRoundBands(x.range(), 0.05).rangeBand();

    //console.log(buckets);
    //console.log(buckets.length);
    //console.log(cellWidth);

    var cellHeight = 20;

    var cell = timechart.selectAll("g")
    .data(data.data)
    .enter().append("g");

    //console.log(data.data);

    cell.append("rect")
    .attr("x", function(d) { return x(d.date); })
    .attr("y", function(d) {return height - (d.order * cellHeight);})
    .attr("height", cellHeight)
    .attr("width", cellWidth)
    .attr("class", "message-cell")
    .style("fill", function(d){return d.color;})
    .on("mouseover", tip.show)
    .on("mouseout", tip.hide)
    ;



    //svg.append("text")
    //    .attr("x", barWidth / 2)
    //    .attr("y", function(d) { return y(d.value) + 3; })
    //    .attr("dy", ".75em")
    //    .text(function(d) { return d.value; });


    //data.data.forEach(function(d) {
    //
    //});
    //svg.append("g")
    //    svg.selectAll("g")
    //        .data(data.data)
    //        .enter().append("g")
    //        ;


  });
}

function drawNodeGraph() {
  var width = 860, height = 500;
  var color = d3.scale.category20();
  var force = d3.layout.force()
    .charge(-240)
    .linkDistance(60)
    .size([width, height]);

  var nodeTip = d3.tip().attr("class", "d3-tip")
                  .html(function(d) {
                    return d.name;
                  });

  var d3cola = cola.d3adaptor()
    .linkDistance(60)
    .avoidOverlaps(true)
    .symmetricDiffLinkLengths(15)
    .size([width,height]);

  var nodeGraph = d3.select("body").append("svg")
  .attr("width", width)
  .attr("height", height)
  .attr("class","nodegraph");

  nodeGraph.call(nodeTip);


  d3.json(dataSource,
          function(error, graph) {
    d3cola
    .nodes(graph.nodes)
    .links(graph.links)
    .start(10,15,20);

    var link = nodeGraph.selectAll(".link")
    .data(graph.links)
    .enter().append("line")
    .attr("class", "link")
    .style("stroke-width",
           function(d) { return Math.sqrt(d.value); });

    var node = nodeGraph.selectAll(".node")
    .data(graph.nodes)
    .enter().append("circle")
    .attr("class", "node")
    .attr("r", 7)
    .style("fill", function(d) { return color(d.index); })
    //.on("click", function (d) {
    //    d.fixed = true;
    //})
    .call(d3cola.drag)
    .on("mouseover", nodeTip.show)
    .on("mouseout", nodeTip.hide)
    ;

    //node.append("title")
    //    .text(function(d) { return d.name; });

    d3cola.on("tick", function() {
      link.attr("x1", function(d) { return d.source.x; })
      .attr("y1", function(d) { return d.source.y; })
      .attr("x2", function(d) { return d.target.x; })
      .attr("y2", function(d) { return d.target.y; });

      node.attr("cx", function(d) { return d.x; })
      .attr("cy", function(d) { return d.y; });
    });
  });


  d3.select("p").text("Replace");
  //var sampleSVG = d3.select("#viz")
  //.append("svg:svg")
  //.attr("width", 100)
  //.attr("height", 100);

  //sampleSVG.append("svg:circle")
  //    .style("stroke", "black")
  //    .style("fill", "white")
  //    .attr("r", 40)
  //    .attr("cx", 50)
  //    .attr("cy", 50);
  //var vis = d3.select("#graph").append("svg");
  //var w = 900, h = 400;
  //vis.text("Our Graph").select("#graph");
}
