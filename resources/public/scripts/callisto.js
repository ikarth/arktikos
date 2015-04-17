//var dataSource = "/data";
var dataSource = "/data/remote";
//var dataSource =  "test.json";

console.log("Starting...");

var tickCount = 0;

var hideModerator = false;

function drawTimeChart() {
  var tip = d3.tip().attr("class", "d3-tip")
  .html(function(d) {
    return d.from + "<br>" + d.subject + "<br>" + d.date;
  });

  var width = 860, height = 500;

  var parseDate = d3.time.format("%Y-%m-%d-%H-%M-%S").parse,
      formatPercent = d3.format(".0%");


  var x = d3.time.scale().range([0,width]);
  var y = d3.scale.linear().range([height,0]);


  var color = d3.scale.category20();


  var timechart = d3.select("body").append("svg")
  .attr("width", width+20)
  .attr("height", height)
  .attr("class", "timechart");

  timechart.call(tip);

  d3.json(dataSource, function(error, data) {

    data.data.forEach(function(d) {
      d.date = parseDate(d.date);
      d.senderId = +d.senderId;
      d.color = color(d.senderId);
      d.order = 1;
    });

    data.data.sort(function(a,b) {
      var dateDiff = d3.time.day(a.date)-d3.time.day(b.date);
      if (dateDiff == 0) {
        dateDiff = a.senderId - b.senderId;
      }
      return dateDiff;
    });

    var firstDate = data.data[0].date;
    var lastDate = data.data[data.data.length - 1].date;
    var curDate = d3.time.day(firstDate);
    var orderInc = 0;
    data.data.forEach(function(d, i) {
      if (d3.time.day(curDate) < d3.time.day(d.date)) {
        orderInc = 0;
        curDate = d3.time.day(d.date);
      }
      d.order = d.order + orderInc;
      orderInc = orderInc + 1;
    });


    var timeExtent = d3.extent(data.data, function(d) { return d3.time.day(d.date); });
    timeExtent[1].setDate(timeExtent[1].getDate() + 1);

    x = d3.time.scale()
    .domain(timeExtent)
    .range([0,width]);

    y.domain([0, 10]);

    var lastDatePlusOne = new Date(x.domain()[1]);
    lastDatePlusOne.setDate(lastDatePlusOne.getDate());
    var buckets = d3.time.days(x.domain()[0], lastDatePlusOne);
    var cellWidth = d3.scale.ordinal().domain(buckets).rangeRoundBands(x.range(), 0.0).rangeBand();

    var cellHeight = 10;

    var cell = timechart.selectAll("g")
    .data(data.data).enter().append("g");

    cell.append("rect")
    .attr("x", function(d) { return x(d3.time.day(d.date)); })
    .attr("y", function(d) {return height - (d.order * cellHeight);})
    .attr("height", cellHeight)
    .attr("width", cellWidth)
    .attr("class", function(d) { return d.from + " message-cell"; })
    .style("fill", function(d){return d.color;})
    .on("mouseover", tip.show)
    .on("mouseout", tip.hide);

  });
}

function drawNodeGraph() {
  var width = 860, height = 500;
  var color = d3.scale.category20();

  var d3force = d3.layout.force()
    .charge(-280)
    .linkDistance(80)
    .size([width, height]);

  var nodeTip = d3.tip().attr("class", "d3-tip")
                  .html(function(d) {
                    return d.name;
                  });

  var d3cola = cola.d3adaptor()
    .linkDistance(50)
    .avoidOverlaps(true)
    .symmetricDiffLinkLengths(25)
    //.jaccardLinkLengths(40,0.7)
    .size([width,height]);

  var force = d3cola;
  //var force = d3force;

  var nodeGraph = d3.select("body").append("svg")
  .attr("width", width)
  .attr("height", height)
  .attr("class","nodegraph");

  nodeGraph.call(nodeTip);


  d3.json(dataSource,
          function(error, graph) {

    var nodes = graph.nodes;
    var links = graph.links;

    // TODO: generalize to all players
    if(hideModerator) {
      var moderatorIndex = nodes.filter(function(d) { return d.name == "Moderator"; })[0].index;
      //nodes = nodes.filter(function(d) { return d.name != "Moderator"; });
      links = links.filter(function(d) {
        return ((d.source != moderatorIndex) && (d.target != moderatorIndex));
      });
    };


    force
    .nodes(nodes)
    .links(links)
    .start();

    var link = nodeGraph.selectAll(".link")
    .data(links)
    .enter().append("line")
    .attr("class", "link")
    .style("stroke-width",
           function(d) { return Math.sqrt(d.value); });

    var node = nodeGraph.selectAll(".node")
    .data(nodes)
    .enter().append("circle")
    .attr("class", function(d) { return "node " + d.name; })
    .attr("r", 7)
    .style("fill", function(d) { return color(d.index); })
    //.on("click", function (d) {
    //    d.fixed = true;
    //})
    .call(force.drag)
    .on("mouseover", nodeTip.show)
    .on("mouseout", nodeTip.hide)
    ;

    //node.append("title")
    //    .text(function(d) { return d.name; });

    force.on("tick", function() {
      //console.log("tick " + tickCount);
      //tickCount++;

      link.attr("x1", function(d) { return d.source.x; })
      .attr("y1", function(d) { return d.source.y; })
      .attr("x2", function(d) { return d.target.x; })
      .attr("y2", function(d) { return d.target.y; });

      node.attr("cx", function(d) { return d.x; })
      .attr("cy", function(d) { return d.y; });
    });
  });


  d3.select("p").text("Replace");
}

function drawNodeGraphWithCurves() {
  var width = 860, height = 500;
  var color = d3.scale.category20();
  var force = d3.layout.force()
    .charge(-70)
    .linkDistance(15)
    .size([width, height]);

  var nodeTip = d3.tip().attr("class", "d3-tip")
                  .html(function(d) {
                    return d.name;
                  });

  var d3cola = cola.d3adaptor()
    .linkDistance(30)
    .avoidOverlaps(true)
    .symmetricDiffLinkLengths(5)
    .size([width,height]);

  var nodeGraph = d3.select("body").append("svg")
  .attr("width", width)
  .attr("height", height)
  .attr("class","nodegraph");

  nodeGraph.call(nodeTip);


  d3.json(dataSource,
          function(error, graph) {

    var nodes = graph.nodes.slice();
    var links = [];
    var bilinks = [];
    graph.links.forEach(function(l) {
      var s = nodes[l.source];
      var t = nodes[l.target];
      var i = {};
      nodes.push(i);
      links.push({source: s, target: i}, {source: i, target: t});
      bilinks.push([s, i, t]);
    });

    d3cola
    .nodes(nodes)
    .links(links)
    .start();

    var link = nodeGraph.selectAll(".link")
    .data(bilinks)
    .enter().append("path")
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
       node.attr("cx", function(d) { return d.x; })
      .attr("cy", function(d) { return d.y; });
      link.attr("d", function(d) {
      return "M " + d[0].x + "," + d[0].y
           + "S " + d[1].x + "," + d[1].y
           +  " " + d[2].x + "," + d[2].y;
      });
    });
  });


  d3.select("p").text("Replace");
}
