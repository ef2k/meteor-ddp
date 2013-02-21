$(function() {
  var uri = 'ws://wordrush.meteor.com/websocket';
  var ddp = new MeteorDdp(uri);

  $('#stopBtn').on('click', function() {
    ddp.close();
    $(this).attr("disabled", "disabled");
  });

  ddp.connect().done(function() {

    var createPlayer = ddp.call('createPlayer');
    var playerId;

    var joinLobby = createPlayer.pipe(function(id) {
      playerId = id;
      setInterval(function() {
        ddp.call('keepAlive', [playerId]);
      }, 20 * 1000);
      return ddp.call('joinLobby', [playerId]);
    });

    $.when(joinLobby).then(function(roomId) {

      ddp.subscribe('rooms', [playerId]);
      ddp.subscribe('players', [roomId]);

      ddp.watch('rooms', function(changedDoc) {
        console.log('This doc changed: ', changedDoc);
      }); 

    });


  });
});