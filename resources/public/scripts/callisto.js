//var dataSource = "/data";
var dataSource = "/data/remote";
//var dataSource =  "test.json";

console.log("Starting...");

var tickCount = 0;

var color = d3.scale.category20();

var parseDate = d3.time.format("%Y-%m-%d-%H-%M-%S").parse,
      formatPercent = d3.format(".0%");


//
// Player Toggle Functions
//

var playerState = [];
var maxPlayerStates = 2;
var playerStateCallbacks = [];

d3.json(dataSource, function(error, data) {
  data.nodes.forEach(function(d){
    playerState[d.index] = 0;
  });
});

function togglePlayerState(index) {
  playerState[index] = (playerState[index] + 1)  % maxPlayerStates;
  playerStateCallbacks.forEach(function(f) {
    f();
  });
}

function filterNodeByPlayer(d) {
  return (playerState[d.id] == 0);
}

function filterLinks(d) {
  return  ((playerState[d.s] == 0) && (playerState[d.t] == 0));
}




//
// Time Slider Functions
//


function getMessageId(m) {
  return m.messageId;
}

var updateOnSlider = [];

var focusArea = [0, 0];

function setFocusArea(extent) {
  focusArea = [extent[0], extent[1]];
  updateOnSlider.forEach(function(f) {
    f();
  });
}

function getFocusArea() {
  return focusArea;
}

function sortData(sdata) {
    sdata.forEach(function(d) {
      d.date = parseDate(d.date);
      d.senderId = +d.senderId;
      d.messageId = d.messageId;
      d.color = color(d.senderId);
      d.order = 1;
      d.indexNum = 0;
    });

    sdata.sort(function(a,b) {
      // Sort by exact time sent
      var dateDiff = a.date-b.date;
      return dateDiff;
    });

    // Give messages an index #
    var msgOrderInc = 0;
    sdata.forEach(function(d, i) {
      d.indexNum = d.indexNum + msgOrderInc;
      msgOrderInc = msgOrderInc + 1;
    });

  return sdata;
}

function sortDateCount(dcdata) {
  dcdata.forEach(function(d){
    //
  });
  return dcdata;
}

// Filtering


function filterByDate(d) {
  return (d.date >= getFocusArea()[0]) && (d.date <= getFocusArea()[1]);
}

function filterBySenderId(d) {
  return playerState[d.senderId] == 0;
}

function filterByPlayer(d) {
  return playerState[d.senderId] == 0;
}

function filterData(d) {
  return filterByDate(d);
}

