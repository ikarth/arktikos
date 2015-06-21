//var dataSource = "/data";
var dataSource = "/data/remote";
//var dataSource =  "test.json";

console.log(Date.now() + "Starting...");

var tickCount = 0;

var color = d3.scale.category20();

var parseDate = d3.time.format("%Y-%m-%d-%H-%M-%S").parse,
    formatPercent = d3.format(".0%");

var logUpdates = false;
//
// Player Toggle Functions
//

//var playerState = [];
//var maxPlayerStates = 2;
var playerStateCallbacks = [];

//var initialized_player_state = false;

//var max_nodes = 20;
//for (var init = 0; init < max_nodes; init++) {
//  playerState[init] = 1;
//}

function togglePlayerState(index) {
  //if(playerState[index] == 0) {
  //  playerState[index] = 1;
  //} else {
  //  playerState[index] = 0;
  //}

  //playerState[index] = (playerState[index] + 1)  % maxPlayerStates;
  if(logUpdates) { console.log(Date.now() + "*playerStateCallbacks*"); }


  playerStateCallbacks.forEach(function(f) {
    f();
  });
}

//
// Filtering links by date/sender/player
//

function filterByDate(d) {
  return (d.date >= getFocusArea()[0]) && (d.date <= getFocusArea()[1]);
}
/*
function filterBySenderId(d) {
  return playerState[d.senderId] == 0;
}

function filterByPlayer(d) {
  return playerState[d.senderId] == 0;
}
*/
function filterData(d) {
  return filterByDate(d);
}

function filterMessageByPlayer(d) {
  var targetsAwake = d.targetIds.reduce(function(prev, cur, i, a) {
    if (playerState[cur] == 0) {
      return prev + 1;
    }
    return prev;
  }, 0);
  return ((playerState[d.senderId] == 0) &&
          (targetsAwake > 0));
}


//
// Sort data
//

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



//
// Time Slider Functions
//


function getMessageId(m) {
  return m.messageId;
}

var updateOnSlider = [];

var focusArea = [0, 0];

var update_on_slider_count = 0;

function updateSliderData() {
  if(logUpdates) { console.log(Date.now() + "*updateSliderData*"); }

  updateOnSlider.forEach(function(f) {
    f();
  });
  update_on_slider_count++;
}

function setFocusArea(extent) {
  if(logUpdates) { console.log(Date.now() + "*setFocusArea*"); }
  focusArea = [extent[0], extent[1]];
  updateSliderData();
}

function getFocusArea() {
  return focusArea;
}

/////////////////////////////////////////////
//
// Custom Tweening
//
// From http://stackoverflow.com/questions/21813723/change-and-transition-dataset-in-chord-diagram-with-d3
//
/////////////////////////////////////////////

// TODO: clean up this hack - assumes chord graph is 450x450
var arcwidth = 450, // graph size - replace with variables...
    archeight = 450,
    arcinnerRadius = Math.min(arcwidth, archeight) * .41,
    arcouterRadius = arcinnerRadius * 1.1;

//create the arc path data generator for the groups
var arc = d3.svg.arc()
.innerRadius(arcinnerRadius)
.outerRadius(arcouterRadius);

//create the chord path data generator for the chords
var path = d3.svg.chord()
.radius(arcinnerRadius);

function arcTween(oldLayout) {
  //this function will be called once per update cycle

  //Create a key:value version of the old layout's groups array
  //so we can easily find the matching group
  //even if the group index values don't match the array index
  //(because of sorting)
  var oldGroups = {};
  if (oldLayout) {
    oldLayout.groups().forEach( function(groupData) {
      oldGroups[ groupData.index ] = groupData;
    });
  }

  return function (d, i) {
    var tween;
    var old = oldGroups[d.index];
    if (old) { //there's a matching old group
      tween = d3.interpolate(old, d);
    }
    else {
      //create a zero-width arc object
      var emptyArc = {startAngle:d.startAngle,
                      endAngle:d.startAngle};
      tween = d3.interpolate(emptyArc, d);
    }

    return function (t) {
      return arc( tween(t) );
    };
  };
}

