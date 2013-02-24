Meteor-DDP
==========

A promise-based Meteor DDP client for version `pre1`.
*Currently working to support DDP spec changes in Meteor 0.5.7.*

Dependencies
--------------------
* jQuery 1.5+ (Uses `$.Deferred`)


Methods
------------

* **connect()** - Starts a WebSocket connection and lets the server know we're about to talk some DDP. *Returns -> Promise which resolves on succesful connection.*

```js
var ddp = new MeteorDdp('ws://yourApp.meteor.com/websocket');
ddp.connect().done(function() {
  console.log('Connected!');
});
```
  
* **call(methodName, [params, ...])** - Does a Remote Procedure Call on any method exposed through `Meteor.methods` on the server. *Returns -> Promise which resolves with any returned data.*

```js
/* Lets say we can RPC a createPlayer method which returns a playerId. Lets also say 
   that we need the playerId in order to join a game (via a joinGame method 
   which returns a gameId). Here's a couple of ways to do this with promises: 
*/

// Using the done method...
var createPlayer = ddp.call('createPlayer');
createPlayer.done(function(playerId) {
  var joinGame = ddp.call('joinGame', [playerId]);
  joinGame.done(function(gameId) {
    console.log("We joined a game, here's the game id: ", gameId);
  });
});

// We can pipe it...
var createPlayer = ddp.call('createPlayer');
var joinGame = createPlayer.pipe(function(playerId) {
  return ddp.call('joinGame', [playerId]);
});
joinGame.done(function(gameId) {
  console.log('We joined a game: ', gameId);
});

// We can use when...then...
$.when(ddp.call('createPlayer')).then(function(playerId) {
  ddp.call('joinGame', [playerId]).done(function(gameId) {
    console.log('We joined a game! Game id: ', gameId);
  });
});
```

* **subscribe(subscriptionName, [params, ...])** - Subscribes to data published on the server. You can observe changes on a collection by using the 'watch' method. *Returns -> Promise which resolves on successful subscription and fails otherwise.*

```js
// Subscribing returns a promise which resolved on success, but 
// you probably only care if the subscription fails...
ddp.subscribe('plyers', [gameId]).fail(function(err) {
  console.log('We actually wanted to subscribe to players not plyers...');
});
```

* **watch(collectionName, callback)** - Observe a collection and be notified whenever that collection changes via your callback. A copy of the modified document will be sent as argument to the callback. *Returns -> void*

```js
// So say we subscribed to the `players` collection and want to be notified when any change occurs:
ddp.watch('players', function(changedDoc) {
  console.log("The players collection changed. Here's what changed: ", changedDoc);

  // Was it deleted?
  if (changedDoc.__wasDeleted) {
    console.log("This document doesn't exist in our collection anymore :(");
  }

});
```

* **close()** - Closes the WebSocket connection. *Returns -> void*

```js
ddp.close(); // yeah...
```