function drawTimeline() {
  var width = 860, height = 15;

  var x = d3.time.scale().range([0,width]);
  var y = d3.scale.linear().range([height,0]);

  var timechart = d3.select("body").append("svg")
  .attr("width", width)
  .attr("height", height)
  .attr("class", "timeline");


  d3.json(dataSource, function(error, data) {

    var sortedData = sortData(data.data);

    var firstDate = d3.time.day.floor(sortedData[0].date);
    var lastDate = d3.time.day.ceil(sortedData[data.data.length - 1].date);
    var curDate = firstDate;
    var maxOrder = 0;
    var orderInc = 0;

    var timelineData = [];

    sortedData.forEach(function(d, i) {
      if (d3.time.day(curDate) < d3.time.day(d.date)) {
        //console.log(orderInc);
        timelineData.push({v: orderInc, date: curDate});
        orderInc = 0;
        curDate = d3.time.day(d.date);
      }
      d.order = d.order + orderInc;
      orderInc = orderInc + 1;
      maxOrder = Math.max(maxOrder, orderInc);
    });
    timelineData.push({v: orderInc, date: curDate});
    timelineData.sort(function(a, b){ return a.date - b.date; });

    //console.log(timelineData);

    var timeExtent = d3.extent(timelineData, function(d) { return d3.time.day(d.date); });
    timeExtent[1].setDate(timeExtent[1].getDate() + 1);

    x = d3.time.scale()
    .domain(timeExtent)
    .range([0,width]);

    y.domain([0, maxOrder]);

    var lastDatePlusOne = new Date(x.domain()[1]);
    lastDatePlusOne.setDate(lastDatePlusOne.getDate());
    var buckets = d3.time.days(x.domain()[0], x.domain()[1]);
    var cellWidth = d3.scale.ordinal().domain(buckets).rangeRoundBands(x.range(), 0.01).rangeBand();

    var cellHeight = Math.max(0, height / Math.max(maxOrder, 1));

    var showTimeTicks = true;

    if(showTimeTicks) {

      var timeTick = timechart.selectAll("rect")
      .data(timelineData);

      timeTick.enter().append("rect")
      .attr("x", function(d) { return x(d.date); })
      .attr("y", function(d) {return height - (d.v * cellHeight);})
      .attr("height", function(d) {return d.v * cellHeight;})
      .attr("width", cellWidth)
      .style("fill", "#6677cc")
          .append("title")
        .text(function(d) { return (d.date + " " + d.v); })
    ;


    } else {
      var cell = timechart.selectAll("g")
      .data(data.data).enter().append("g");

      cell.append("rect")
      .attr("x", function(d) { return x(d3.time.day(d.date)); })
      .attr("y", function(d) {return height - (d.order * cellHeight);})
      .attr("height", cellHeight)
      .attr("width", cellWidth)
      .attr("class", function(d) { return d.from + " message-cell"; })
      .style("fill", function(d){return d.color;})
      ;
    }

    function brushed() {
      var extent0 = brush.extent(),
        extent1;

      // if dragging, preserve the width of the extent
      if (d3.event.mode === "move") {
        var d0 = d3.time.day.round(extent0[0]),
          d1 = d3.time.day.offset(d0, Math.round((extent0[1] - extent0[0]) / 864e5));
        extent1 = [d0, d1];
      }

      // otherwise, if resizing, round both dates
      else {
        extent1 = extent0.map(d3.time.day.round);

        // if empty when rounded, use floor & ceil instead
        if (extent1[0] >= extent1[1]) {
          extent1[0] = d3.time.day.floor(extent0[0]);
          extent1[1] = d3.time.day.ceil(extent0[1]);
        }
      }




      setFocusArea([extent1[0], extent1[1]]);
      d3.select(this).call(brush.extent(extent1));
    }

    var brush = d3.svg.brush()
      .x(x)
      .extent([d3.time.day.floor(firstDate), d3.time.day.ceil(lastDate)])
      .on("brush",brushed)
      ;

    var gBrush = timechart.append("g")
    .attr("class", "brush")
    .call(brush);

    gBrush.selectAll("rect")
      .attr("height", height);


  });
}