function chordKey(data) {
  return (data.source.index < data.target.index) ?
    data.source.index + "." + data.target.index:
  data.target.index + "." + data.source.index;
}
function chordTween(oldLayout) {
  //this function will be called once per update cycle

  //Create a key:value version of the old layout's chords array
  //so we can easily find the matching chord
  //(which may not have a matching index)

  var oldChords = {};

  if (oldLayout) {
    oldLayout.chords().forEach( function(chordData) {
      oldChords[ chordKey(chordData) ] = chordData;
    });
  }

  return function (d, i) {
    //this function will be called for each active chord

    var tween;
    var old = oldChords[ chordKey(d) ];
    if (old) {
      //old is not undefined, i.e.
      //there is a matching old chord value

      //check whether source and target have been switched:
      if (d.source.index != old.source.index ){
        //swap source and target to match the new data
        old = {
          source: old.target,
          target: old.source
        };
      }

      tween = d3.interpolate(old, d);
    }
    else {
      //create a zero-width chord object
      var emptyChord = {
        source: { startAngle: d.source.startAngle,
                 endAngle: d.source.startAngle},
        target: { startAngle: d.target.startAngle,
                 endAngle: d.target.startAngle}
      };
      tween = d3.interpolate( emptyChord, d );
    }

    return function (t) {
      //this function calculates the intermediary shapes
      return path(tween(t));
    };
  };
}

///////////////////////////////////////////////////////////////////////
//
// Data
//
///////////////////////////////////////////////////////////////////////

// Global data storage
// TODO: store in a common structure?

var dataSortedData;
var dataNodeData;
var dataLinksData;
var dataDatesData;

var dataFirstDate;
var dataLastDate;

var dataMaxOrder = 0;

var dataTimelineData = [];

// Let's have the data updating in one unified place...

var dataUpdateCallbacks = [];

var dataMatrixSent = [];
var dataMatrixReceived = [];

function createDataMatrix() {
  var nodes = owl.deepCopy(dataNodeData);// graph.nodes;
  var links = owl.deepCopy(dataLinksData);//graph.links;
  var messages = dataSortedData;//owl.deepCopy(dataSortedData);// sortData(graph.data);
  var filteredMessages = messages.filter(filterData);

  nodes.forEach(function(d) {
    d.id = +d.index;
  });

  links.forEach(function(d){
    // d.s = +d.source;
    // d.t = +d.target;
    // d.id = d.s + ( d.t * graph.nodes.length * 10);
    // d.index = d.id;
    d.count = d.value;
    var msgs = filteredMessages.filter(function(m){

      return (
        (nodes[d.s].playerState == 0) &&
        (nodes[d.t].playerState == 0) &&
        (m.senderId == d.s) &&
        (m.targetIds.some(function(s) { return s == d.t; }))
      );
    });
    d.msgs = msgs.length;
    //d.count = msgs.length;
  });

  // Create Matrix

  // Create the basic matrix: all nodes vs. all nodes, with a value of 0.
  dataMatrixSent = [];
  dataMatrixReceived = [];
  nodes.forEach(function(d) {
    dataMatrixSent.push(nodes.map(function(t) { return 0; }));
    dataMatrixReceived.push(nodes.map(function(t) { return 0; }));
  });

  // Fill zero-basis data matrix with values from links
  links.forEach(function(d) {
    dataMatrixSent[d.s][d.t] = d.msgs; // sent mail
    dataMatrixReceived[d.t][d.s] = d.msgs; // received mail
  });
}

function updateDataMatrix() {
  createDataMatrix();
}

function updateSourceData() {
  if(logUpdates) { console.log(Date.now() + "*** updateSourceData ***"); }
  d3.json(dataSource, function(error, data) {
    if (error) { alert("Error reading data: ", error.statusText); return; }

    dataNodeData = data.nodes;
    dataLinksData = data.links;
    dataDatesData = data.dates;

    dataNodeData.forEach(function(d){
      d.id = +d.index;
      d.playerState = 0;

    });
    dataLinksData.forEach(function(d){
      d.s = +d.source;
      d.t = +d.target;
      d.id = d.s + ( d.t * data.nodes.length * 10);
      d.count = d.value;
      //d.index = d.id;
    });

    // Sort the message data
    dataSortedData = sortData(data.data);

    // calculate the dates for the data range
    dataFirstDate = d3.time.day.floor(dataSortedData[0].date);
    dataLastDate = d3.time.day.ceil(dataSortedData[data.data.length - 1].date);
    var curDate = dataFirstDate;
    dataMaxOrder = 0;
    var orderInc = 0;

    //Populate the timeline data with entries for each date...
    dataTimelineData = [];
    dataSortedData.forEach(function(d, i) {
      if (d3.time.day(curDate) < d3.time.day(d.date)) {
        dataTimelineData.push({v: orderInc, date: curDate});
        orderInc = 0;
        curDate = d3.time.day(d.date);
      }
      d.order = d.order + orderInc;
      orderInc = orderInc + 1;
      dataMaxOrder = Math.max(dataMaxOrder, orderInc);
    });
    dataTimelineData.push({v: orderInc, date: curDate});
    dataTimelineData.sort(function(a, b){ return a.date - b.date; });

    dataUpdateCallbacks.forEach(function(f) {
      f();
    });
  });
}

