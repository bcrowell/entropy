// (c) 2015 Benjamin Crowell, GPL v3

(function() {

  function die(message) {
    throw new Error(message);
  }
  function display_message(m) {
    document.getElementById("message").innerHTML = m;
  }
  function filled_array(size,fill_value) {
    // http://stackoverflow.com/a/13735425/1142217
    return Array.apply(null, Array(size)).map(Number.prototype.valueOf,fill_value);
  }

  var n = 50; // number of particles

  // if invoked with url like velocity.html?foo, we use the query string foo for options
  var url = window.location.href;
  var query = "";
  var match = url.match(/\?(.*)$/);
  if (match!==null) {query=match[1];}
  //console.log("query="+query);
  if (query!="") {
    var options = query.split(",");
    for (var i=0; i<options.length; i++) {
      var o = options[i];
      var match = o.match(/(.*)=(.*)/);
      var option = '';
      var value = '';
      if (match!==null) {option=match[1]; value=match[2];} else {option=o}
      var recognized = false;
      if (option=="n") {
        n = value;
        recognized = true;
      }
    }
  }

  function log_option(option,value) {
    if (value!="") {
      console.log("option "+option+" set to "+value);
    }
    else {
      console.log("option "+option+" set");
    }
  }

  var animation_canvas = document.getElementById('animation_canvas');
  var c = animation_canvas.getContext("2d");
  var cg = graph_canvas.getContext("2d");

  var TIME_INTERVAL = 30; // milliseconds; time interval for animation
  var t = 0;
  var graph_points = [];
  var last_n_left;

  // coordinates are 0<=x<=2, 0<=y<=1
  var x = filled_array(n,0.0);
  var y = filled_array(n,0.0);
  var vx = filled_array(n,0.0);
  var vy = filled_array(n,0.0);

  var animation_is_active = false;
  var interval_id = -1; // for setInterval and clearInterval

  function start_animation() {
    animation_is_active = true;
    interval_id = setInterval(handle_interval_timer,TIME_INTERVAL);
  }
  function stop_animation() {
    animation_is_active = false;
    if (interval_id != -1) {clearInterval(interval_id);}
  }
  function initialize() { // code to be run every time we restart the simulation
    for (var i=0; i<n; i++) {
      x[i] = Math.random();
      y[i] = Math.random();
      var v = 0.02*(1+Math.random()); // if some move very slowly, equilibration takes forever
      var theta = Math.random()*2*Math.PI;
      vx[i] = v*Math.cos(theta);
      vy[i] = v*Math.sin(theta);
      // console.log("v="+Math.sqrt(vx[i]*vx[i]+vy[i]+vy[i]));
    }
    t = 0;
    graph_points = [[t,n]];
    last_n_left = n;
    redraw();
    start_animation();
  }

  initialize();

  function handle_interval_timer() {
    do_motion();
    redraw();
  }

  function reflect_into(x,v,lo,hi) {
    if (x<lo) {return [lo+lo-x,-v];}
    if (x>hi) {return [hi-(x-hi),-v];}
    return [x,v];
  }

  function do_motion() {
    var n_left = 0;
    for (var i=0; i<n; i++) {
      var r;
      r = reflect_into(x[i]+vx[i],vx[i],0,2);
      x[i] = r[0];
      vx[i] = r[1];
      r = reflect_into(y[i]+vy[i],vy[i],0,1);
      y[i] = r[0];
      vy[i] = r[1];
      if (x[i]<1) {++n_left}
    }
    t += TIME_INTERVAL;
    if (n_left!=last_n_left) {
      // console.log("n_left="+n_left);
      last_n_left=n_left;
      graph_points.push([t,n_left]);
    }
  }

  function redraw() {
    redraw_animation(c,animation_canvas.width,animation_canvas.height);
    redraw_graph(cg,graph_canvas.width,graph_canvas.height);
  }

  function redraw_animation(c,w,h) {
    c.fillStyle = "#ffcccc";
    c.fillRect(0,0,w/2,h);
    c.fillStyle = "#ccccff";
    c.fillRect(w/2,0,w/2,h);
    var r = 2; // radius of dots
    for (var i=0; i<n; i++) {
      xx = r+x[i]*(w-2*r)/2;
      yy = r+y[i]*(h-2*r);
      c.beginPath();
      c.arc(xx,yy,r, 0,2*Math.PI,false);
      c.fillStyle = 'black';
      c.fill();
      c.lineWidth = 5;
    }
  }

  function redraw_graph(c,w,h) {
    c.fillStyle = "#ffffff";
    c.fillRect(0,0,w,h);
    for (var i=0; i<graph_points.length; i++) {
      var p1 = graph_points[i];
      var p2;
      if (i<graph_points.length-1) {
        p2 = graph_points[i+1];
      }
      else {
        p2 = [t,last_n_left];
      }
      var x1 = (p1[0]/t)*w;
      var x2 = (p2[0]/t)*w;

      var y = (1.0-(p1[1]/n))*h; // this value continues until p2, where it will later take a step down
      c.beginPath();
      c.strokeStyle = 'red';
      c.lineWidth = 1;
      c.moveTo(x1,y);
      c.lineTo(x2,y);
      c.stroke();

      // and a blue graph, overlaid, for the number on the right:
      var y = (p1[1]/n)*h; 
      c.beginPath();
      c.strokeStyle = 'blue';
      c.lineWidth = 1;
      c.moveTo(x1,y);
      c.lineTo(x2,y);
      c.stroke();

      c.font = '30px Arial'; // apparently there's no way to get around hardcoding the font name?? -$
      c.strokeStyle = 'black';
      c.fillText("n="+n,w/2,h/2); // doesn't work -- why not?

    }
  }



})();
