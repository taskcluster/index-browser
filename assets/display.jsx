/** @jsx React.DOM */
(function(exports) {

// Widget to show monitors
var IndexBrowser = React.createClass({
  render: function() {
    return (
        <div>
        <h1>Select a Namespace</h1>
        <NamespaceTable />
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
    return <tr><td>{this.props.name}</td><td>{this.props.expires}</td></tr>;
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
            className='btn btn-default'>Restart</button>);
  }
});

var ListButtons = React.createClass ({
  render: function() {
    return (<div><LoadMoreButton hasMore={this.props.hasMore}
            handler={this.props.loadMoreHandler} />
            <ResetButton handler={this.props.resetHandler} /></div>);
  }
});

// Render Browser
React.renderComponent(<IndexBrowser />, document.getElementById('index-browser'));

// End module
})(this);