function filterLinks(d) {
  if(("source" in d) && ("target" in d)) {
    var src = d.source;
    var trg = d.target;
    if((typeof src === 'object') && (typeof trg === 'object')) {
      if(("playerState" in src) && ("playerState" in trg)) {
        return ((0 == d.source.playerState) && (0 == d.target.playerState));
      } else {
      }
    } else {
      return ((0 == dataNodeData.slice()[src].playerState) && (0 == dataNodeData.slice()[trg].playerState))
    }
  }
  return true;// ((0 == d.source.playerState) && (0 == d.target.playerState));
}

function filterNodesByPlayer(d) {
  return (0 == d.playerState);
}

///////////////////////////////////
//
// Update Button
//
//////////////////////////////////

function updateData() {
  updateSourceData();
}

function drawUpdateButton() {
  var button = d3.select("#player-list-box").append("div")
  .attr("width", "60px")
  //.attr("height", "20")
  .style("background-color","blue")
  .style("color","white")
  .style("font-weight","bold")
  .style("text-align","center")
  .style("padding","6px")
  .style("border-radius","5px")
  .attr("class", "interface-button")
  ;

  button.html("Update");

  button.on("click", function(d) {
    button.style("color","#ffffff");

    updateData();
  });
  button.on("mouseover", function(d) {
    button
    .style("background-color","#dddddd")
    .style("color","blue");
  });
  button.on("mouseout", function(d) {
    button.style("background-color","blue")
        .style("color","white");
  });
}


///////////////////////////////////
//
// Drawing individual graphs
//
//////////////////////////////////

//
// Timeline
//

function drawTimeline(width, height) {
  //var width = 850, height = 15;

  var x = d3.time.scale().range([0,width]);
  var y = d3.scale.linear().range([height,0]);

  var timechart = d3.select("#timeline-box").append("svg")
  .attr("width", width)
  .attr("height", height)
  .attr("class", "timeline");

  var brush = d3.svg.brush()
  ;

  var gTick = timechart.append("g")
  .attr("class", "tick-group");

  var gBrush = timechart.append("g")
  .attr("class", "brush");


  gBrush.selectAll("rect")
  .attr("height", height);

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

    //setFocusArea([extent1[0], extent1[1]]);
    d3.select(this).call(brush.extent(extent1));
  }

  // Only update time chart after dragging stops...
  function brushEnd() {
    var extent = brush.extent();
    setFocusArea(extent);
  }

  function updateBrushData() {

    brush
    .x(x)
    .extent([d3.time.day.floor(dataFirstDate), d3.time.day.ceil(dataLastDate)])
    .on("brush", brushed)
    .on("brushend",brushEnd);

    gBrush.call(brush);

    gBrush.selectAll("rect")
    .attr("height", height);

  }

  function updateTimelineData() {
    if(logUpdates) { console.log(Date.now() + "updateTimelineData"); }
    var timeline_data = dataTimelineData.slice();

    var timeExtent = [];
    timeExtent = d3.extent(timeline_data, function(d) { return d3.time.day(d.date); });
    timeExtent[1].setDate(timeExtent[1].getDate() + 1);

    x = d3.time.scale()
    .domain(timeExtent)
    .range([0,width]);

    y.domain([0, dataMaxOrder]);

    var lastDatePlusOne = new Date(x.domain()[1]);
    lastDatePlusOne.setDate(lastDatePlusOne.getDate());
    var buckets = d3.time.days(x.domain()[0], x.domain()[1]);
    var cellWidth = d3.scale.ordinal().domain(buckets).rangeRoundBands(x.range(), 0.01).rangeBand();

    var cellHeight = Math.max(0, height / Math.max(dataMaxOrder, 1));

    var timeTick = gTick.selectAll("rect")
    .data(timeline_data);

    timeTick.enter().append("rect")
    .attr("x", function(d) { return x(d.date); })
    .attr("y", function(d) {return height - (d.v * cellHeight);})
    .attr("height", function(d) {return d.v * cellHeight;})
    .attr("width", cellWidth)
    .style("fill", "#6677cc")
    .append("title")
    .text(function(d) { return (d.date + " " + d.v); });

    updateBrushData();
    brushEnd();
  }

  dataUpdateCallbacks.push(updateTimelineData);
  //dataUpdateCallbacks.push(updateBrushData);
}


