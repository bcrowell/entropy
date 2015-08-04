// (c) 2015 Benjamin Crowell, GPL v3

(function() {

  function die(message) {
    throw new Error(message);
    stop_animation(); // Why doesn't throwing the error already terminate the program?
  }
  function display_message(m) {
    document.getElementById("message").innerHTML = m;
  }
  function filled_array(size,fill_value) {
    // http://stackoverflow.com/a/13735425/1142217
    return Array.apply(null, Array(size)).map(Number.prototype.valueOf,fill_value);
  }

  var n = 50; // number of particles
  var max_time = 10*60; // in seconds; be well-behaved, and don't eat up CPU forever
  var screen_scale; // pixels per unit of internal distance
  var collisions = true; // Simulate collisions? If not, then this is a noninteracting gas, and the following 
                         // data structures are not actually used.
  var draw_graphs = true;
  var flock = false; // Do an alternative demonstration in which the balls are all initially moving in the same direction.
  var temps = false; // Do an alternative demonstration in which the balls are initially at two different temperatures.
  var torus = false;
  var use_gravity = false;
  var gravity_x = 0.0;
  var gravity_y = 0.0;
  var island = false;
  var wait = false; // wait for the user to click to start the simulation

  // geometry of the box and balls
  var box_size = new Object;
  box_size.x = 2.0; // width
  box_size.y = 1.0; // height
  var ball_radius = 0.012; // in same units as box size; determines size they're drawn with, and also, if collisions
                       // are turned on, the range of the hard-core interaction
  // The following are irrelevant in the default case where island is false.
  var island_x = box_size.x/2;
  var island_y = box_size.y/2;
  var island_r = box_size.y/6;

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
      if (option=="nocoll") {
        collisions = false;
        recognized = true;
      }
      if (option=="flock") {
        flock = true;
        recognized = true;
        draw_graphs = false;
      }
      if (option=="temps") {
        temps = true;
        recognized = true;
        draw_graphs = false;
      }
      if (option=="graphs") {
        draw_graphs = true;
        recognized = true;
      }
      if (option=="nographs") {
        draw_graphs = false;
        recognized = true;
      }
      if (option=="max_time") {
        max_time = parseFloat(value)*60;
        recognized = true;
      }
      if (option=="gx") {
        use_gravity = true;
        gravity_x = parseFloat(value);
        recognized = true;
      }
      if (option=="gy") {
        use_gravity = true;
        gravity_y = parseFloat(value);
        recognized = true;
      }
      if (option=="torus") {
        torus = true;
        recognized = true;
      }
      if (option=="island") {
        island = true;
        recognized = true;
      }
      if (option=="wait") {
        wait = true;
        document.getElementById("pause").innerHTML = "Start";
        recognized = true;
      }
    }
    if (!recognized) {console.log("unrecognized option "+option)}
  }

  // Data structures for efficiently finding impending collisions.
  // We divide the billiard table up into squarish cells and keep track of which ball is in which cell.
  // We only look for collisions between balls that are in the same or adjacent cells, which makes
  // it O(n log n) or something rather than O(n^2). Roughly speaking, we could just test for collisions between balls that
  // are in the same cell, but this won't work correctly in cases where, e.g., ball 1 crosses from cell A into cell B
  // while simultaneously 2 crosses from B into A.
  // Making cells too small means that we have to make the time step small to avoid errors, or, with a fixed time step,
  // fast-moving balls can zip their way past what should have been a collision.
  // Making cells too big leads to inefficiency;
  var desired_balls_per_cell = 1000; // ... so try to guess what's a reasonable size
  var ncell = new Object; // has members .x and .y; set by compute_cell_size, which is called by initialize()
  function compute_cell_size(ncell,box_size,n,desired_balls_per_cell) {
    var w = Math.sqrt(box_size.x * box_size.y * desired_balls_per_cell / n); // roughly what linear dimension we want
    ncell.x = make_natural_number(box_size.x/w);
    ncell.y = make_natural_number(box_size.y/w);
    console.log("ncell="+ncell.x+","+ncell.y); // qwe
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
    cell_i.sort(function(a,b) {
      if (occup[a][1]!=occup[b][1]) {return occup[a][1]-occup[b][1]} else {return occup[a][0]-occup[b][0]}
    });
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
  var cg;
  if (draw_graphs) {cg = graph_canvas.getContext("2d");}

  document.getElementById("pause").addEventListener('click',handle_pause_button,false);
  document.getElementById("reverse").addEventListener('click',handle_reverse_button,false);
  document.getElementById("initialize").addEventListener('click',handle_initialize_button,false);

  function handle_initialize_button() {
    n = parseInt(document.getElementById("nparticles").value);
    stop_animation();
    //console.log("handle_initialize_button");
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

  var TIME_INTERVAL = 0.03; // seconds; time interval for animation
  var t = 0; // total elapsed time, in seconds
  var timer = 0; // pause animation when this reaches max_time, then restart this timer; units of seconds
  var graph_points = [];
  var last_n_left;

  // coordinates are 0<=x<=2, 0<=y<=1
  var x = []; // unitless
  var y = [];
  var vx = []; // units of 1/s
  var vy = [];

  var animation_is_active = false;
  var interval_id = -1; // for setInterval and clearInterval

  function start_animation() { // starts or restarts motion, but doesn't initialize it
    animation_is_active = true;
    interval_id = setInterval(handle_interval_timer,TIME_INTERVAL*1000);
    document.getElementById("pause").innerHTML = "Pause";
    timer = 0;
  }

  function stop_animation() {
    animation_is_active = false;
    if (interval_id != -1) {clearInterval(interval_id);}
    document.getElementById("pause").innerHTML = "Resume";
  }

  window.addEventListener('resize',handle_resize_canvas,false);
  function handle_resize_canvas() {
    set_screen_scale();
    redraw();
  }

  // We call this initially. Scale can also change because (1) the user resizes the browser window,
  // or (2) the user changes the radius of the balls (internal coords only map to the part of the window
  // that doesn't include the border of width equal to the radius).
  function set_screen_scale() {
    screen_scale = animation_canvas.height/(box_size.y+2*ball_radius);
  }

  function initialize() { // code to be run every time we restart the simulation
    // console.log("entering initialize()");
    document.getElementById("nparticles").value = n.toString();
    set_screen_scale();
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
    redraw_background(c,animation_canvas.width,animation_canvas.height); // prepare to draw the balls as we place them
    var fails = new Object;
    fails.max = 10000; // maximum total number of attempts to place balls without having it overlap another ball;
                       // once we do a cumulative number of tries greater than this, we just give up and start
                       // placing them wherever
    fails.so_far = 0;
    x = []; y = [];
    var mode = 'normal';
    if (flock) {mode = 'flock'}
    if (temps) {mode = 'temps'}
    if (mode=='normal') {
      place_balls(n,x,y,0,0,0.5*box_size.x,box_size.y,ball_radius,fails);
      did = true;
    }
    if (mode=='flock') {
      place_balls(n,x,y,0.5*0.33*box_size.x,0.33*box_size.y,0.5*0.67*box_size.x,0.67*box_size.y,ball_radius,fails);
    }
    if (mode=='temps') {
      place_balls(n,x,y,0,0,box_size.x,box_size.y,ball_radius,fails);
    }
    var v_options = new Object;
    if (mode=='flock') {v_options.vx = -1; v_options.vy = -0.777; }
    if (mode=='temps') {v_options.x = x; }
    vx = []; vy = [];
    initialize_motion(n,0.3,vx,vy,mode,v_options);
    t = 0;
    graph_points = [[t,n]];
    last_n_left = n;
    redraw();
  }

  function place_balls(n,x,y,xmin,ymin,xmax,ymax,ball_radius,fails) {
    while (x.length<n) {
      var diam = 2*ball_radius;
      for (;;) {
        for (;;) {
          xx = Math.random()*(xmax-xmin)+xmin;
          yy = Math.random()*(ymax-ymin)+ymin;
          if (!is_in_island(xx,yy)) {break}
        }
        if (fails.so_far>fails.max) {break}
        // console.log("placing ball "+x.length);
        var bad = false;
        for (var j=0; j<i; j++) {
          if (balls_overlap(xx-x[j],yy-y[j],diam)) {bad=true; break}
        }
        if (!bad) {break}
        ++fails.so_far;
      }
      x.push(xx);
      y.push(yy);
      draw_balls(c,animation_canvas.width,animation_canvas.height,i,i);
    }
  }

  function is_in_island(x,y) {
    if (!island) {return false}
    dx = x-island_x;
    dy = y-island_y;
    var rr = island_r+ball_radius;
    if (Math.abs(dx)>rr || Math.abs(dy)>rr) {return false} // quick check for efficiency
    return (dx*dx+dy*dy<rr*rr);
  }

  function initialize_motion(n,scale,vx,vy,mode,options) {
    // scale is a typical velocity scale, in units of s^-1
    var i = 0;
    while (vx.length<n) {
      if (mode=='normal') {
        v = new Object;
        random_maxwellian(v,scale);
        vx.push(v.x);
        vy.push(v.y);
      }
      if (mode=='temps') {
        v = new Object;
        var temp;
        if (options.x[i++]<0.5*box_size.x) {
          temp = 0.2; // cold side
        }
        else {
          temp = 1; // hot side
        }
        random_maxwellian(v,scale*temp);
        vx.push(v.x);
        vy.push(v.y);
      }
      if (mode=='flock') {
        var pert = 0.0; // small random perturbation; if using this, about 0.1 is good
        vx.push(scale*(options.vx+pert*(Math.random()-0.5)));
        vy.push(scale*(options.vy+pert*(Math.random()-0.5)));
      }
    }
  }

  function random_maxwellian(v,scale) {
    // If some molecules move very slowly, equilibration takes forever. Use a Maxwellian, which is physically
    // natural, and also has low probability of small velocities.
    var k = -Math.log(1-Math.random()); // kinetic energy, exponentially distributed
    var speed = scale*Math.sqrt(k); // Maxwellian distribution
    var theta = Math.random()*2*Math.PI;
    v.x = speed*Math.cos(theta);
    v.y = speed*Math.sin(theta);
  }

  initialize();
  if (!wait) {start_animation()}

  function handle_interval_timer() {
    if (timer>max_time) {stop_animation()}
    do_motion();
    redraw();
  }

  function reflect_into(x,v,lo,hi) {
    if (x>lo && x<hi) { return [x,v] }
    if (x<lo) {
      if (torus) {
        return [hi-(lo-x), v];
      }
      else {
        return [lo+lo-x,  -v];
      }
    }
    if (x>hi) {
      if (torus) {
        return [lo+x-hi, v];
      }
      else {
        return [hi-(x-hi),-v];
      }
    }
  }

  // x2=x=m
  function reflect_from_island(ix,iy,ir,x,y,vx,vy) {
    if (!is_in_island(x,y)) {return [x,y,vx,vy]}
    var bx = x-ix; // current radius vector
    var by = y-iy;
    if (dot(bx,by,vx,vy)>0) { return [x,y,vx,vy]} // receding
    var theta = Math.atan2(by,bx);
    var phi = Math.atan2(vy,vx);
    var phi2 = -phi+2*theta+Math.PI;
    var v = Math.sqrt(vx*vx+vy*vy);
    vx = v*Math.cos(phi2);
    vy = v*Math.sin(phi2);
    return [x,y,vx,vy];
  }

  // If the balls are going to collide within time dt, simulate their motion through dt, including
  // both their motion up to the collision and their motion after that. Return true.
  // If they're not going to collide, do nothing and return false.
  function check_for_collision(x,y,vx,vy,l,m,dt,diam) {
    var x1 = x[l];
    var y1 = y[l];
    var x2 = x[m];
    var y2 = y[m];
    var bx = x2-x1; // current radius vector
    var by = y2-y1;
    // Are they approaching, or receding?
    var cx = vx[m]-vx[l]; // current rate of change of radius vector
    var cy = vy[m]-vy[l];
    var bc = dot(bx,by,cx,cy); // dot product of b with c, i.e., of rel. r vector with rel. v vector
    if (bc>=0) {return false} // receding
    // Find out whether they will touch, and if so, the time interval tt after which they will touch.
    // r=b+ct; setting r^2=diam^2 gives a quadratic At^2+Bt+C
    var c2 = magnitude_squared(cx,cy);
    var aa = c2; // A
    var bb = 2*bc; // B
    var cc = magnitude_squared(bx,by)-diam*diam; // C
    var discrim = bb*bb-4*aa*cc;
    if (discrim<0) {return false} // they miss
    var tt = (-bb-Math.sqrt(discrim))/(2*aa); // the solution with - sign is the earlier time
    if (tt>dt) {return false} // they'll collide, but not within this time interval
    // Move them to the point of collision.
    // Note that tt may be negative, in which case the balls have already impinged on each other. That's
    // OK. In that case, we're walking them back to before the collision.
    x[l] = x[l]+vx[l]*tt;
    y[l] = y[l]+vy[l]*tt;
    x[m] = x[m]+vx[m]*tt;
    y[m] = y[m]+vy[m]*tt;
    // Do the collision.
    var vcm_x = .5*(vx[l]+vx[m]); // velocity of center of mass
    var vcm_y = .5*(vy[l]+vy[m]);
    vx[l] = 2*vcm_x-vx[l];
    vy[l] = 2*vcm_y-vy[l];
    vx[m] = 2*vcm_x-vx[m];
    vy[m] = 2*vcm_y-vy[m];
    // Move them beyond the collision
    x[l] = x[l]+vx[l]*(dt-tt);
    y[l] = y[l]+vy[l]*(dt-tt);
    x[m] = x[m]+vx[m]*(dt-tt);
    y[m] = y[m]+vy[m]*(dt-tt);
    return true;
  }

  function balls_overlap(dx,dy,diam) {
    if (Math.abs(dx)>diam || Math.abs(dy)>diam) { return false } // // rough check for efficiency
    return (dx*dx+dy*dy < diam*diam);
  }

  function dot(x1,y1,x2,y2) {
    return x1*x2+y1*y2;
  }

  function magnitude_squared(x,y) {
    return dot(x,y,x,y);
  }

  function do_motion() {
    var collided = new Object; // associative array listing indices of balls that collided and therefore already had
                               // their motion modeled
    if (collisions) {
      assign_balls_to_cells(cell_i,cell_j,cell_u,cell_v,n,x,y,box_size,ncell);
      var coll = []; // compile a list of pairs that may possibly collide because they're in the same or adjacent cells
      // The nested loops over (p,q) are not O(n^2), because we break out of the inner loop early.
      // (l,m) are indices of two balls that may collide.
      var diam = 2*ball_radius;
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
            if (check_for_collision(x,y,vx,vy,l,m,TIME_INTERVAL,diam)) {
              collided[p] = 1;
              collided[q] = 1;
            }
          }
          if (done) {break}
        }
      }
    }
    var n_left = 0;
    for (var i=0; i<n; i++) {
      var r;
      if (!collided[i]) { // If they collided, then we already modeled their motion.
        x[i] = x[i]+vx[i]*TIME_INTERVAL;
        y[i] = y[i]+vy[i]*TIME_INTERVAL;
      }
      r = reflect_into(x[i],vx[i],0,box_size.x);
      x[i] = r[0];
      vx[i] = r[1];
      r = reflect_into(y[i],vy[i],0,box_size.y);
      y[i] = r[0];
      vy[i] = r[1];
      if (island) {
        r = reflect_from_island(island_x,island_y,island_r,x[i],y[i],vx[i],vy[i]);
        x[i] = r[0]; y[i] = r[1]; vx[i] = r[2]; vy[i] = r[3];
      }
      if (x[i]<box_size.x/2) {++n_left}
    }
    t += TIME_INTERVAL;
    timer += TIME_INTERVAL;
    if (n_left!=last_n_left) {
      // console.log("n_left="+n_left);
      last_n_left=n_left;
      graph_points.push([t,n_left]);
    }
    if (use_gravity) {
      for (var i=0; i<n; i++) {
        vx[i] = vx[i]+gravity_x*TIME_INTERVAL;
        vy[i] = vy[i]+gravity_y*TIME_INTERVAL;
      }
    }
  }

  function redraw() {
    redraw_animation(c,animation_canvas.width,animation_canvas.height);
    if (draw_graphs) {redraw_graph(cg,graph_canvas.width,graph_canvas.height)}
  }

  function redraw_animation(c,w,h) {
    redraw_background(c,w,h);
    draw_balls(c,w,h);
  }

  function draw_balls(c,w,h,n1,n2) { // n1 and n2 are optional
    if (typeof(n1)==='undefined') {n1=0}
    if (typeof(n2)==='undefined') {n2=n-1}
    var r = ball_radius*screen_scale; // radius of dots
    for (var i=n1; i<=n2; i++) {
      xx = r+x[i]*screen_scale;
      yy = r+y[i]*screen_scale;
      c.beginPath();
      c.arc(xx,yy,r, 0,2*Math.PI,false);
      c.fillStyle = 'black';
      c.fill();
      c.lineWidth = 5;
    }
  }

  function redraw_background(c,w,h) {
    c.fillStyle = "#ffcccc";
    c.fillRect(0,0,w/2,h);
    c.fillStyle = "#ccccff";
    c.fillRect(w/2,0,w/2,h);
    if (island) {
      c.beginPath();
      c.arc((island_x+ball_radius)*screen_scale,(island_y+ball_radius)*screen_scale,island_r*screen_scale, 0,2*Math.PI,false);
      c.fillStyle = 'white';
      c.fill();
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
