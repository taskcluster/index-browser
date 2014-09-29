/** @jsx React.DOM */
(function(exports) {
'use strict';

// Widget to show monitors
var IndexBrowser = React.createClass({
  render: function() {
    return (
        <div>
        <div className='page-header'><h1>Taskcluster Index</h1></div>
        <p>This is a tool to browse the index of tasks.  Use it only for good.</p>
        <NamespaceSelector />
        <ComponentThatGoesPing />
        </div>
    );
  }
});

var NamespaceSelector = React.createClass({
  getInitialState: function() {
    return {
      result: null,
      error: null,
    }
  },
  clear: function() {
    this.replaceState(this.getInitialState());
  },
  error: function(error) {
    this.replaceState({error: error, result: null});
  },
  select: function(namespace) {
    var index = new window.taskcluster.index();
    index.findTask(namespace)
      .then(function(result) {
        this.replaceState({error: null, result: result});
      }.bind(this))
      .then(null, function(error) {
        this.replaceState({result:null, error: error});
      }.bind(this));
  },
  render: function() {
    var statusLine = ''; 
    if (this.state.error) {
      statusLine = <div className='alert alert-danger'>
        <span className='glyphicon glyphicon-exclamation-sign'> </span>
        <strong>ERROR</strong> {this.state.error.message || this.state.error}</div>;
    } else if (this.state.result) {
      statusLine = <div className='alert alert-info'>Found {JSON.stringify(this.state.result)}</div>
    }
    return <div>
      <h2>Search for Namespace</h2>
      <NamespaceSearchEntry search={this.select} clear={this.clear} error={this.error} />  
      {statusLine}
      </div>
  }
});

var NamespaceSearchEntry = React.createClass({
  getInitialState: function(){
    return {text: ''}
  },
  clear: function(e) {
    e.preventDefault();
    this.replaceState(self.getInitialState());
    this.props.clear();
  },
  search: function(e) {
    e.preventDefault();
    if (this.state.text === '') {
      this.props.error('To do a search you must enter search terms');
    } else {
      this.props.search(this.state.text);
    }
  },
  handleChange: function(e) {
    this.setState({text: e.target.value});
  },
  render: function() {
    return <div>
      <label className='sr-only' htmlFor='namespace-entry'>Enter namespace</label>
      <form action='#'>
      <div className='input-group'>
      <input 
          onChange={this.handleChange}
          id='namespace-search-entry'
          className='form-control'
          type='text'
          ref='namespaceSearchEntry'
          value={this.state.text}
          placeholder='Enter namespace' />
      <span className='input-group-btn'>
        <button className='btn btn-primary' onClick={this.search}>
          <span className='glyphicon glyphicon-search'></span> Search
        </button>
        <button className='btn btn-default' onClick={this.clear}>Clear</button>
      </span>
      </div>
      </form>
    </div>;

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
    index.listNamespaces(this.props.namespace, payload).then(function(result) {
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
      <h2>Subordinate namespaces for {this.props.namespace}</h2>
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
      return <div>
             <table className="table table-bordered table-hover">
               <thead><tr><td>Task ID</td><td>Rank</td><td>Data</td><td>Expires</td></tr></thead>
             </table>
             </div>
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
    return <div>
      <h2>Ping!<small>check if the indexing server is up</small></h2>
      <PingButton handler={this.pingServer} />
      <PingResult alive={this.state.alive} uptime={this.state.uptime} />
    </div>;
  }
});

var PingButton = React.createClass({
  render: function() {
    return <button onClick={this.props.handler} className='btn btn-primary'>
          <span className='glyphicon glyphicon-signal'></span> Ping Server
          </button>;
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
    return <div className='alert alert-info'>Server {string}</div>;
  }
});

// Render Browser
React.renderComponent(<IndexBrowser />, document.getElementById('index-browser'));

// End module
})(this);
