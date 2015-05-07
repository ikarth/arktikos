# Arktikos

Arktikos is an application for managing email-based moderated peer-to-peer games like [Callisto](http://www.vsca.ca/Callisto/). It tracks messages sent, what conversations are going on, and (eventually) lets the moderator keep tabs on which messages need attention.

Arktikos is in a very alpha state right now, but despite what the Bothans told you it is fully operational.

### About the name
"Arktikos", meaning "near the bear", the root word for "Artic". Arktikos is in the region of Callisto.

## Live Demo

http://callisto.isaackarth.com/arktikos/

## Prerequisites

You will need [Leiningen][] 2.0.0 or above installed.

[leiningen]: https://github.com/technomancy/leiningen

## Running

To start a web server for the application, run:

    lein ring server

This is, admittedly, a bit bare metal right now. It'd be nice to get it packaged up so that people can run it without editing the code or needing Leiningen.


## TODO

A lot of stuff:

* Clean up configuration files so you don't have to read the setup code.
* Clean up the frontend display:
  * Improve the UI
  * Move JSON data updates to unified function that all the graphs can share
  * Add more graphs and data displays
* Better distribution, in a downloadable package

## License

Arktikos is Copyright © 2015 Isaac Karth and distributed under the Eclipse Public License either version 1.0 or (at your option) any later version.

"Callisto" is associated with Brad Murray and [VSCA publishing](VSCA publishing).

Contributions are accepted, providing that they are submitted under the same licence.
