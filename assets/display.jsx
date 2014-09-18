/** @jsx React.DOM */
(function(exports) {

// Widget to show monitors
var IndexBrowser = React.createClass({
  render: function() {
    return (
        <div>
        <h1>Index Management</h1>
        <h2>Namespaces <small>list all available namespaces</small></h2>
        <NamespaceTable />
        <h2>Ping <small>check if the server is up</small></h2>
        <ComponentThatGoesPing />
        </div>
    );
  }
});

var NamespaceTable = React.createClass({
  getInitialState: function () {
    return {
      continuationToken: null,
      namespaces: []
    }
  },
  componentDidMount: function() {
    this.loadNamespaces();
  },
  clearNamespaces: function() {
    this.setState({
      continuationToken: null,
      namespaces: []
    });
    this.loadNamespaces();
  },
  loadNamespaces: function() {
    var query = {};
    if (this.state.continuationToken) {
      query['continuationToken'] = this.state.continuationToken
    }
    request
      .get(apiRoot + 'namespaces/')
      .query(query)
      .end()
      .then(function(res) {
        console.log('Received list of namespaces from index');
        var namespaces = res.body.namespaces;
        var conToken = res.body.continuationToken;
        this.setState({
          continuationToken: conToken || null,
          namespaces: this.state.namespaces.concat(namespaces)
        });
      }.bind(this))
      .then(null, function(err) {
        console.log("Error fetching namespace list");
        console.error(err);
      });
  },
  render: function() {
    return (
      <div>
      <table className="table table-bordered table-hover">
      <thead><tr><th>Name</th><th>Expires</th></tr></thead>
      <tbody>
      {
        this.state.namespaces.map(function(ns){
          return <NamespaceRow name={ns.name}
                  expires={ns.expires}
                  key={ns.namespace} /> 
        }, this)
      }
      </tbody>
      </table>
      <ListButtons 
        loadMoreHandler={this.loadNamespaces}
        resetHandler={this.clearNamespaces}
        hasMore={!!this.state.continuationToken} />
      </div>
    );
  }
});

var NamespaceRow = React.createClass({
  render: function() {
    var date = new Date();
    date.setTime(Date.parse(this.props.expires));
    var hoomanFormat = humaneDate(date);
    date = date.toUTCString() + ' (' + hoomanFormat + ')';

    return <tr><td>{this.props.name}</td><td>{date}</td></tr>;
  }
});

var LoadMoreButton = React.createClass({
  render: function() {
    return (<button disabled={!this.props.hasMore}
              className='btn btn-primary'
              onClick={this.props.handler}>Load More</button>);
  }
});

var ResetButton = React.createClass({
  render: function() {
    return (<button onClick={this.props.handler}
            className='btn btn-default'>Clear and reload</button>);
  }
});

var ListButtons = React.createClass ({
  render: function() {
    return (<div><LoadMoreButton hasMore={this.props.hasMore}
            handler={this.props.loadMoreHandler} />
            <ResetButton handler={this.props.resetHandler} /></div>);
  }
});

var ComponentThatGoesPing = React.createClass({
  getInitialState: function(){
    return {
      alive: null,
      uptime: null
    };
  },
  pingServer: function() {
    request
      .get(apiRoot + 'ping/')
      .end()
      .then(function(res) {
        console.log('Received a ping');
        var alive = res.body.alive;
        var uptime = res.body.uptime;
        this.setState({
          alive: alive,
          uptime: uptime
        });
      }.bind(this))
      .then(null, function(err) {
        console.log("Error pinging server");
        console.err(err);
        this.setState({
          alive: false
        });
      });    
  },
  render: function() {
    return <div><PingButton handler={this.pingServer} />
           <PingResult alive={this.state.alive} uptime={this.state.uptime} /></div>;
  }
});

var PingButton = React.createClass({
  render: function() {
    return <button onClick={this.props.handler} 
            className='btn btn-primary'>Ping Server</button>;
  }
});

var PingResult = React.createClass({
  render: function() {
    var alive = this.props.alive;
    var string = 'is untested';
    if (alive !== null) {
      if (alive) {
        var date = new Date(this.props.uptime * 1000 + Date.now());
        string = 'has been up for ' + humaneDate(date);
      } else {
        string = 'is down';
      }
    }
    return <span>Server {string}</span>;
  }
});

// Render Browser
React.renderComponent(<IndexBrowser />, document.getElementById('index-browser'));

// End module
})(this);
