Entropy
=======

This is a browser-based educational application that simulates an ideal gas consisting
of identical, classical, hard spheres moving around inside a two-dimensional box.
All collisions are perfectly elastic.
To learn more about the specific mathematical properties of this sort of
physical model, the keyword to search on is "dynamical billiards."

The idea for this app was shamelessly copied from
[this java applet](http://stp.clarku.edu/simulations/approachtoequilibrium/index.html).
I was motivated to write my own knock-off using HTML 5 because of hassles relating to
the current state of java applets.

Sample demonstrations
=====================

Each of the following URLs will run the simulation with a certain setup, designed to
demonstrate the educational point in the subsequent description.

http://www.lightandmatter.com/entropy?wait

A demo of free expansion and the second law. Click the Start button to
see the demonstration run. (This is the reason for the "wait" option
in this url and the others below; in a lecture, it gives time to say
something to the class before everything starts moving.) The particles
are all initially on one side of the box, and they then expand freely.
Because the gas is ideal, the temperature stays the same during the expansion
while the entropy increases.
The graphs show the number of particles on each side of the box, which
gives a quantitative view of the system reaching equilibrium and
fluctuating away from equilibrium. By increasing the number of
particles you can see that the fluctuations get smaller in relative
terms. If you hit the "Reverse velocities" button you can see the
system move back to its initial state, violating the second law. 

http://www.lightandmatter.com/entropy?flock,wait

The particles are all initially concentrated in one region of space
and moving in the same direction. Because this particular version of
the system is not ergodic, thermal equilibrium is never reached.
Although the flock spreads out spatially due to collisions, it remains
confined to a small portion of the phase space in terms of momentum.
This doesn't violate the second law, since the second law doesn't
demand that the entropy increase at any nonzero rate. 

http://www.lightandmatter.com/entropy?gy=2,flock,wait

Adding gravity in the y direction breaks part of the system's
unrealistically perfect symmetry and causes the y momentum to
equilibrate. 

http://www.lightandmatter.com/entropy?gx=3,gy=2,flock,wait

Adding an x component to gravity makes all the degrees of freedom
equilibrate. 

http://www.lightandmatter.com/entropy?island,flock,wait

Another way of getting rid of the non-ergodic behavior is to add a
circular island in the middle of the box. This is known as Sinai's
billiards. The island acts as a diverging lens. 

http://www.lightandmatter.com/entropy?temps,n=300,wait

The whole box is uniformly filled with particles, but with unequal
temperatures on the two sides

http://www.lightandmatter.com/entropy?temps,n=300,wait,mark

By adding ",mark" to any of these URLs, you can cause one of the
particles to be marked in red. This allows you to look at ideas like
diffusion and the mean free path. 

Options
=======

In addition to the GUI controls on the screen, which should be self-explanatory,
there are some options that can be controlled by typing in a URL with something
like "?foo,bar=137" on the end. Here foo and bar would be the names of options.
The option foo is one that we just turn on like a switch, while the option bar
is one that takes a numerical value for a parameter

* wait - Don't start the simulation until the user clicks on Start. Useful when using the simulation in a classroom
          demonstration, where we want to be able to explain before things start moving.
* n - the number of particles
* r - the radius of the particles (in units of the height of the box)
* nocoll - Don't model collisions. With this option, the atoms don't interact
           at all, and pass through each other like ghosts. This makes the
           simulation more efficient for large values of n, but e.g., in the default demo it causes funky-looking
           dynamics in the graphs as the system approaches equilibrium.
* nographs - Don't draw the graphs.
* graphs - Draw the graphs (is the default unless flock is set).
* flock - Do a demonstration in which the balls are all initially moving in the same direction.
* temps - Do a demonstration in which the balls on the two sides of the box are initially
           at different temperatures.
* max_time - Maximum time, in minutes, for which the simulation will run (default=10).
* torus - Use the topology of a torus, i.e., balls that go off one side of the box "wrap around."
* gx - a numerical value for gravity in the x direction (default=0); units are box height per second squared
* gy - similar for y
* island - put an island in the middle of the box, as in Sinai's billiards
* mark - paint one ball a different color


To do
=====
In temps mode, graph the temperatures of the two sides.

Gory details
============

The balls are given initial velocities that are chosen according to a Maxwellian
distribution.

An attempt is made to place the balls initially so that they do not overlap in space.
When the number of balls is too large, this may be difficult or impossible, so the
code will just give up at some point and start placing balls in random positions,
causing overlaps.

The code handles collisions in a way that is intended to be as efficient as possible
for large numbers of particles, at the expense of perfect accuracy.
Fast-moving particles may fail to collide when they should.
When three or more balls are involved in mutual collisions within a short time, the
result may not be accurate.

Bugs
====
The balls rebound from the right side of the box a little before they should;
an empty strip exists with a width equal to the diameter of the balls.

The labels on the axes of the graph don't show up.
