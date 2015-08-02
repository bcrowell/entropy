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
  var MAX_TIME = 600; // in seconds; be well-behaved, and don't eat up CPU forever

  // geometry of the box and balls
  var box_size = new Object;
  box_size.x = 2.0; // width
  box_size.y = 1.0; // height
  ball_radius = 0.012; // in same units as box size; determines size they're drawn with, and also, if collisions
                       // are turned on, the range of the hard-core interaction

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
        n = parseInt(value);
        document.getElementById("nparticles").value = n.toString();
        recognized = true;
      }
      if (option=="r") {
        ball_radius = parseFloat(value);
        recognized = true;
      }
    }
  }

  var collisions = true; // Simulate collisions? If not, then this is a noninteracting gas, and the following 
                         // data structures are not actually used.
  // We divide the billiard table up into squarish cells and keep track of which ball is in which cell.
  // We only look for collisions between balls that are in the same or adjacent cells, which makes
  // it O(n log n) or something rather than O(n^2). Roughly speaking, we could just test for collisions between balls that
  // are in the same cell, but this won't work correctly in cases where, e.g., ball 1 crosses from cell A into cell B
  // while simultaneously 2 crosses from B into A.
  // Making cells too small means that we have to make the time step small to avoid errors.
  // Making it too big leads to inefficiency;
  var desired_balls_per_cell = 1; // ... so try to guess what's a reasonable size
  var ncell = new Object; // has members .x and .y; set by compute_cell_size, which is called by initialize()
  function compute_cell_size(ncell,box_size,n,desired_balls_per_cell) {
    var w = Math.sqrt(box_size.x * box_size.y * desired_balls_per_cell / n); // roughly what linear dimension we want
    ncell.x = make_natural_number(box_size.x/w);
    ncell.y = make_natural_number(box_size.y/w);
    // console.log("ncell="+ncell.x+","+ncell.y);
  }
  function make_natural_number(x) {
    var m = Math.round(x);
    if (m<1) {m=1}
    return m;
  }
  // Each of the following four data structures is a list of indices referring to balls, sorted in a certain
  // way. Here i means the x index of each cell, u=i-j, and v=i+j. These arrays are initialized by initialize() and
  // updated by assign_balls_to_cells(). The point of all this is to have an O(n log n) way of searching for possible
  // collisions; only balls in adjacent cells can collide within a certain time window.
  var cell_i = []; // row-major order; each row is contiguous; indexed on (i,j), with i varying faster
  var cell_j = []; // (i,j), with j varying faster
  var cell_u = []; // (u,v), with u varying faster
  var cell_v = []; // (u,v), with v varying faster
  var occup = []; // an array of the form [[i0,j0,u0,v0], ... ], giving the i,j,u,v for each ball
  function assign_balls_to_cells(cell_i,cell_j,cell_u,cell_v,n,xx,yy,box_size,ncell) {
    var w = box_size.x/ncell.x; // width of each cell
    var h = box_size.y/ncell.y; // height
    for (var m=0; m<n; m++) {
      var x = xx[m];
      var y = yy[m];
      var i = Math.floor(x/w);
      var j = Math.floor(y/h);
      occup[m] = [i,j,i-j,i+j];
    }
    // Normally not very many balls will have changed cells, so the following sorts should be very quick.
    // for (var m=0; m<n; m++) {console.log("before sort, cell_i["+m+"]="+cell_i[m])} // qwe
    cell_i.sort(function(a,b) {
      if (occup[a][1]!=occup[b][1]) {return occup[a][1]-occup[b][1]} else {return occup[a][0]-occup[b][0]}
    });
    // for (var m=0; m<n; m++) {console.log("after sort, cell_i["+m+"]="+cell_i[m])} // qwe
    if (cell_i[0]==cell_i[1]) {
      console.log("occup[0]="+occup[0]+", occup[1]="+occup[1]);
      die ("oh, no!"); 
      stop_animation();
    }
    cell_j.sort(function(a,b) {
      if (occup[a][0]!=occup[b][0]) {return occup[a][0]-occup[b][0]} else {return occup[a][1]-occup[b][1]}
    });
    cell_u.sort(function(a,b) {
      if (occup[a][3]!=occup[b][3]) {return occup[a][3]-occup[b][3]} else {return occup[a][2]-occup[b][2]}
    });
    cell_v.sort(function(a,b) {
      if (occup[a][2]!=occup[b][2]) {return occup[a][2]-occup[b][2]} else {return occup[a][3]-occup[b][3]}
    });
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

  document.getElementById("pause").addEventListener('click',handle_pause_button,false);
  document.getElementById("reverse").addEventListener('click',handle_reverse_button,false);
  document.getElementById("initialize").addEventListener('click',handle_initialize_button,false);

  function handle_initialize_button() {
    n = parseInt(document.getElementById("nparticles").value);
    stop_animation();
    initialize();
  }

  function handle_pause_button() {
    if (animation_is_active) {
      stop_animation();
    }
    else {
      start_animation();
    }
  }

  function handle_reverse_button() {
    for (var i=0; i<vx.length; i++) {
      vx[i] = -vx[i];
      vy[i] = -vy[i];
    }
  }

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

  function start_animation() { // starts or restarts motion, but doesn't initialize it
    animation_is_active = true;
    interval_id = setInterval(handle_interval_timer,TIME_INTERVAL);
    document.getElementById("pause").innerHTML = "Pause";
  }

  function stop_animation() {
    animation_is_active = false;
    if (interval_id != -1) {clearInterval(interval_id);}
    document.getElementById("pause").innerHTML = "Resume";
  }

  function initialize() { // code to be run every time we restart the simulation
    if (collisions) {
      compute_cell_size(ncell,box_size,n,desired_balls_per_cell);
      for (var m=0; m<n; m++) {
        cell_i[m] = m;
        cell_j[m] = m;
        cell_u[m] = m;
        cell_v[m] = m;
        occup[m] = [0,0,0,0];
      }
      assign_balls_to_cells(cell_i,cell_j,cell_u,cell_v,n,x,y,box_size,ncell);
    }
    for (var i=0; i<n; i++) {
      x[i] = Math.random();
      y[i] = Math.random();
      // If some molecules move very slowly, equilibration takes forever. Use a Maxwellian, which is physically
      // natural, and also has low probability of small velocities.
      var k = -Math.log(1-Math.random()); // kinetic energy, exponentially distributed
      var v = 0.01*Math.sqrt(k); // Maxwellian distribution
      var theta = Math.random()*2*Math.PI;
      vx[i] = v*Math.cos(theta);
      vy[i] = v*Math.sin(theta);
      // console.log("v="+Math.sqrt(vx[i]*vx[i]+vy[i]+vy[i]));
    }
    t = 0;
    graph_points = [[t,n]];
    last_n_left = n;
    redraw();
  }

  initialize();
  start_animation();

  function handle_interval_timer() {
    if (t>MAX_TIME*1000) {stop_animation()}
    do_motion();
    redraw();
  }

  function reflect_into(x,v,lo,hi) {
    if (x<lo) {return [lo+lo-x,-v];}
    if (x>hi) {return [hi-(x-hi),-v];}
    return [x,v];
  }

  function check_for_collision(x,y,vx,vy,l,m) {
    var diam = 2*ball_radius;
    if (Math.abs(x[l]-x[m])<diam && Math.abs(y[l]-y[m])<diam) {
      console.log("collision at x="+x[l]+", y="+y[l]+", balls "+l+" "+m);
    }
  }

  function do_motion() {
    if (collisions) {
      assign_balls_to_cells(cell_i,cell_j,cell_u,cell_v,n,x,y,box_size,ncell);
      var coll = []; // compile a list of pairs that may possibly collide because they're in the same or adjacent cells
      // The nested loops over (p,q) are not O(n^2), because we break out of the inner loop early.
      // (l,m) are indices of two balls that may collide.
      for (var stripe=0; stripe<=3; stripe++) { // 0=i, 1=j, 2=u, 3=v
        done = false;
        var s2;
        var c;
        if (stripe==0) {c=cell_i; s2=1;}
        if (stripe==1) {c=cell_j; s2=0;}
        if (stripe==2) {c=cell_u; s2=3;}
        if (stripe==3) {c=cell_v; s2=2;}
        for (var p=0; p<n-1; p++) {
          var l=c[p];
          var e=occup[l][stripe]; // is i if stripe=0, etc.
          var f=occup[l][s2];
          for (var q=p+1; q<n; q++) {
            var m=c[q];
            var ee=occup[m][stripe]; 
            var ff=occup[m][s2];
            if (ff != f) {done=true; break}
            if (ee>e+1) {done=true; break}
            if (e==ee && stripe>0) {continue} // same cell, and already handled at stripe==0
            check_for_collision(x,y,vx,vy,l,m);
          }
          if (done) {break}
        }
      }
    }
    var n_left = 0;
    for (var i=0; i<n; i++) {
      var r;
      r = reflect_into(x[i]+vx[i],vx[i],0,box_size.x);
      x[i] = r[0];
      vx[i] = r[1];
      r = reflect_into(y[i]+vy[i],vy[i],0,box_size.y);
      y[i] = r[0];
      vy[i] = r[1];
      if (x[i]<box_size.x/2) {++n_left}
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
    var r = ball_radius*h/box_size.y; // radius of dots
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
