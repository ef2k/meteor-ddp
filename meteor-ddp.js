MeteorDdp = function(wsUri) {
    this.wsUri = wsUri;
    this.sock;
    this.defs = {};         // { id => defObj}
    this.watchers = {};     // { coll_name => [handler1, handler2, ...] }
    this.collections = {};  // { coll_name => {docId => {}, docId => {}, ...}
};

MeteorDdp.prototype._handleData = function(data) {
    if (data.collection) {

        var collName = data.collection;
        var docId = data.id;

        if (data.set) {
            if (!this.collections[collName]) {
                this.collections[collName] = {};
                this.collections[collName][docId] = data.set;
            } else {
                // TODO: Update stuff
            }
        } else if (data.unset) {
            // TODO: Remove stuff
        }
        
        // TODO: Report that collection changed

    } else if (data.methods) {
        // TODO data is acked?
    } else if (data.subs) {
        for (var i = 0; i < data.subs.length; i += 1) {
            this.defs[data.subs[i]].resolve();
        }
    }
};

MeteorDdp.prototype._Ids = function() {
    var count = 0;
    return {
        next: function() {
            return ++count + '';
        }
    }
}();

MeteorDdp.prototype.connect = function() {
    var self = this;
    var conn = new $.Deferred();

    self.sock = new WebSocket(self.wsUri);

    self.sock.onopen = function() {
        self.send({
            msg: 'connect'
        });
    };

    self.sock.onerror = function(err) {
        conn.reject("failure");
    };

    self.sock.onmessage = function(msg) {
        var data = JSON.parse(msg.data);

        switch (data.msg) {
        case 'connected':
            conn.resolve(data);
            break;
        case 'error':
            self.defs[data.offending_message.id].reject(data.reason);
            break;
        case 'result':
            self.defs[data.id].resolve(data.result);
            break;
        case 'nosub':
            self.defs[data.id].reject(data.error.reason);
            break;
        case 'data':
            self._handleData(data);
            break;
        default:
            console.log('Data in unrecognized format: ', data.msg);
        }
    };
    return conn.promise();
};

MeteorDdp.prototype._deferredSend = function(actionType, name, params) {
    var id = this._Ids.next();
    this.defs[id] = new $.Deferred();

    var args = params || [];

    var o = {
        msg: actionType,
        params: args,
        id: id
    };

    if (actionType === 'method') {
        o.method = name;
    } else if (actionType === 'sub') {
        o.name = name;
    }

    this.send(o);
    return this.defs[id].promise();
};

MeteorDdp.prototype.call = function(methodName, params) {
    return this._deferredSend('method', methodName, params);
};

MeteorDdp.prototype.subscribe = function(pubName, params) {
    return this._deferredSend('sub', pubName, params);
};

MeteorDdp.prototype.watch = function(collectionName, cb) {
    if (!this.watchers[collectionName]) {
        this.watchers[collectionName] = [];
    }
    this.watchers[collectionName].push(cb);
};

MeteorDdp.prototype.send = function(msg) {
    this.sock.send(JSON.stringify(msg));
};

MeteorDdp.prototype.close = function() {
    this.sock.close();
};