//
// Time Chart
//

function drawTimeChart(width, height) {
  var tip = d3.tip().attr("class", "d3-tip")
  .html(function(d) {
    return d.from + "<br>" + d.subject + "<br>" + d.date;
  });

  //var width = 850, height = 350;

  var x = d3.time.scale().range([0,width]);
  var y = d3.scale.linear().range([height,0]);

  //d3.select("#timeline-box").attr("width", width);

  var timebox = d3.select("#graph-box").append("div")
  .attr("id","timeline-box");

  var svg = d3.select("#timeline-box").append("svg")
  .attr("width", width)
  .attr("height", height)
  .style("display", "block")
  .attr("class", "container");

  var timechart = svg.append("g")
  .attr("width", width)
  .attr("height", height)
  .attr("transform", "translate(" + 0 + "," + 0 + ")")
  .attr("class", "timechart");

  timechart.call(tip);

  function updateTimechartData() {
    if(logUpdates) { console.log(Date.now() + "updateTimechartData"); }

    var data_timechart = dataSortedData.slice();

    var timeExtent = d3.extent(data_timechart, function(d) { return d3.time.day(d.date); });
    timeExtent[1].setDate(timeExtent[1].getDate() + 1);
    setFocusArea(timeExtent);

    x = d3.time.scale()
    .domain(timeExtent)
    .range([0,width]);

    y.domain([0, dataMaxOrder]);

    var lastDatePlusOne = new Date(x.domain()[1]);
    lastDatePlusOne.setDate(lastDatePlusOne.getDate());
    var buckets = d3.time.days(x.domain()[0], x.domain()[1]);
    var cellWidth = d3.scale.ordinal().domain(buckets).rangeRoundBands(x.range(), 0.0).rangeBand();

    var cellHeight = Math.max(5, height / Math.max(dataMaxOrder, 1));

    var cell = timechart.selectAll("rect")
    .data(data_timechart, getMessageId).enter().append("rect")
    .attr("x", function(d) { return x(d3.time.day(d.date)); })
    .attr("y", function(d) {return height - (d.order * cellHeight);})
    .attr("height", cellHeight)
    .attr("width", cellWidth)
    .attr("class", function(d) { return d.from + " message-cell"; })
    .style("fill", function(d){return color(d.senderId);})
    .on("mouseover", tip.show)
    .on("mouseout", tip.hide);

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
  }
  dataUpdateCallbacks.push(updateTimechartData);
}

function drawMessageList() {
  //var color = d3.scale.category20();

  var messageList = d3.select("body")
  .append("div")
  .attr("class", "data-list")
  .append("ul")
  .attr("class", "data-list");

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
    if(logUpdates) { console.log(Date.now() + "updateMessageListings"); }
    var filteredData = dataSortedData.slice()
    .filter(filterData)
    .filter(function(d){return 0 == dataNodeData[d.senderId].playerState;});

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

  //updateMessageListings();

  updateOnSlider.push(updateMessageListings);
  playerStateCallbacks.push(updateMessageListings);
  dataUpdateCallbacks.push(updateMessageListings);
}


///////////////////////////////////////
//
// Player List
//
///////////////////////////////////////

function drawPlayerList() {
  //var color = d3.scale.category20();

  var playerList = d3.select("#player-list-box")
  .append("div")
  .attr("class", "data-list")
  .append("ul")
  .attr("class", "data-list");


function updatePlayerVisibility() {
    playerList.selectAll("li").filter(function(d){
      return (d.playerState != 0);
    }).style("background-color", "#332233");
    playerList.selectAll("li").filter(function(d){
      return (d.playerState == 0);
    }).style("background-color", function(d) { return color(d.id); });
  playerList.selectAll("li")
  .html(function(d) {
      return d.name;// + d.id + d.playerState;
    })
}

  function updatePlayerListData() {
    if(logUpdates) { console.log(Date.now() + "updatePlayerListData"); }

    var data_players = owl.deepCopy(dataNodeData);

    //data_players.forEach(function(d){
    //  playerState[d.index] = 0;
    //});

    var playerEntry = playerList.selectAll("li")
    .data(data_players, function(d) { return d.id; })
    .enter()
    .append("li")
    .attr("class", function(d) { return "player-listing " + d.id; })
    .style("background-color", function(d) { return color(d.id); })
    .html(function(d) {
      return d.name;// + d.id;
    })
    .on("click", function(d){
      //console.log(dataNodeData[d.id]);
      dataNodeData[d.id].playerState = (0 == dataNodeData[d.id].playerState) ? 1 : 0;
      //console.log(dataNodeData[d.id]);
      togglePlayerState(d.id)
    });

    updatePlayerVisibility();
  }

  //playerStateCallbacks.push(updatePlayerVisibility);
  playerStateCallbacks.push(updatePlayerListData);
  dataUpdateCallbacks.push(updatePlayerListData);
}

