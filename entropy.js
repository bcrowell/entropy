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
      if (option=="foo") {
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

  var TIME_INTERVAL = 10; // milliseconds; time interval for animation

  var n = 10; // number of particles
  // coordinates are 0<=x<=2, 0<=y<=1
  var x = filled_array(n,0);
  var y = filled_array(n,0);


  function initialize() {
    display_message("hello, world");
    for (var i=0; i<n; i++) {
      x[i] = Math.random();
      y[i] = Math.random();
    }
    redraw();
  }

  initialize();

  function handle_interval_timer() {
  }

  function get_w() {
    return animation_canvas.width;
  }

  function get_h() {
    return animation_canvas.height;
  }
  
  function redraw() {
    var w = get_w();
    var h = get_h();
    c.fillStyle = "#ffcccc";
    c.fillRect(0,0,w/2,h);
    c.fillStyle = "#ccccff";
    c.fillRect(w/2,0,w/2,h);
    var r = 5; // radius of dots
    for (var i=0; i<n; i++) {
      xx = r+x[i]*(w/2-2*r);
      yy = r+y[i]*(h-2*r);
      c.beginPath();
      c.arc(xx,yy,r, 0,2*Math.PI,false);
      c.fillStyle = 'black';
      c.fill();
      c.lineWidth = 5;
    }
  }




})();
