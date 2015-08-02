HTML = /home/bcrowell/Lightandmatter/entropy

install:
	install -D entropy.html $(HTML)/index.html
	install entropy.css entropy.js  $(HTML)
