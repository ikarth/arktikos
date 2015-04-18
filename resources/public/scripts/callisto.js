//var dataSource = "/data";
var dataSource = "/data/remote";
//var dataSource =  "test.json";

console.log("Starting...");

var tickCount = 0;

var hideModerator = false;

var color = d3.scale.category20();

var currentlySelectedIndex =  -1;
var currentlySelectedMessage =  -1;

function drawTimeChart() {
  var tip = d3.tip().attr("class", "d3-tip")
  .html(function(d) {
    return d.from + "<br>" + d.subject + "<br>" + d.date;
  });

  var width = 860, height = 350;

  var parseDate = d3.time.format("%Y-%m-%d-%H-%M-%S").parse,
      formatPercent = d3.format(".0%");

  var x = d3.time.scale().range([0,width]);
  var y = d3.scale.linear().range([height,0]);

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
      d.indexNum = 0;
    });

    data.data.sort(function(a,b) {
      // Sort by exact time sent
      var dateDiff = a.date-b.date;
      return dateDiff;
    });

    // Give messages an index #
    var msgOrderInc = 0;
    data.data.forEach(function(d, i) {
      d.indexNum = d.indexNum + msgOrderInc;
      msgOrderInc = msgOrderInc + 1;
    });

    /*
    data.data.sort(function(a,b) {
      // Sort by user ID
      //var dateDiff = d3.time.day(a.date)-d3.time.day(b.date);
      // Sort by exact time sent
      var dateDiff = a.date-b.date;

      if (dateDiff == 0) {
        dateDiff = a.senderId - b.senderId;
      }
      return dateDiff;
    });
    */

    var firstDate = data.data[0].date;
    var lastDate = data.data[data.data.length - 1].date;
    var curDate = d3.time.day(firstDate);
    var maxOrder = 0;
    var orderInc = 0;
    data.data.forEach(function(d, i) {
      if (d3.time.day(curDate) < d3.time.day(d.date)) {
        orderInc = 0;
        curDate = d3.time.day(d.date);
      }
      d.order = d.order + orderInc;
      orderInc = orderInc + 1;
      maxOrder = Math.max(maxOrder, orderInc);
    });


    var timeExtent = d3.extent(data.data, function(d) { return d3.time.day(d.date); });
    timeExtent[1].setDate(timeExtent[1].getDate() + 1);

    x = d3.time.scale()
    .domain(timeExtent)
    .range([0,width]);

    y.domain([0, maxOrder]);

    var lastDatePlusOne = new Date(x.domain()[1]);
    lastDatePlusOne.setDate(lastDatePlusOne.getDate());
    var buckets = d3.time.days(x.domain()[0], lastDatePlusOne);
    var cellWidth = d3.scale.ordinal().domain(buckets).rangeRoundBands(x.range(), 0.05).rangeBand();

    var cellHeight = Math.max(5, height / Math.max(maxOrder, 1));

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

function drawMessageList() {
  var parseDate = d3.time.format("%Y-%m-%d-%H-%M-%S").parse,
      formatPercent = d3.format(".0%");

  //var color = d3.scale.category20();

  var messageList = d3.select("body")
    .append("div")
    .attr("class", "data-list")
    .append("ul")
    .attr("class", "data-list");

  d3.json(dataSource, function(error, data) {

    data.data.forEach(function(d) {
      d.date = parseDate(d.date);
      d.senderId = +d.senderId;
      d.color = color(d.senderId);
      d.order = 1;
      d.indexNum = 0;
    });

    data.data.sort(function(a,b) {
      // Sort by exact time sent
      var dateDiff = a.date-b.date;
      return dateDiff;
    });

    // Give messages an index #
    var msgOrderInc = 0;
    data.data.forEach(function(d, i) {
      d.indexNum = d.indexNum + msgOrderInc;
      msgOrderInc = msgOrderInc + 1;
    });


    var messageEntry = messageList.selectAll("li")
      .data(data.data)
      .enter()
      .append("li")
      .attr("class", function(d) { return "message-listing " + d.from; })
      .style("background-color", function(d) { return d.color; })
      .html(function(d) {
        return d.from + ": " + d.subject;
      })

    ;

  });

}

function drawPlayerList() {
  //var color = d3.scale.category20();


  var playerList = d3.select("body")
  .append("div")
  .attr("class", "data-list")
  .append("ul")
  .attr("class", "data-list");

  d3.json(dataSource, function(error, data) {
    //console.log(data.nodes);

    var playerEntry = playerList.selectAll("li")
      .data(data.nodes)
      .enter()
      .append("li")
      .attr("class", function(d) { return "player-listing " + d.name; })
      .style("background-color", function(d) { return color(d.index); })
      .html(function(d) {
        return d.name;
      })

    ;
  });

}