function drawTimeChart() {
  var tip = d3.tip().attr("class", "d3-tip")
  .html(function(d) {
    return d.from + "<br>" + d.subject + "<br>" + d.date;
  });

  var width = 860, height = 350;

  var x = d3.time.scale().range([0,width]);
  var y = d3.scale.linear().range([height,0]);

  var svg = d3.select("body").append("svg")
  .attr("width", width)
  .attr("height", height)
  .attr("class", "container");

  var timechart = svg.append("g")
  .attr("width", width)
  .attr("height", height)
  .attr("transform", "translate(" + 0 + "," + 0 + ")")
  .attr("class", "timechart");

  timechart.call(tip);

  d3.json(dataSource, function(error, data) {

    var sortedData = sortData(data.data);

    var firstDate = d3.time.day.floor(sortedData[0].date);
    var lastDate = d3.time.day.ceil(sortedData[data.data.length - 1].date);
    var curDate = d3.time.day(firstDate);
    var maxOrder = 0;
    var orderInc = 0;
    sortedData.forEach(function(d, i) {
      if (d3.time.day(curDate) < d3.time.day(d.date)) {
        orderInc = 0;
        curDate = d3.time.day.floor(d.date);
      }
      d.order = d.order + orderInc;
      orderInc = orderInc + 1;
      maxOrder = Math.max(maxOrder, orderInc);
    });

    var timeExtent = d3.extent(sortedData, function(d) { return d3.time.day(d.date); });
    timeExtent[1].setDate(timeExtent[1].getDate() + 1);
    setFocusArea(timeExtent);

    x = d3.time.scale()
    .domain(timeExtent)
    .range([0,width]);

    y.domain([0, maxOrder]);

    var lastDatePlusOne = new Date(x.domain()[1]);
    lastDatePlusOne.setDate(lastDatePlusOne.getDate());
    var buckets = d3.time.days(x.domain()[0], x.domain()[1]);
    var cellWidth = d3.scale.ordinal().domain(buckets).rangeRoundBands(x.range(), 0.0).rangeBand();

    var cellHeight = Math.max(5, height / Math.max(maxOrder, 1));

    var cell = timechart.selectAll("rect")
         .data(sortedData, getMessageId).enter().append("rect")
    .attr("x", function(d) { return x(d3.time.day(d.date)); })
    .attr("y", function(d) {return height - (d.order * cellHeight);})
    .attr("height", cellHeight)
    .attr("width", cellWidth)
    .attr("class", function(d) { return d.from + " message-cell"; })
    .style("fill", function(d){return color(d.senderId);})
    .on("mouseover", tip.show)
    .on("mouseout", tip.hide);

    // Hide data...
    /*
    updateOnSlider.push(function() {
      var filteredData = sortedData
      .filter(filterData);

      var cells = timechart
      .selectAll("rect").data(filteredData, getMessageId);

      cells.exit()
      .style("fill", "#FF4433");

      cells.exit().remove();

      cells.enter()
      .append("rect")
      .attr("x", function(d) { return x(d3.time.day(d.date)); })
      .attr("y", function(d) {return height - (d.order * cellHeight);})
      .attr("height", cellHeight)
      .attr("width", cellWidth)
      .attr("class", function(d) { return d.from + " message-cell"; })
      .style("fill", function(d) {return color(d.senderId);})
      .on("mouseover", tip.show)
      .on("mouseout", tip.hide);
    });
    */


    updateOnSlider.push(function() {
      x = d3.time.scale().domain(getFocusArea()).range([0,width]);

      buckets = d3.time.days(x.domain()[0], x.domain()[1]);
      cellWidth = d3.scale.ordinal().domain(buckets).rangeRoundBands(x.range(), 0.0).rangeBand();

      timechart.selectAll("rect")
        .transition()
        .duration(0)
        .attr("x", function(d) { return x(d3.time.day(d.date)); })
        .attr("width", cellWidth);
    });
  });
}

function drawMessageList() {
  //var color = d3.scale.category20();

  var messageList = d3.select("body")
    .append("div")
    .attr("class", "data-list")
    .append("ul")
    .attr("class", "data-list");

  d3.json(dataSource, function(error, data) {

    var sortedData = sortData(data.data);

    /*
    var messageEntry = messageList.selectAll("li")
      .data(sortedData, getMessageId)
      .enter()
      .append("li")
      .attr("class", function(d) { return "message-listing " + d.from; })
      .style("background-color", function(d) { return d.color; })
      .html(function(d) {
        return d.from + ": " + d.subject;
      });*/

    function updateMessageListings() {
      var filteredData = sortedData
      .filter(filterData)
      .filter(filterBySenderId);

      var messageEntry = messageList.selectAll("li")
      .data(filteredData, getMessageId);

      messageEntry.exit().remove();

      messageEntry.enter()
      .append("li")
      .attr("class", function(d) { return "message-listing " + d.from; })
      .style("background-color", function(d) { return d.color; })
      .html(function(d) {
        return d.from + ": " + d.subject;
      });

      messageEntry.order();
    }

    updateMessageListings();

    updateOnSlider.push(updateMessageListings);
    playerStateCallbacks.push(updateMessageListings);
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

    //data.nodes.forEach(function(d){
    //  playerState[d.index] = 0;
    //});

    var playerEntry = playerList.selectAll("li")
      .data(data.nodes)
      .enter()
      .append("li")
      .attr("class", function(d) { return "player-listing " + d.name; })
      .style("background-color", function(d) { return color(d.index); })
      .html(function(d) {
        return d.name;
      })
    .on("click", function(d){ togglePlayerState(d.index)});

    function updatePlayerVisibility() {
      playerList.selectAll("li").filter(function(d){
        return (playerState[d.index] != 0);
      }).style("background-color", "#332233");
      playerList.selectAll("li").filter(function(d){
        return (playerState[d.index] == 0);
      }).style("background-color", function(d) { return color(d.index); });
    }
    playerStateCallbacks.push(updatePlayerVisibility);
  });





}

