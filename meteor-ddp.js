var MeteorDdp = function(wsUri) {
	
	var sock;
    var defs = {};          // { id => defObj}
    var watchers = {};      // { coll_name => [handler1, handler2, ...] }
    var collections = {};   // { coll_name => {docId => {}, docId => {}, ...}

    var _handleData = function(data) {
        if (data.collection) {
            console.log(data);

            var collName = data.collection;
            var docId = data.id;

            if (data.set) {
                if (!collections[collName]) {
                    collections[collName] = {};
                    collections[collName][docId] = data.set;
                } else { // already exists, update.
                    console.log('Will update collection');
                }
            } else if (data.unset) {

            }

            console.log('right b4 looping, this is watchers: ');
            console.log(watchers);
            console.log(collName);

            for (var i = 0; i < watchers[collName].length; i+=1) {
                watchers[collName][i].apply(collections);
            }

        } else if (data.methods) {
            console.log(data);
        } else if (data.subs) {
            for (var i = 0; i < data.subs.length; i += 1) {
                defs[data.subs[i]].resolve();
            }
        }
    };

    var Ids = function() {
    var count = 0;
        return {
            next: function() {
                return ++count + '';
            }
        }
    }();

	return {
		connect: function() {
			sock = new WebSocket(wsUri);
            var conn = new $.Deferred();
            var self = this;

			sock.onopen = function() {
				self.send({msg:'connect'});
			};
			sock.onerror = function(err) {
				conn.reject("failure");
			};
			sock.onmessage = function(msg) {
                var data = {};
                
                try {
                    data = JSON.parse(msg.data);
                } catch (err) {
                    conn.reject("Failed to parse response data");
                    return;
                }			

                switch (data.msg) {
                    case 'connected':
                        conn.resolve(data);
                        break;
                    case 'error':
                        defs[data.offending_message.id].reject(data.reason);
                        break;
                    case 'result':
                        defs[data.id].resolve(data.result);
                        break;
                    case 'nosub':
                        defs[data.id].reject(data.error.reason);
                        break;
                    case 'data':
                        _handleData(data);
                        break;
                    default:
                        console.log('Data in unrecognized format');
                        console.log(data);
                }
			};
			return conn.promise();
		},

		call: function(methodName, params)  {
            var id = Ids.next();            
            defs[id] = new $.Deferred();

			var args = params || [];

            var o = {
                msg: 'method',
                method: methodName,
                params: args,
                id: id,
            };
            this.send(o);            
            return defs[id].promise();
		},

		subscribe: function(pubName, params) {            
            var id = Ids.next();
            var args = params || [];

            defs[id] = new $.Deferred();

            var o = {
                msg: 'sub',
                name: pubName,
                params: args,
                id: id
            };
            this.send(o);
            return defs[id].promise();
		},

        watch: function(collectionName, cb) {
            if (!watchers[collectionName]) {
                watchers[collectionName] = [];
            }            
            watchers[collectionName].push(cb);
        },

		send: function(msg) {
			sock.send(JSON.stringify(msg));
		},

        getCollections: function() {
            return collections;
        },

        close: function() {
            sock.close();
        }
	};
};






/* usage */



$(function() {
    var meteorUri = 'ws://localhost:3000/websocket';
    
    var ddp = new MeteorDdp(meteorUri);

    var connect = ddp.connect();

    $("#stopBtn").on('click', function() {
        ddp.close();
    });

    $.when(connect).then(function(response) {        
        // ddp.send({msg: 'method', method:'createPlayer', params:[]});
        
        /*var player = ddp.call('createPlayer');
        player.done(function(id) {
            playerId = id;
        });
        player.fail(function(err) {
            console.log("We failed!!! :(");
            console.log(err);
        });*/


// Example using a pipe:

/*        
        var playerCreated = ddp.call('createPlayer');
        var lobbyJoined = playerCreated.pipe(function(playerId) {
            return ddp.call('joinLobby', [playerId]);
        });

        $.when(lobbyJoined).then(function() {
            console.log(arguments);
            console.log('joined the lobby!');
        });
*/

// Example using when...then:

        var playerCreated = ddp.call('createPlayer');
        $.when(playerCreated).then(function(playerId) {

            var lobbyJoined = ddp.call('joinLobby', [playerId]);
            $.when(lobbyJoined).then(function(){
                setInterval(function() {
                    ddp.call('keepAlive', [playerId]);
                }, 20 * 1000);

                var room = ddp.call('getRoom', [playerId]);
                room.done(function(roomId) {
                    ddp.subscribe('players', [roomId]);
                });

            });

            // var roomSub = ddp.subscribe('rooms', [playerId]);

            // roomSub.done(function() {
            //     console.log('Subbed successfully');
            // })

            // roomSub.fail(function(err){
            //     console.log("Rejected sub");
            //     console.log(err);
            // });

            ddp.watch('players', function(data) {
                console.log('Players changed');
                console.log(data);

            });

            ddp.watch('rooms', function(data) {
                // called whenever rooms has changed.
                console.log('Rooms changed');
                console.log(data);
                console.log('Collections:');
                console.log(collections);
            });
            ddp.subscribe('rooms', [playerId]);




            // var subPlayers = ddp.subscribe('rooms', [playerId]);
            // $.when(subPlayers).then(function(data) {
            //     console.log("SUB to ROOMS!");
            //     console.log("RAW>>>");
            //     console.log(data);
            //     console.log("<<<");
            // });


        }, function(err) {
            console.log('no failed to do it: ' + err);
        });




    }, function(error) {

        console.log('nope FAILURE');

    });

});