function drawNodeGraph(width, height) {

  var d3force = d3.layout.force()
  .charge(-80)
  .linkDistance(140)
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

  var nodeGraph = d3.select("#timeline-box").append("svg")
  .attr("width", width)
  .attr("height", height)
  .attr("class","nodegraph");

  nodeGraph.call(nodeTip);

  var links = [];
  var nodes = [];

  function updateNodes() {
    if(logUpdates) { console.log(Date.now() + "updateNodes"); }

    //dataFilteredLinks = dataLinksData.filter(filterLinks);
    //dataFilteredNodes = dataNodeData.filter(filterNodeByPlayer);

    var links = owl.deepCopy(dataLinksData);
    var nodes = owl.deepCopy(dataNodeData);

    var nglinks = links.slice().filter(filterLinks);
    var ngnodes = nodes.slice().filter(filterNodesByPlayer);

    var filter_zero_links = true;
    if(filter_zero_links) {
      nglinks = nglinks.filter(function(l) {
        return ((dataMatrixReceived[l.t][l.s] > 0) || (dataMatrixSent[l.s][l.t] > 0));
      });
      ngnodes = ngnodes.filter(function(d) {
        sum = dataMatrixReceived[d.id].reduce(function(p, c, i, a) {
          return p + c;
        }) +
        dataMatrixSent[d.id].reduce(function(p, c, i, a) {
          return p + c;
        });
        return (sum > 0);
      });
    }


    var nglink = nodeGraph.selectAll(".nglink").data(nglinks, function(d) { return d.id; });
    var ngnode = nodeGraph.selectAll(".ngnode").data(ngnodes, function(d) { return d.id; });

    //force.stop();

    nodeGraph.append("svg:defs").selectAll("marker")
    .data(nglinks, function(d) { return d.id; })
    .enter().append("svg:marker")
    .attr("id", "arrowend")
    //.attr("id", (function(d) { return "arrowend" + d.id; }))
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 28)
    .attr("refY", 0)
    .attr("markerWidth", 6)
    .attr("markerHeight", 6)
    .attr("markerUnits", "userSpaceOnUse")
    .attr("orient", "auto")
    .append("svg:path")
    .attr("d", "M0,-5L10,0L0,5");

    nglink.enter().append("line")
    .attr("class", "nglink")
    .style("stroke", function(d) { return color(d.s); })
    .style("stroke-width",
           function(d) {
      //return Math.sqrt(d.value);
      return d.value;
    })
    //.attr("marker-end", function(l) { return "url(#arrowend"+ l.id + ")"; })
    .attr("marker-end", "url(#arrowend)")
    ;




    nglink.exit()
    //.style("stroke-width",
    //      function(d) { return 0; });
        .remove();





    ngnode.exit().remove();

    ngnode.enter().append("circle")
    .attr("class", function(d) { return "ngnode"; })
    .attr("data-index", function(d){ return d.id; })
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
      nglink.attr("x1", function(d) { return d.source.x; })
      .attr("y1", function(d) { return d.source.y; })
      .attr("x2", function(d) { return d.target.x; })
      .attr("y2", function(d) { return d.target.y; });

      ngnode.attr("cx", function(d) { return d.x; })
      .attr("cy", function(d) { return d.y; });
    });

    //console.log(links);
    //console.log(nglinks);

    force
    .nodes(nodes)
    .links(nglinks);

    //force.linkStrength(function(l){
    //  return 1;// l.value;
    //});

    force.start();//(10,15,20);

    //console.log(dataNodeData);
    //console.log(ngnodes);

  }

  dataUpdateCallbacks.push(updateNodes);
  playerStateCallbacks.push(updateNodes);
  playerStateCallbacks.push(nodeTip.hide);
  updateOnSlider.push(updateNodes);

}

//
// Chord Graph
//

