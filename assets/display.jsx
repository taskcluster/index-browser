/** @jsx React.DOM */
(function(exports) {

// Widget to show monitors
var IndexBrowser = React.createClass({
  render: function() {
    return (
        <div>
        <h1>Taskcluster Index</h1>
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
      namespaces: [],
      selectedNamespace: null
    }
  },
  componentDidMount: function() {
    this.loadNamespaces();
  },
  clearNamespaces: function() {
    this.setState({
      selectedNamespace: null,
      continuationToken: null,
      namespaces: []
    });
    this.loadNamespaces();
  },
  selectNamespace: function(evnt) {
    var namespace = evnt.currentTarget.getAttribute('data-namespace');
    this.setState({
      selectedNamespace: namespace
    });
  },
  loadNamespaces: function() {
    var query = {};
    var index = new window.taskcluster.index();
    var payload = {};
    if (this.state.continuationToken) {
      payload = {continuationToken: this.state.continuationToken};
    }
    index.listNamespaces('', payload).then(function(result) {
      this.setState({
        continuationToken: result.continuationToken,
        namespaces: result.namespaces,
        selectedNamespace: null
      });
    }.bind(this));
  },
  render: function() {
    return (
      <div>
      <table className="table table-bordered table-hover">
      <thead><tr><th>Name</th><th>Expires</th></tr></thead>
      <tbody>
      {
        this.state.namespaces.map(function(ns){
          return <NamespaceRow 
                   namespace={ns.namespace}
                   name={ns.name}
                   expires={ns.expires}
                   key={ns.namespace}
                   handler={this.selectNamespace}
                 /> 
        }, this)
      }
      </tbody>
      </table>
      <NamespaceDetail
        namespace={this.state.selectedNamespace} 
      />
      <ListButtons 
        loadMoreHandler={this.loadNamespaces}
        resetHandler={this.clearNamespaces}
        hasMore={!!this.state.continuationToken} 
      />
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
    
    console.log(this.props.namespace);
    return <tr
             data-namespace={this.props.namespace}
             onClick={this.props.handler}
           ><td>{this.props.name}</td><td>{date}</td></tr>;
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

var NamespaceDetail = React.createClass({
  render: function() {
    if (this.props.namespace) {
      return <div><p>Namespace details for {this.props.namespace}</p></div>
    } else {
      return <div></div>
    }
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
    var index = new window.taskcluster.index();
    index.ping().then(function(result) {
      console.log(result);
      this.setState(result);
    }.bind(this))
  },
  render: function() {
    return <div><PingButton handler={this.pingServer} /><br />
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