function drawNodeGraph() {
  var width = 860, height = 500;
  //var color = d3.scale.category20();

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
    .style("stroke", function(d) { return color(d.source.index); })
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
  //var color = d3.scale.category20();
  var force = d3.layout.force()
    .charge(-70)
    .linkDistance(15)
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

    var nodes = graph.nodes.slice();
    var links = [];
    var bilinks = [];
    graph.links.forEach(function(l) {
      var s = nodes[l.source];
      var t = nodes[l.target];
      var i = {index: s.index};
      nodes.push(i);
      links.push({source: s, target: i}, {source: i, target: t});
      bilinks.push({path: [s, i, t], value: l.value});
    });

    //console.log(bilinks);

    d3cola
    .nodes(nodes)
    .links(links)
    .start();

    var link = nodeGraph.selectAll(".link")
    .data(bilinks)
    .enter().append("path")
    .attr("class", "link")
    .style("stroke", function(d) { return color(d.path[0].index); })
    .style("stroke-width",
           function(d) { return Math.sqrt(d.value); })
    ;

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
      return "M " + d.path[0].x + "," + d.path[0].y
           + "S " + d.path[1].x + "," + d.path[1].y
           +  " " + d.path[2].x + "," + d.path[2].y;
      });
    });
  });


  d3.select("p").text("Replace");
}

function drawChordGraph() {

  var width = 960,
    height = 500,
    innerRadius = Math.min(width, height) * .41,
    outerRadius = innerRadius * 1.1;

    var fill = d3.scale.ordinal()
    .domain(d3.range(4))
    .range(["#000000", "#FFDD89", "#957244", "#F26223"]);

    var svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");


  d3.json(dataSource, function(error, graph) {
    var nodes = graph.nodes;
    var links = graph.links;

    var tip = d3.tip().attr("class", "d3-tip")
      .html(function(d) {
        return nodes[d.index].name;
      })
      tip.offset(function() {
        return [this.getBBox().height / 2, 0]
      });

    svg.call(tip);

    var dataMatrix = [];
    nodes.forEach(function(s) {
      dataMatrix.push(
      nodes.map(function(t) { return 0; }));
    });

    links.forEach(function(d) {
      dataMatrix[d.source][d.target] = d.value; // sent mail
      //dataMatrix[d.target][d.source] = d.value; // received mail
    });

    //console.log(dataMatrix);
    //console.log(links);

    var chord = d3.layout.chord()
    .padding(.01)
    .sortSubgroups(d3.descending)
    .matrix(dataMatrix);

    //console.log(chord);

    svg.append("g").selectAll("path")
    .data(chord.groups)
    .enter().append("path")
    .style("fill", function(d) { return color(d.index); })
    .style("stroke", function(d) { return color(0); })
    .attr("d", d3.svg.arc().innerRadius(innerRadius).outerRadius(outerRadius))
    .attr("class", function(d) { return "arc " + d.name; })
    //.on("mouseover", tip.show)
    //.on("mouseout", tip.hide)
    .on("mouseover", fade(.1))
    .on("mouseout", fade(1))
    .append("title")
        .text(function(d) { return nodes[d.index].name; })
    ;

    var ticks = svg.append("g").selectAll("g")
    .data(chord.groups)
    .enter().append("g").selectAll("g")
    .data(groupTicks)
    .enter().append("g")
    .attr("transform", function(d) {
      return "rotate(" + (d.angle * 180 / Math.PI - 90) + ")"
          + "translate(" + outerRadius + ",0)";
    });

    svg.append("g")
    .attr("class", "chord")
    .selectAll("path")
    .data(chord.chords)
    .enter().append("path")
    .attr("d", d3.svg.chord().radius(innerRadius))
    .style("fill", function(d) { return color(d.source.index); })
    .style("opacity", 0.7);

        ticks.append("line")
    .attr("x1", 1)
    .attr("y1", 0)
    .attr("x2", 5)
    .attr("y2", 0)
    .style("stroke", "#000");

    ticks.append("text")
    .attr("x", 8)
    .attr("dy", ".35em")
    .attr("transform", function(d) { return d.angle > Math.PI ? "rotate(180)translate(-16)" : null; })
    .style("text-anchor", function(d) { return d.angle > Math.PI ? "end" : null; })
    .text(function(d) { return d.label; });

    // Returns an array of tick angles and labels, given a group.
  function groupTicks(d) {
  var k = (d.endAngle - d.startAngle) / d.value;
  return d3.range(0, d.value, 5).map(function(v, i) {
    return {
      angle: v * k + d.startAngle,
      //label: i % 5 ? null : v / 5 + "k"
      //label: i % 2 ? null : v + ""
      //label: nodes[d.index].name
    };
  });
}

    // Returns an event handler for fading a given chord group.
    function fade(opacity) {
    return function(g, i) {
      svg.selectAll(".chord path")
        .filter(function(d) { return d.source.index != i && d.target.index != i; })
        .transition()
        .style("opacity", opacity);
    };
  }


  });

}

