Entropy
=======

A browser-based application that shows a gas expanding freely
when a partition is removed between the two sides of a box.
Graphs on the bottom show the evolution of the number of particles
in each side over time.

The idea for this app was shamelessly copied from
[this java applet](http://stp.clarku.edu/simulations/approachtoequilibrium/index.html).
I was motivated to write my own knock-off using HTML 5 because of hassles relating to
the current state of java applets.

In addition to the GUI controls on the screen, which should be self-explanatory,
there are some options that can be controlled by typing in a URL with something
like "?foo=42,bar=137" on the end. Here foo and bar would be the names of options,
and 42 and 137 their values. You can set the number of particles n this way, and
also their radius r (in units of the height of the box).

Bugs
====
The balls rebound from the right side of the box a little before they should.

Fast-moving particles may fail to collide when they should.