function drawNodeGraph() {
  var width = 400, height = 450;

  var d3force = d3.layout.force()
    .charge(-280)
    .linkDistance(80)
    .size([width, height]);

  var d3cola = cola.d3adaptor()
    .linkDistance(50)
    .avoidOverlaps(true)
    .symmetricDiffLinkLengths(25)
    //.jaccardLinkLengths(40,0.7)
    .size([width,height]);

  var force = d3cola;
  //var force = d3force;

  var nodeTip = d3.tip().attr("class", "d3-tip")
                  .html(function(d) {
                    return d.name;
                  });

  var nodeGraph = d3.select("body").append("svg")
  .attr("width", width)
  .attr("height", height)
  .attr("class","nodegraph");

  nodeGraph.call(nodeTip);

  d3.json(dataSource,
          function(error, graph) {
    graph.nodes.forEach(function(d) {
      d.id = +d.index;
    });
    graph.links.forEach(function(d){
      d.s = +d.source;
      d.t = +d.target;
      d.id = d.s + ( d.t * graph.nodes.length * 10);
    });

    function updateNodes() {

    var links = graph.links.filter(filterLinks);
    var nodes = graph.nodes.filter(filterNodeByPlayer);

    var link = nodeGraph.selectAll(".link").data(links, function(d) { return d.id; });
    var node = nodeGraph.selectAll(".node").data(nodes, function(d) { return d.id; });

    link.exit().remove();

    link
      .enter().append("line")
      .attr("class", "link")
      .style("stroke", function(d) { return color(d.s); })
      .style("stroke-width",
             function(d) { return Math.sqrt(d.value); });

    node.exit().remove();

    node.enter().append("circle")
      .attr("class", function(d) { return "node " + d.name; })
      .attr("r", 9)
      .style("fill", function(d) { return color(d.id); })
      //.on("click", function (d) {
      //    d.fixed = true;
      //})
      .call(force.drag)
      .attr("cx", width / 2)
      .attr("cy", function(d) { return d.y; })
      .on("mouseover", nodeTip.show)
      .on("mouseout", nodeTip.hide)
      //.on("click", function(d){ togglePlayerState(d.index)})
      ;

      force.on("tick", function () {
        link.attr("x1", function(d) { return d.source.x; })
            .attr("y1", function(d) { return d.source.y; })
            .attr("x2", function(d) { return d.target.x; })
            .attr("y2", function(d) { return d.target.y; });

        node.attr("cx", function(d) { return d.x; })
            .attr("cy", function(d) { return d.y; });
      });

    force
    .nodes(nodes)
    .links(links)
    .start();
    }

    updateNodes();
     playerStateCallbacks.push(updateNodes);
    playerStateCallbacks.push(nodeTip.hide);
  });
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
      return "M " + d.path[0].x + "," + d.path[0].y
           + "S " + d.path[1].x + "," + d.path[1].y
           +  " " + d.path[2].x + "," + d.path[2].y;
      });
    });
  });

  d3.select("p").text("Replace");
}


function drawChordGraph() {

  var width = 450,
    height = 450,
    innerRadius = Math.min(width, height) * .41,
    outerRadius = innerRadius * 1.1;

  var svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

  var dataMatrix = [];
  var nodes = [];
  var links = [];
  var messages = [];
  var bydates = [];

  function getDefaultLayout() {
    return d3.layout.chord()
    .padding(0.03)
    .sortSubgroups(d3.descending)
    .sortChords(d3.ascending);
  }
  var last_layout;

  function updateChords() {
    // assemble data matrix
    d3.json(dataSource, function(error, graph) {
      nodes = graph.nodes;
      links = graph.links;
      messages = graph.data;
      bydates = graph.dates;

      nodes.forEach(function(d) {
        d.id = +d.index;
      });
      links.forEach(function(d){
        d.s = +d.source;
        d.t = +d.target;
        d.id = d.s + ( d.t * graph.nodes.length * 10);
        d.count = 0;
        var msgs = messages.filter(function(d){

        });
      });
      messages.forEach(function(d){

      });
      console.log(links);

      // Create Matrix


      // Assign Matrix to layout

      //layout = getDefaultLayout();
      //layout.matrix(matrix);

    });

  }
  updateChords();


}


/*
function drawChordGraph() {

  var width = 450,
    height = 450,
    innerRadius = Math.min(width, height) * .41,
    outerRadius = innerRadius * 1.1;

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
    .on("click", function(d){ togglePlayerState(d.index)})
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

*/