function drawChordGraph(sent_or_received) {

  var width = 450,
      height = 450,
      innerRadius = Math.min(width, height) * .41,
      outerRadius = innerRadius * 1.1;

  var svg = d3.select("body").append("svg")
  .attr("width", width)
  .attr("height", height);
  var g = svg.append("g")
  .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

  var chart_title = sent_or_received ? "Letters Sent" : "Letters Received";

  svg.append("text")
  .attr("text-align", "right")
  .attr("x", width)
  .attr("y", 0)
  .attr("dy", "1em")
  .attr("text-anchor", "end")
  .style("font-size", "1.5em")
  .style("font-weight", "bold")
  .style("fill", "#aaaaaa")
  .text(chart_title);

  //var dataMatrix = [];
  //var nodes = [];
  //var links = [];
  //var messages = [];
  //var bydates = [];

  function getDefaultLayout() {
    return d3.layout.chord()
    .padding(0.01)
    .sortSubgroups(d3.descending)
    .sortChords(d3.ascending);
  }

  var layout = getDefaultLayout();
  var last_layout = getDefaultLayout();

  var matrix_initialized = false;

  var show_sent_mail = true;
  if(!sent_or_received) { show_sent_mail = false;}

  // Returns an event handler for fading a given chord group.
  function fade(opacity) {
    return function(g, i) {
      svg.selectAll("path.chord")
      .filter(function(d) { return d.source.index != i && d.target.index != i; })
      .transition()
      .style("opacity", opacity);
    };
  }

  function updateChords() {
    if(logUpdates) { console.log(Date.now() + "updateChords"); }

    var nodes = dataNodeData;// graph.nodes;

    // Translate message counts for this time range to values in the matrix
    var dataMatrix = sent_or_received ? dataMatrixSent : dataMatrixReceived;

    // Assign Matrix to layout
    layout = getDefaultLayout();
    layout.matrix(dataMatrix);

    // Data join chain
    var groupG = g.selectAll("g.group")
    .data(layout.groups(), function(d) {
      return d.index;
    });

    var chordPaths = g.selectAll("path.chord")
    .data(layout.chords(), chordKey );

    // Enter chain
    var newGroups = groupG.enter().append("g")
    .attr("class","group");

    //newGroups.append("title");

    // Add arcs
    newGroups.append("path")
    .attr("id", function(d) {
      return "group"+d.index;
    })
    .style("fill", function(d) {
      return color(d.index);
    })
    .style("stroke", function(d) { return "#7F7F7F"; })
    .on("mouseover", fade(0.1))
    .on("mouseout", fade(0.7))
    .append("title")
    .text(function(d) { return (nodes[d.index].name); })
    ;



    // Add chords
    var newChords = chordPaths.enter()
    .append("path")
    .attr("class","chord")
    .style("opacity", 0.7)
    .style("fill", function(d) {
      return color(d.source.index);
    })
    .append("title")
    .text(function(d) {
      return nodes[d.source.index].name + "(" + d.source.value + ")" +
        (show_sent_mail ? " - " : " - " )
      +  nodes[d.target.index].name  + "(" + d.target.value + ")";
    })
    //.style("stroke", function(d) { return "#7F7F7F"; })
    ;


    // Update chain

    groupG.select("path")
    .transition()
    .duration(750)
    .attrTween("d", arcTween( last_layout ))
    ;


    chordPaths.transition()
    .duration(750)
    .style("fill", function(d){
      return color(d.source.index);
    })
    .attrTween("d", chordTween(last_layout))
    ;


    // Exit chain
    groupG.exit()
    .transition()
    .duration(350)
    .attr("opacity", 0)
    .remove();

    chordPaths.exit()
    .transition()
    .duration(350)
    .attr("opacity", 0)
    .remove();


    last_layout = layout;
  }

  function updateChordData() {
    //matrix_initialized = true;
    updateChords();
  }

  dataUpdateCallbacks.push(updateChordData);
  //dataUpdateCallbacks.push(updateChordData);

  //updateChordData();
  updateOnSlider.push(updateChordData);
  playerStateCallbacks.push(updateChordData);
}

