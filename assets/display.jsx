/** @jsx React.DOM */
(function(exports) {

var apiRoot = 'https://index.taskcluster.net/v1/';

// Widget to show monitors
var IndexBrowser = React.createClass({
  render: function() {
    return (
        <div>
        <h1>Select a Namespace</h1>
        <NamespaceList />
        <div id='namespace-detail'></div>
        </div>
    );
  }
});

var NamespaceList  = React.createClass({
  getInitialState: function () {
    return {
      continuationToken: null,
      namespaces: []
    }
  },
  componentDidMount: function() {
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
      <ul>
      {
        this.state.namespaces.map(function(ns){
          return <NameSpaceDisplay name={ns.name}
                                   expires={ns.expires}
                                   key={ns.namespace} /> 
        }, this)
      }
      </ul>
    );
  }
});

var NameSpaceDisplay = React.createClass({
  render: function() {
    return (
      <li>
        Name: <span className='index-name'>{this.props.name}</span><br />
        Expires: <span className='index-expires'>{this.props.expires}</span>
      </li>
    );
  }
});

// Render Browser
React.renderComponent(<IndexBrowser />, document.getElementById('index-browser'));

// End module
})(this);
