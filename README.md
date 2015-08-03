Entropy
=======

A browser-based application that shows an ideal gas expanding freely
when a partition is removed between the two sides of a box.
The atoms are modeled as hard billiard balls that collide elastically.
Because the gas is ideal, the temperature stays the same during the expansion
while the entropy increases.
Graphs on the bottom show the evolution of the number of particles
in each side over time.

The idea for this app was shamelessly copied from
[this java applet](http://stp.clarku.edu/simulations/approachtoequilibrium/index.html).
I was motivated to write my own knock-off using HTML 5 because of hassles relating to
the current state of java applets.

Options
=======

In addition to the GUI controls on the screen, which should be self-explanatory,
there are some options that can be controlled by typing in a URL with something
like "?foo=42,bar=137" on the end. Here foo and bar would be the names of options,
and 42 and 137 their values.

* n - the number of particles
* r - the radius of the particles (in units of the height of the box)
* nocoll - Don't model collisions. With this option, the atoms don't interact
           at all, and pass through each other like ghosts. This makes the
           simulation more efficient for large values of n, but causes funky-looking
           dynamics in the graphs as the system approaches equilibrium.
* nographs - Don't draw the graphs.
* graphs - Draw the graphs (is the default unless flock is set).
* flock - Do an alternative demonstration in which the balls are all initially moving in the same direction.
* max_time - Maximum time, in minutes, for which the simulation will run (default=10).

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
