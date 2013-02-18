// /* Desired usage */

// var ddp = new MeteorDdp();

// var conn = ddp.connect();
// conn.success(function() { console.log('successful conn')});
// conn.failure(function(err) { console.log('failed conn')});

// var playerPromise = ddp.call('createPlayer');
// playerPromise.success(function(data) { console.log('got that data')});
// playerPromise.failure(function() { console.log('failed to get that data')});

// var roomPromise = ddp.call('getRoom', [playerId]);
// roomPromise.success(function() ...);
// roomPromise.failure(function() ...);

// $.when(playerPromise, roomPromise).then(function() {
// 	// do something when player and room are resolved.
// });

// var players = ddp.sub('players');
// // players.response(function(data) {console.log('data here' + data)});
// players.response(playersChanged);
// players.failure(function(err) {console.log('fail. ' + err)});




var MeteorDdp = function(wsUri) {
	
	var sock;
    var defs = {};
    var subHandlers = [];

    var _handleData = function(data) {
        if (data.collection) {
            console.log(data);
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

		subscribe: function(pubName, params, cb) {            
            var id = Ids.next();
            var args = params || [];

            defs[id] = new $.Deferred();

            subHandlers[pubName] = cb;

            var o = {
                msg: 'sub',
                name: pubName,
                params: args,
                id: id
            };
            this.send(o);
            return defs[id].promise();
		},

		send: function(msg) {
			sock.send(JSON.stringify(msg));
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

            var roomSub = ddp.subscribe('currRoom', [playerId]);

            roomSub.done(function() {
                console.log('Subbed successfully');
            })

            roomSub.fail(function(err){
                console.log("Rejected sub");
                console.log(err);
            })

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



