function drawBarChart(width, height, sent_or_received) {

  var tip = d3.tip().attr("class", "d3-tip")
  .html(function(d) {
    return d.name + "<br>" + d.value;
  });

  var srtext = sent_or_received ? "sent" : "received";
  var chart_container = d3.select("body").append("svg")
    .attr("class", "bar-chart " + srtext)
  .style("display", "inline-box")
    .attr("width", width)
    .attr("height", height);

  var chart_title = sent_or_received ? "Letters Sent" : "Letters Received";

  chart_container.append("text")
  .attr("text-align", "right")
  .attr("x", width)
  .attr("y", 0)
  .attr("dy", "1em")
  .attr("text-anchor", "end")
  .style("font-size", "2em")
  .style("font-weight", "bold")
  .style("fill", "#aaaaaa")
  .text(chart_title);

  var margin = {top: 20, right: 30, bottom: 30, left: 40},
      width = width - margin.left - margin.right,
      height = height - margin.top - margin.bottom;

  var x = d3.scale.ordinal().rangeRoundBands([0, width], 0.1);
  var y = d3.scale.linear().range([height, 0]);

  var xAxis = d3.svg.axis()
    .scale(x)
    .orient("bottom");

  var yAxis = d3.svg.axis()
    .scale(y)
    .orient("left");



  var bar_chart = d3.select(".bar-chart." + srtext)
   .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var x_axis = bar_chart.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);

  var y_axis = bar_chart.append("g")
      .attr("class", "y axis")
      .call(yAxis);

  bar_chart.call(tip);

  function updateBarChart() {
    if(logUpdates) { console.log(Date.now() + "updateBarChart"); }
    var nodes = owl.deepCopy(dataNodeData);//.filter(filterNodesByPlayer);
    var links = owl.deepCopy(dataLinksData);//graph.links;
    var dataMatrix = sent_or_received ? dataMatrixSent : dataMatrixReceived;

    var barData = dataMatrix.map(function(d) {
      return d.reduce(function(prev, cur, inx, arr) {
        return prev + cur;
      }, 0)});

    var indexedBarData = barData.map(
      function(d, i, a) {
        var obj = {
          value: d,
          name: nodes[i].name,
          id: nodes[i].id
        };
        return obj;
      });

    x.domain(nodes.map(function(d){ return d.name;}));
    y.domain([0, d3.max(indexedBarData, function(d){ return d.value;})]);

    x_axis.call(xAxis);
    y_axis.call(yAxis);

    x_axis.selectAll("text")
                .style("text-anchor", "end")
            .attr("dx", "-.8em")
            .attr("dy", ".15em")
    .attr("transform", function(d) { return "rotate(90)"; });

    var dbc = bar_chart.selectAll(".bar").data(indexedBarData);

    // enter
    dbc.enter().append("rect")
    .attr("class","bar")
    .attr("x", function(d) { return x(d.name);})
    .attr("y", function(d) { return y(d.value);})
    .attr("height", function(d) { return height - y(d.value);})
    .attr("width", x.rangeBand())
    .attr("fill", function(d) { return color(d.id);})
    //.append("title")
    //.text(function(d) { return (d.name + " (" + d.value + ")"); })
    .on("mouseover", tip.show)
    .on("mouseout", tip.hide)
    ;

    // update
    dbc.transition()
    .attr("x", function(d) { return x(d.name);})
    .attr("y", function(d) { return y(d.value);})
    .attr("height", function(d) { return height - y(d.value);})
    .attr("width", x.rangeBand())
    .attr("fill", function(d) { return color(d.id);})
    //.append("title")
    //.text(function(d) { return (d.name + " (" + d.value + ")"); })
    ;

    // exit
    dbc.exit().transition()
    .attr("y", 0)
    .attr("height", 0);


  }

  dataUpdateCallbacks.push(updateBarChart);
  updateOnSlider.push(updateBarChart);
  playerStateCallbacks.push(updateBarChart);

}

function drawScatterplot(width, height) {

  var tip = d3.tip().attr("class", "d3-tip")
  .html(function(d) {
    return d.name + "<br>" + d.sent + "<br>" + d.received;
  });

  var chart_container = d3.select("body").append("svg")
    .attr("class", "scatterplot")
    .style("display", "inline-box")
    .attr("width", width)
    .attr("height", height);

  var chart_title = "In/Out Ratio";

  chart_container.append("text")
  .attr("text-align", "right")
  .attr("x", width)
  .attr("y", 0)
  .attr("dy", "1em")
  .attr("text-anchor", "end")
  .style("font-size", "2em")
  .style("font-weight", "bold")
  .style("fill", "#aaaaaa")
  .text(chart_title);

  var margin = {top: 20, right: 30, bottom: 30, left: 40},
      width = width - margin.left - margin.right,
      height = height - margin.top - margin.bottom;

  var x = d3.scale.linear().range([0, width]);
  var y = d3.scale.linear().range([height, 0]);

  var xAxis = d3.svg.axis()
    .scale(x)
    .orient("bottom");

  var yAxis = d3.svg.axis()
    .scale(y)
    .orient("left");

  var scatterplot = d3.select(".scatterplot")
   .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var x_axis = scatterplot.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis);


   x_axis.append("text")
    .attr("class", "label")
    .style("text-anchor", "end")
    .attr("x", width)
    .attr("y", -6)
    .text("messages sent")
  ;

  var y_axis = scatterplot.append("g")
      .attr("class", "y axis")
      .call(yAxis);
  y_axis.append("text")
    .attr("class", "label")
    .attr("transform", "rotate(-90)")
    .style("text-anchor", "end")
      .attr("dy", ".71em")
    .attr("y", 6)
    .text("messages received");

  scatterplot.call(tip);

  var balanceline = scatterplot.append("line")
  .attr("x1", x(0))
  .attr("y1", y(0))
  .attr("x2", x(1))
  .attr("y2", y(1))
  .attr("stroke-width", 1)
  .attr("stroke", "#d0d0d0")
  .attr("class", "balanceline")
  ;

  function updateScatterplot() {
      if(logUpdates) { console.log(Date.now() + "updateScatterplot"); }
      var nodes = owl.deepCopy(dataNodeData);//.filter(filterNodesByPlayer);
      var links = owl.deepCopy(dataLinksData);//graph.links;
      var data_sent = dataMatrixSent;
      var data_received = dataMatrixReceived;

    var sData = data_sent.map(function(d) {
      return d.reduce(function(prev, cur, inx, arr) {
        return prev + cur;
      }, 0)});
    var rData = data_received.map(function(d) {
      return d.reduce(function(prev, cur, inx, arr) {
        return prev + cur;
      }, 0)});

    var indexed_data = sData.map(function(d, i, a) {
      var obj = {
        sent: d,
        received: rData[i],
        name: nodes[i].name,
        id: nodes[i].id
      };
      return obj;
    });

    //console.log(indexed_data);


    x.domain([0, d3.max(indexed_data, function(d) {return d.sent;})]);
    y.domain([0, d3.max(indexed_data, function(d) {return d.received;})]);

    var dim_line = d3.min([d3.max(indexed_data, function(d) {return d.received;}), d3.max(indexed_data, function(d) {return d.sent;})]);
    //console.log(dim_line);

    x_axis.call(xAxis);
    y_axis.call(yAxis);

    var indexed_data2 = indexed_data.map(function(d) {
        var obj = {
        sent: d.sent,
        received: d.received,
        name: d.name,
        id: d.id,
        xval: x(d.sent),
        yval: y(d.received)
      };
      return obj;
    });




    var data_points = scatterplot.selectAll(".datapoint").data(indexed_data2, function(d) {return d.id;});

    data_points.enter()
    .append("circle")
    .attr("class", "datapoint")
    .attr("r", 6)
    .attr("cx", function(d) { return d.xval; })
    .attr("cy", function(d) { return d.yval; })
    .attr("fill", function(d) { return color(d.id);})
    .on("mouseover", tip.show)
    .on("mouseout", tip.hide)
    ;

    data_points.transition()
    .attr("r", 6)
    .attr("cx", function(d) { return d.xval; })
    .attr("cy", function(d) { return d.yval; })
    ;

    data_points.exit().transition().attr("r", 0);

    scatterplot.selectAll(".balanceline")
    .transition()
    .attr("x1", x(0))
    .attr("y1", y(0))
    .attr("x2", x(dim_line))
    .attr("y2", y(dim_line));




  }

  dataUpdateCallbacks.push(updateScatterplot);
  updateOnSlider.push(updateScatterplot);
  playerStateCallbacks.push(updateScatterplot);



}



function setupDataDisplays() {
  drawUpdateButton();

  dataUpdateCallbacks.push(updateDataMatrix);
  playerStateCallbacks.push(updateDataMatrix);
  updateOnSlider.push(updateDataMatrix);
  dataUpdateCallbacks.push(updateSliderData);
  playerStateCallbacks.push(updateSliderData);


  drawPlayerList();
  drawTimeChart(600, 250);
  drawTimeline(600, 15);

  drawNodeGraph(600, 550);

  drawScatterplot(600, 550);

  drawBarChart(450, 350, true);
  drawBarChart(450, 350, false);

  drawChordGraph(true);
  drawChordGraph(false);

  drawMessageList();
}


function drawGraphs() {
  setupDataDisplays();
  updateSourceData();
 // updateSourceData();
}

